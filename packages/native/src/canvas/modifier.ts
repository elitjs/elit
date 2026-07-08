export function prependComposeModifierCall(modifier: string, call: string): string {
    return modifier === 'Modifier'
        ? `Modifier.${call}`
        : modifier.replace(/^Modifier/, `Modifier.${call}`);
}

export function appendComposeModifierCall(modifier: string, call: string): string {
    return modifier === 'Modifier'
        ? `Modifier.${call}`
        : `${modifier}.${call}`;
}