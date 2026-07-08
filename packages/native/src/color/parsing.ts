import type { NativeColorValue, NativePropValue } from '../types';
import { formatFloat, splitCssFunctionArguments } from '../units';
import {
    cloneNativeColor,
    CSS_NAMED_COLORS,
    CURRENT_COLOR_KEYWORD,
    extractColorToken,
    getDefaultCurrentColor,
} from './base';

export function parseCssHue(value: string): number | undefined {
    const match = value.trim().toLowerCase().match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))(deg|grad|rad|turn)?$/);
    if (!match) {
        return undefined;
    }

    const numericValue = Number(match[1]);
    if (!Number.isFinite(numericValue)) {
        return undefined;
    }

    switch (match[2] ?? 'deg') {
        case 'turn':
            return numericValue * 360;
        case 'rad':
            return numericValue * (180 / Math.PI);
        case 'grad':
            return numericValue * 0.9;
        default:
            return numericValue;
    }
}

export function parseCssPercentageChannel(value: string): number | undefined {
    const match = value.trim().match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))%$/);
    if (!match) {
        return undefined;
    }

    const numericValue = Number(match[1]);
    return Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) / 100 : undefined;
}

export function parseCssAlphaValue(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
        const percentage = Number(trimmed.slice(0, -1));
        return Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) / 100 : undefined;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? Math.max(0, Math.min(1, numericValue)) : undefined;
}

export function parseCssNumericChannel(value: string): number | undefined {
    const numericValue = Number(value.trim());
    return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function parseCssNonNegativeNumericChannel(value: string): number | undefined {
    const numericValue = parseCssNumericChannel(value);
    return numericValue !== undefined ? Math.max(0, numericValue) : undefined;
}

export function parseCssLabLightness(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
        const percentage = Number(trimmed.slice(0, -1));
        return Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : undefined;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : undefined;
}

export function parseCssOklabLightness(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
        const percentage = Number(trimmed.slice(0, -1));
        return Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) / 100 : undefined;
    }

    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) {
        return undefined;
    }

    const normalized = Math.abs(numericValue) > 1 ? numericValue / 100 : numericValue;
    return Math.max(0, Math.min(1, normalized));
}

export function parseCssColorFunctionArguments(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }

    if (trimmed.includes(',')) {
        return splitCssFunctionArguments(trimmed).map((part) => part.trim()).filter(Boolean);
    }

    const alphaSplit = trimmed.split('/').map((part) => part.trim()).filter(Boolean);
    if (alphaSplit.length === 0 || alphaSplit.length > 2) {
        return [];
    }

    const channels = alphaSplit[0].split(/\s+/).filter(Boolean);
    return alphaSplit[1] ? [...channels, alphaSplit[1]] : channels;
}

export function parseCssRgbChannel(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
        const percentage = Number(trimmed.slice(0, -1));
        return Number.isFinite(percentage)
            ? Math.round((Math.max(0, Math.min(100, percentage)) / 100) * 255)
            : undefined;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue)
        ? Math.round(Math.max(0, Math.min(255, numericValue)))
        : undefined;
}

export function hslToRgb(hue: number, saturation: number, lightness: number): { red: number; green: number; blue: number } {
    const normalizedHue = ((hue % 360) + 360) % 360;
    const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
    const segment = normalizedHue / 60;
    const x = chroma * (1 - Math.abs((segment % 2) - 1));

    const [redPrime, greenPrime, bluePrime] = segment < 1
        ? [chroma, x, 0]
        : segment < 2
            ? [x, chroma, 0]
            : segment < 3
                ? [0, chroma, x]
                : segment < 4
                    ? [0, x, chroma]
                    : segment < 5
                        ? [x, 0, chroma]
                        : [chroma, 0, x];

    const adjustment = lightness - (chroma / 2);
    return {
        red: Math.round((redPrime + adjustment) * 255),
        green: Math.round((greenPrime + adjustment) * 255),
        blue: Math.round((bluePrime + adjustment) * 255),
    };
}

export function hwbToRgb(hue: number, whiteness: number, blackness: number): { red: number; green: number; blue: number } {
    const sum = whiteness + blackness;
    const normalizedWhiteness = sum > 1 ? whiteness / sum : whiteness;
    const normalizedBlackness = sum > 1 ? blackness / sum : blackness;
    const pureHue = hslToRgb(hue, 1, 0.5);
    const factor = Math.max(0, 1 - normalizedWhiteness - normalizedBlackness);

    return {
        red: Math.round(((pureHue.red / 255) * factor + normalizedWhiteness) * 255),
        green: Math.round(((pureHue.green / 255) * factor + normalizedWhiteness) * 255),
        blue: Math.round(((pureHue.blue / 255) * factor + normalizedWhiteness) * 255),
    };
}

