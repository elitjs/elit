import type {
    ParsedAttributeSelector,
    ParsedSelectorCombinator,
    ParsedSimpleSelector,
} from './types';

export function splitSelectorList(value: string): string[] {
    const selectors: string[] = [];
    let token = '';
    let attributeDepth = 0;
    let parenthesisDepth = 0;
    let quoted: '"' | '\'' | undefined;

    for (let index = 0; index < value.length; index++) {
        const char = value[index];

        if (quoted) {
            token += char;
            if (char === quoted && value[index - 1] !== '\\') {
                quoted = undefined;
            }
            continue;
        }

        if (char === '"' || char === '\'') {
            quoted = char;
            token += char;
            continue;
        }

        if (char === '[') {
            attributeDepth += 1;
            token += char;
            continue;
        }

        if (char === ']' && attributeDepth > 0) {
            attributeDepth -= 1;
            token += char;
            continue;
        }

        if (attributeDepth === 0 && char === '(') {
            parenthesisDepth += 1;
            token += char;
            continue;
        }

        if (attributeDepth === 0 && char === ')' && parenthesisDepth > 0) {
            parenthesisDepth -= 1;
            token += char;
            continue;
        }

        if (attributeDepth === 0 && parenthesisDepth === 0 && char === ',') {
            const trimmed = token.trim();
            if (trimmed) {
                selectors.push(trimmed);
            }
            token = '';
            continue;
        }

        token += char;
    }

    const trailing = token.trim();
    if (trailing) {
        selectors.push(trailing);
    }

    return selectors;
}

function parsePseudoSelectorToken(token: string, startIndex: number): { value: string; nextIndex: number } | undefined {
    if (token[startIndex] !== ':' || token[startIndex + 1] === ':') {
        return undefined;
    }

    let cursor = startIndex + 1;
    const nameMatch = token.slice(cursor).match(/^([_a-zA-Z][-_a-zA-Z0-9]*)/);
    if (!nameMatch) {
        return undefined;
    }

    const pseudoName = nameMatch[1].toLowerCase();
    cursor += nameMatch[0].length;

    if (token[cursor] !== '(') {
        return { value: pseudoName, nextIndex: cursor };
    }

    const argumentStart = cursor + 1;
    let attributeDepth = 0;
    let parenthesisDepth = 1;
    let quoted: '"' | '\'' | undefined;
    cursor += 1;

    while (cursor < token.length) {
        const char = token[cursor];

        if (quoted) {
            if (char === quoted && token[cursor - 1] !== '\\') {
                quoted = undefined;
            }
            cursor += 1;
            continue;
        }

        if (char === '"' || char === '\'') {
            quoted = char;
            cursor += 1;
            continue;
        }

        if (char === '[') {
            attributeDepth += 1;
            cursor += 1;
            continue;
        }

        if (char === ']' && attributeDepth > 0) {
            attributeDepth -= 1;
            cursor += 1;
            continue;
        }

        if (attributeDepth === 0 && char === '(') {
            parenthesisDepth += 1;
            cursor += 1;
            continue;
        }

        if (attributeDepth === 0 && char === ')') {
            parenthesisDepth -= 1;
            if (parenthesisDepth === 0) {
                const pseudoArgument = token.slice(argumentStart, cursor).trim();
                return {
                    value: pseudoArgument.length > 0
                        ? `${pseudoName}(${pseudoArgument})`
                        : `${pseudoName}()`,
                    nextIndex: cursor + 1,
                };
            }

            cursor += 1;
            continue;
        }

        cursor += 1;
    }

    return undefined;
}

