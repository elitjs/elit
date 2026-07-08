import type { MockFunction } from './types';

function createMockFunction<T extends (...args: any[]) => any>(): MockFunction<T> {
    const mock = function (...args: Parameters<T>): ReturnType<T> {
        mock._calls.push(args);
        try {
            const result = mock._implementation ? (mock._implementation as any)(...args) : undefined as any;
            mock._results.push({ type: 'return', value: result });
            return result;
        } catch (error) {
            mock._results.push({ type: 'throw', value: error });
            throw error;
        }
    } as MockFunction<T>;

    mock._isMock = true;
    mock._calls = [];
    mock._results = [];
    mock._implementation = null as any;

    mock.mockImplementation = function (fn: T) {
        mock._implementation = fn;
        return mock;
    };

    mock.mockReturnValue = function (value: ReturnType<T>) {
        mock._implementation = (() => value) as any;
        return mock;
    };

    mock.mockResolvedValue = function (value: ReturnType<T>) {
        mock._implementation = (() => Promise.resolve(value)) as any;
        return mock;
    };

    mock.mockRejectedValue = function (value: any) {
        mock._implementation = (() => Promise.reject(value)) as any;
        return mock;
    };

    mock.restore = function () {
        mock._calls = [];
        mock._results = [];
        mock._implementation = null as any;
    };

    mock.clear = function () {
        mock._calls = [];
        mock._results = [];
    };

    return mock;
}

export const vi = {
    fn: <T extends (...args: any[]) => any>() => createMockFunction<T>(),
    spyOn: (obj: any, method: string) => {
        const original = obj[method];
        const mock = createMockFunction<typeof original>();
        mock.mockImplementation(original);
        obj[method] = mock;
        mock.restore = () => {
            obj[method] = original;
        };
        return mock;
    },
    clearAllMocks: () => {
    },
    restoreAllMocks: () => {
    },
};