export function linearSrgbChannelToByte(value: number): number {
    const clamped = Math.max(0, Math.min(1, value));
    const gammaCorrected = clamped <= 0.0031308
        ? 12.92 * clamped
        : (1.055 * Math.pow(clamped, 1 / 2.4)) - 0.055;
    return Math.round(Math.max(0, Math.min(1, gammaCorrected)) * 255);
}

export function linearSrgbToNativeColor(red: number, green: number, blue: number, alpha: number): NativeColorValue {
    return {
        red: linearSrgbChannelToByte(red),
        green: linearSrgbChannelToByte(green),
        blue: linearSrgbChannelToByte(blue),
        alpha,
    };
}

export function d50XyzToLinearSrgb(x: number, y: number, z: number): { red: number; green: number; blue: number } {
    const xD65 = (0.9555766 * x) - (0.0230393 * y) + (0.0631636 * z);
    const yD65 = (-0.0282895 * x) + (1.0099416 * y) + (0.0210077 * z);
    const zD65 = (0.0122982 * x) - (0.020483 * y) + (1.3299098 * z);

    return {
        red: (3.2404542 * xD65) - (1.5371385 * yD65) - (0.4985314 * zD65),
        green: (-0.969266 * xD65) + (1.8760108 * yD65) + (0.041556 * zD65),
        blue: (0.0556434 * xD65) - (0.2040259 * yD65) + (1.0572252 * zD65),
    };
}

export function labToXyzComponent(value: number): number {
    const epsilon = 216 / 24389;
    const kappa = 24389 / 27;
    const cube = value * value * value;
    return cube > epsilon ? cube : ((116 * value) - 16) / kappa;
}

export function labToNativeColor(lightness: number, a: number, b: number, alpha: number): NativeColorValue {
    const fy = (lightness + 16) / 116;
    const fx = fy + (a / 500);
    const fz = fy - (b / 200);
    const x = 0.96422 * labToXyzComponent(fx);
    const y = labToXyzComponent(fy);
    const z = 0.82521 * labToXyzComponent(fz);
    const linearColor = d50XyzToLinearSrgb(x, y, z);
    return linearSrgbToNativeColor(linearColor.red, linearColor.green, linearColor.blue, alpha);
}

export function lchToNativeColor(lightness: number, chroma: number, hue: number, alpha: number): NativeColorValue {
    const hueInRadians = (hue * Math.PI) / 180;
    return labToNativeColor(
        lightness,
        chroma * Math.cos(hueInRadians),
        chroma * Math.sin(hueInRadians),
        alpha,
    );
}

export function oklabToNativeColor(lightness: number, a: number, b: number, alpha: number): NativeColorValue {
    const l = Math.pow(lightness + (0.3963377774 * a) + (0.2158037573 * b), 3);
    const m = Math.pow(lightness - (0.1055613458 * a) - (0.0638541728 * b), 3);
    const s = Math.pow(lightness - (0.0894841775 * a) - (1.291485548 * b), 3);

    return linearSrgbToNativeColor(
        (4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s),
        (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s),
        (-0.0041960863 * l) - (0.7034186147 * m) + (1.707614701 * s),
        alpha,
    );
}

export function oklchToNativeColor(lightness: number, chroma: number, hue: number, alpha: number): NativeColorValue {
    const hueInRadians = (hue * Math.PI) / 180;
    return oklabToNativeColor(
        lightness,
        chroma * Math.cos(hueInRadians),
        chroma * Math.sin(hueInRadians),
        alpha,
    );
}