export function parseSimpleSelectorToken(token: string): ParsedSimpleSelector | undefined {
    const trimmed = token.trim();
    if (!trimmed || /[*&]/.test(trimmed)) {
        return undefined;
    }

    let cursor = 0;
    let tagName: string | undefined;
    let idName: string | undefined;
    const classNames: string[] = [];
    const attributes: ParsedAttributeSelector[] = [];
    const pseudoClasses: string[] = [];

    const tagMatch = trimmed.slice(cursor).match(/^([_a-zA-Z][-_a-zA-Z0-9]*)/);
    if (tagMatch) {
        tagName = tagMatch[1].toLowerCase();
        cursor += tagMatch[0].length;
    }

    while (cursor < trimmed.length) {
        const char = trimmed[cursor];
        if (char === '.') {
            const classMatch = trimmed.slice(cursor).match(/^\.([_a-zA-Z][-_a-zA-Z0-9]*)/);
            if (!classMatch) {
                return undefined;
            }
            classNames.push(classMatch[1]);
            cursor += classMatch[0].length;
            continue;
        }

        if (char === '#') {
            const idMatch = trimmed.slice(cursor).match(/^#([_a-zA-Z][-_a-zA-Z0-9]*)/);
            if (!idMatch || idName) {
                return undefined;
            }
            idName = idMatch[1];
            cursor += idMatch[0].length;
            continue;
        }

        if (char === '[') {
            const endIndex = trimmed.indexOf(']', cursor + 1);
            if (endIndex === -1) {
                return undefined;
            }

            const rawAttribute = trimmed.slice(cursor + 1, endIndex).trim();
            const attrMatch = rawAttribute.match(/^([_a-zA-Z][-_a-zA-Z0-9]*)(?:\s*(=|~=|\^=|\$=|\*=)\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?$/);
            if (!attrMatch) {
                return undefined;
            }

            attributes.push({
                name: attrMatch[1].toLowerCase(),
                operator: attrMatch[2] as ParsedAttributeSelector['operator'] | undefined,
                value: attrMatch[3] ?? attrMatch[4] ?? attrMatch[5],
            });
            cursor = endIndex + 1;
            continue;
        }

        if (char === ':') {
            const pseudoToken = parsePseudoSelectorToken(trimmed, cursor);
            if (!pseudoToken) {
                return undefined;
            }

            pseudoClasses.push(pseudoToken.value);
            cursor = pseudoToken.nextIndex;
            continue;
        }

        return undefined;
    }

    if (!tagName && !idName && classNames.length === 0 && attributes.length === 0 && pseudoClasses.length === 0) {
        return undefined;
    }

    return { tagName, idName, classNames, attributes, pseudoClasses };
}

export function extractSupportedSelectorChains(
    selector: string,
    parsedSelectorChainCache: Map<string, ParsedSimpleSelector[][]>,
): ParsedSimpleSelector[][] {
    const cached = parsedSelectorChainCache.get(selector);
    if (cached) {
        return cached;
    }

    const parsedChains = splitSelectorList(selector)
        .map((segment) => segment.trim())
        .map((segment) => {
            const chain: ParsedSimpleSelector[] = [];
            let token = '';
            let combinator: ParsedSelectorCombinator = 'descendant';
            let invalid = false;
            let attributeDepth = 0;
            let parenthesisDepth = 0;
            let quoted: '"' | '\'' | undefined;

            const flushToken = (): void => {
                const trimmedToken = token.trim();
                token = '';
                if (!trimmedToken || invalid) {
                    return;
                }

                const parsed = parseSimpleSelectorToken(trimmedToken);
                if (!parsed) {
                    invalid = true;
                    return;
                }

                if (chain.length > 0) {
                    parsed.combinator = combinator;
                }
                chain.push(parsed);
                combinator = 'descendant';
            };

            for (let index = 0; index < segment.length; index++) {
                const char = segment[index];
                if (quoted) {
                    token += char;
                    if (char === quoted && segment[index - 1] !== '\\') {
                        quoted = undefined;
                    }
                    continue;
                }

                if (char === '"' || char === '\'') {
                    quoted = char;
                    token += char;
                    continue;
                }

                if (char === '[') {
                    attributeDepth += 1;
                    token += char;
                    continue;
                }

                if (char === ']') {
                    if (attributeDepth > 0) {
                        attributeDepth -= 1;
                    }
                    token += char;
                    continue;
                }

                if (attributeDepth === 0 && char === '(') {
                    parenthesisDepth += 1;
                    token += char;
                    continue;
                }

                if (attributeDepth === 0 && char === ')' && parenthesisDepth > 0) {
                    parenthesisDepth -= 1;
                    token += char;
                    continue;
                }

                if (attributeDepth === 0 && parenthesisDepth === 0 && (char === '>' || char === '+' || char === '~')) {
                    flushToken();
                    if (invalid) {
                        break;
                    }

                    combinator = char === '>'
                        ? 'child'
                        : char === '+'
                            ? 'adjacent-sibling'
                            : 'general-sibling';
                    continue;
                }

                if (attributeDepth === 0 && parenthesisDepth === 0 && /\s/.test(char)) {
                    flushToken();
                    if (invalid) {
                        break;
                    }
                    continue;
                }

                token += char;
            }

            flushToken();

            if (invalid || chain.length === 0) {
                return undefined;
            }

            return chain.some((part) => Boolean(part.tagName) || Boolean(part.idName) || part.classNames.length > 0 || part.attributes.length > 0 || part.pseudoClasses.length > 0)
                ? chain
                : undefined;
        })
        .filter((segment): segment is ParsedSimpleSelector[] => Array.isArray(segment) && segment.length > 0);

    parsedSelectorChainCache.set(selector, parsedChains);
    return parsedChains;
}