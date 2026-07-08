import type { ServeWindowOptions, ServeWindowResult, WindowOptions } from './types';

export type {
    DesktopRuntimeName,
    ServeWindowOptions,
    ServeWindowResult,
    ServeWindowResultExposed,
    ServeWindowResultPipe,
    WindowOptions,
} from './types';
export {
    createWindow,
    createWindowServer,
    onMessage,
    windowDrag,
    windowEval,
    windowMaximize,
    windowMinimize,
    windowQuit,
    windowSetAlwaysOnTop,
    windowSetPosition,
    windowSetSize,
    windowSetTitle,
    windowUnmaximize,
} from './api';

declare global {
    function createWindow(opts: WindowOptions): void;
    function windowEval(code: string): void;
    function onMessage(handler: (msg: string) => void): void;
    function windowMinimize(): void;
    function windowMaximize(): void;
    function windowUnmaximize(): void;
    function windowSetTitle(title: string): void;
    function windowDrag(): void;
    function windowSetPosition(x: number, y: number): void;
    function windowSetSize(w: number, h: number): void;
    function windowSetAlwaysOnTop(value: boolean): void;
    function windowQuit(): void;
    function createWindowServer(
        app: (req: any, res: any) => void,
        opts?: ServeWindowOptions,
    ): Promise<ServeWindowResult>;
}

export {};