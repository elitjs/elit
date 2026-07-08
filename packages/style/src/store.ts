import type { CreateStyleStore } from './types';

const ELIT_SHARED_STYLE_STORE_KEY = '__elitSharedStyleStore__';

export function createStyleStore(): CreateStyleStore {
    return {
        variables: [],
        rules: [],
        mediaRules: [],
        keyframes: [],
        fontFaces: [],
        imports: [],
        containerRules: [],
        supportsRules: [],
        layerRules: [],
        layerOrder: [],
    };
}

export function getSharedStyleStore(): CreateStyleStore {
    const globalScope = globalThis as typeof globalThis & { [ELIT_SHARED_STYLE_STORE_KEY]?: CreateStyleStore };
    if (!globalScope[ELIT_SHARED_STYLE_STORE_KEY]) {
        globalScope[ELIT_SHARED_STYLE_STORE_KEY] = createStyleStore();
    }

    return globalScope[ELIT_SHARED_STYLE_STORE_KEY]!;
}