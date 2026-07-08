export const throttle = <T extends any[]>(fn: (...args: T) => void, delay: number) => {
    let timer: NodeJS.Timeout | null = null;

    return (...args: T) => {
        if (!timer) {
            timer = setTimeout(() => {
                timer = null;
                fn(...args);
            }, delay);
        }
    };
};

export const debounce = <T extends any[]>(fn: (...args: T) => void, delay: number) => {
    let timer: NodeJS.Timeout | null = null;

    return (...args: T) => {
        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => fn(...args), delay);
    };
};