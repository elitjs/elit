import type { NativeColorValue, NativePropValue } from '../types';

export const CSS_NAMED_COLORS: Record<string, NativeColorValue> = {
    transparent: { red: 0, green: 0, blue: 0, alpha: 0 },
    black: { red: 0, green: 0, blue: 0, alpha: 1 },
    silver: { red: 192, green: 192, blue: 192, alpha: 1 },
    gray: { red: 128, green: 128, blue: 128, alpha: 1 },
    grey: { red: 128, green: 128, blue: 128, alpha: 1 },
    white: { red: 255, green: 255, blue: 255, alpha: 1 },
    maroon: { red: 128, green: 0, blue: 0, alpha: 1 },
    red: { red: 255, green: 0, blue: 0, alpha: 1 },
    purple: { red: 128, green: 0, blue: 128, alpha: 1 },
    fuchsia: { red: 255, green: 0, blue: 255, alpha: 1 },
    green: { red: 0, green: 128, blue: 0, alpha: 1 },
    lime: { red: 0, green: 255, blue: 0, alpha: 1 },
    olive: { red: 128, green: 128, blue: 0, alpha: 1 },
    yellow: { red: 255, green: 255, blue: 0, alpha: 1 },
    navy: { red: 0, green: 0, blue: 128, alpha: 1 },
    blue: { red: 0, green: 0, blue: 255, alpha: 1 },
    teal: { red: 0, green: 128, blue: 128, alpha: 1 },
    aqua: { red: 0, green: 255, blue: 255, alpha: 1 },
    orange: { red: 255, green: 165, blue: 0, alpha: 1 },
    pink: { red: 255, green: 192, blue: 203, alpha: 1 },
    brown: { red: 165, green: 42, blue: 42, alpha: 1 },
    cyan: { red: 0, green: 255, blue: 255, alpha: 1 },
    magenta: { red: 255, green: 0, blue: 255, alpha: 1 },
    rebeccapurple: { red: 102, green: 51, blue: 153, alpha: 1 },
};

Object.assign(CSS_NAMED_COLORS, createNativeNamedColorMap({
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkgrey: '#a9a9a9',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    grey: '#808080',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    transparent: '#00000000',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32',
}));

export function nativeColorFromHexLiteral(hex: string): NativeColorValue {
    const normalized = hex.trim().replace(/^#/, '');
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    const alpha = normalized.length >= 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1;
    return { red, green, blue, alpha };
}

export function createNativeNamedColorMap(colors: Record<string, string>): Record<string, NativeColorValue> {
    return Object.fromEntries(
        Object.entries(colors).map(([name, hex]) => [name, nativeColorFromHexLiteral(hex)]),
    );
}

export const CURRENT_COLOR_KEYWORD = 'currentcolor';

export function cloneNativeColor(color: NativeColorValue | undefined): NativeColorValue | undefined {
    return color ? { ...color } : undefined;
}

export function getDefaultCurrentColor(): NativeColorValue {
    return cloneNativeColor(CSS_NAMED_COLORS.black) ?? { red: 0, green: 0, blue: 0, alpha: 1 };
}

export function isCurrentColorKeyword(value: NativePropValue | undefined): value is string {
    return typeof value === 'string' && value.trim().toLowerCase() === CURRENT_COLOR_KEYWORD;
}

export function nativeColorToCssColorLiteral(color: NativeColorValue): string {
    return `rgba(${color.red}, ${color.green}, ${color.blue}, ${Number(color.alpha.toFixed(3))})`;
}

export function isFillValue(value: NativePropValue | undefined): boolean {
    return typeof value === 'string' && value.trim() === '100%';
}

export function extractColorToken(value: string): string | undefined {
    const trimmed = value.trim();
    const directMatch = trimmed.match(/^((?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^()]+\)|#[0-9a-fA-F]{3,8}|currentcolor)$/i);
    if (directMatch) {
        return directMatch[1];
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === CURRENT_COLOR_KEYWORD) {
        return normalized;
    }

    if (CSS_NAMED_COLORS[normalized]) {
        return normalized;
    }

    const embeddedMatch = trimmed.match(/((?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^()]+\)|#[0-9a-fA-F]{3,8}|currentcolor)/i);
    if (embeddedMatch) {
        return embeddedMatch[1];
    }

    const firstParenIdx = trimmed.indexOf('(');
    if (firstParenIdx > 0) {
        let nameStart = firstParenIdx;
        while (nameStart > 0 && trimmed[nameStart - 1] !== ' ' && trimmed[nameStart - 1] !== '\t') {
            nameStart--;
        }
        const functionName = trimmed.slice(nameStart, firstParenIdx).toLowerCase();
        if (
            functionName !== 'rgb'
            && functionName !== 'rgba'
            && functionName !== 'hsl'
            && functionName !== 'hsla'
            && functionName !== 'hwb'
            && functionName !== 'lab'
            && functionName !== 'lch'
            && functionName !== 'oklab'
            && functionName !== 'oklch'
        ) {
            return undefined;
        }
    }

    return trimmed
        .toLowerCase()
        .split(/[^a-z-]+/)
        .find((token) => token.length > 0 && (token === CURRENT_COLOR_KEYWORD || Boolean(CSS_NAMED_COLORS[token])));
}

export function liftColorAlpha(color: NativeColorValue, delta: number): NativeColorValue {
    return {
        ...color,
        alpha: Math.min(0.96, Math.max(color.alpha, 0) + Math.max(0, delta)),
    };
}