export function parseCssColor(
    value: NativePropValue | undefined,
    currentColor: NativeColorValue = getDefaultCurrentColor(),
): NativeColorValue | undefined {
    if (typeof value !== 'string') return undefined;

    const token = extractColorToken(value);
    if (!token) return undefined;

    if (token.toLowerCase() === CURRENT_COLOR_KEYWORD) {
        return cloneNativeColor(currentColor) ?? getDefaultCurrentColor();
    }

    const namedColor = CSS_NAMED_COLORS[token.toLowerCase()];
    if (namedColor) {
        return { ...namedColor };
    }

    const hexMatch = token.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    if (hexMatch) {
        const hex = hexMatch[1];
        if (hex.length === 3 || hex.length === 4) {
            const [r, g, b, a = 'f'] = hex.split('');
            return {
                red: parseInt(`${r}${r}`, 16),
                green: parseInt(`${g}${g}`, 16),
                blue: parseInt(`${b}${b}`, 16),
                alpha: parseInt(`${a}${a}`, 16) / 255,
            };
        }

        const red = parseInt(hex.slice(0, 2), 16);
        const green = parseInt(hex.slice(2, 4), 16);
        const blue = parseInt(hex.slice(4, 6), 16);
        const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return { red, green, blue, alpha };
    }

    const hslMatch = token.match(/^hsla?\(([^()]+)\)$/i);
    if (hslMatch) {
        const parts = parseCssColorFunctionArguments(hslMatch[1]);
        if (parts.length < 3) {
            return undefined;
        }

        const hue = parseCssHue(parts[0]);
        const saturation = parseCssPercentageChannel(parts[1]);
        const lightness = parseCssPercentageChannel(parts[2]);
        const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;
        if (hue === undefined || saturation === undefined || lightness === undefined || alpha === undefined) {
            return undefined;
        }

        return {
            ...hslToRgb(hue, saturation, lightness),
            alpha,
        };
    }

    const hwbMatch = token.match(/^hwb\(([^()]+)\)$/i);
    if (hwbMatch) {
        const parts = parseCssColorFunctionArguments(hwbMatch[1]);
        if (parts.length < 3) {
            return undefined;
        }

        const hue = parseCssHue(parts[0]);
        const whiteness = parseCssPercentageChannel(parts[1]);
        const blackness = parseCssPercentageChannel(parts[2]);
        const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;
        if (hue === undefined || whiteness === undefined || blackness === undefined || alpha === undefined) {
            return undefined;
        }

        return {
            ...hwbToRgb(hue, whiteness, blackness),
            alpha,
        };
    }

    const labMatch = token.match(/^lab\(([^()]+)\)$/i);
    if (labMatch) {
        const parts = parseCssColorFunctionArguments(labMatch[1]);
        if (parts.length < 3) {
            return undefined;
        }

        const lightness = parseCssLabLightness(parts[0]);
        const a = parseCssNumericChannel(parts[1]);
        const b = parseCssNumericChannel(parts[2]);
        const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;
        if (lightness === undefined || a === undefined || b === undefined || alpha === undefined) {
            return undefined;
        }

        return labToNativeColor(lightness, a, b, alpha);
    }

    const lchMatch = token.match(/^lch\(([^()]+)\)$/i);
    if (lchMatch) {
        const parts = parseCssColorFunctionArguments(lchMatch[1]);
        if (parts.length < 3) {
            return undefined;
        }

        const lightness = parseCssLabLightness(parts[0]);
        const chroma = parseCssNonNegativeNumericChannel(parts[1]);
        const hue = parseCssHue(parts[2]);
        const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;
        if (lightness === undefined || chroma === undefined || hue === undefined || alpha === undefined) {
            return undefined;
        }

        return lchToNativeColor(lightness, chroma, hue, alpha);
    }

    const oklabMatch = token.match(/^oklab\(([^()]+)\)$/i);
    if (oklabMatch) {
        const parts = parseCssColorFunctionArguments(oklabMatch[1]);
        if (parts.length < 3) {
            return undefined;
        }

        const lightness = parseCssOklabLightness(parts[0]);
        const a = parseCssNumericChannel(parts[1]);
        const b = parseCssNumericChannel(parts[2]);
        const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;
        if (lightness === undefined || a === undefined || b === undefined || alpha === undefined) {
            return undefined;
        }

        return oklabToNativeColor(lightness, a, b, alpha);
    }

    const oklchMatch = token.match(/^oklch\(([^()]+)\)$/i);
    if (oklchMatch) {
        const parts = parseCssColorFunctionArguments(oklchMatch[1]);
        if (parts.length < 3) {
            return undefined;
        }

        const lightness = parseCssOklabLightness(parts[0]);
        const chroma = parseCssNonNegativeNumericChannel(parts[1]);
        const hue = parseCssHue(parts[2]);
        const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;
        if (lightness === undefined || chroma === undefined || hue === undefined || alpha === undefined) {
            return undefined;
        }

        return oklchToNativeColor(lightness, chroma, hue, alpha);
    }

    const rgbMatch = token.match(/^rgba?\(([^()]+)\)$/i);
    if (!rgbMatch) return undefined;

    const parts = parseCssColorFunctionArguments(rgbMatch[1]);
    if (parts.length < 3) return undefined;

    const red = parseCssRgbChannel(parts[0]);
    const green = parseCssRgbChannel(parts[1]);
    const blue = parseCssRgbChannel(parts[2]);
    const alpha = parts[3] !== undefined ? parseCssAlphaValue(parts[3]) : 1;

    if (alpha === undefined || red === undefined || green === undefined || blue === undefined) {
        return undefined;
    }

    return { red, green, blue, alpha };
}

export function toComposeColorLiteral(color: NativeColorValue): string {
    return `Color(red = ${formatFloat(color.red / 255)}f, green = ${formatFloat(color.green / 255)}f, blue = ${formatFloat(color.blue / 255)}f, alpha = ${formatFloat(color.alpha)}f)`;
}

export function toSwiftColorLiteral(color: NativeColorValue): string {
    return `Color(red: ${formatFloat(color.red / 255)}, green: ${formatFloat(color.green / 255)}, blue: ${formatFloat(color.blue / 255)}, opacity: ${formatFloat(color.alpha)})`;
}