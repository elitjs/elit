export type ThemeName = 'dark' | 'light';

const STORAGE_KEY = 'elit-theme';

const resolveInitial = (): ThemeName => {
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
};

export const getTheme = (): ThemeName => {
    const v = document.documentElement.dataset.theme;
    return v === 'light' ? 'light' : 'dark';
};

export const setTheme = (t: ThemeName): void => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
};

export const toggleTheme = (): ThemeName => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
};

export const initTheme = (): void => {
    setTheme(resolveInitial());
};
