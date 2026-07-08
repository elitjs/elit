import type { ServeWindowOptions, ServeWindowResult, WindowOptions } from './types';

type DesktopRequestHandler = (req: any, res: any) => void;

type DesktopGlobals = typeof globalThis & {
    createWindow?: (opts: WindowOptions) => void;
    createWindowServer?: (app: DesktopRequestHandler, opts?: ServeWindowOptions) => Promise<ServeWindowResult>;
    windowEval?: (code: string) => void;
    onMessage?: (handler: (msg: string) => void) => void;
    windowMinimize?: () => void;
    windowMaximize?: () => void;
    windowUnmaximize?: () => void;
    windowSetTitle?: (title: string) => void;
    windowDrag?: () => void;
    windowSetPosition?: (x: number, y: number) => void;
    windowSetSize?: (w: number, h: number) => void;
    windowSetAlwaysOnTop?: (value: boolean) => void;
    windowQuit?: () => void;
};

const desktopGlobals = globalThis as DesktopGlobals;

export const createWindow = desktopGlobals.createWindow as (opts: WindowOptions) => void;
export const createWindowServer = desktopGlobals.createWindowServer as (
    app: DesktopRequestHandler,
    opts?: ServeWindowOptions,
) => Promise<ServeWindowResult>;
export const windowEval = desktopGlobals.windowEval as (code: string) => void;
export const onMessage = desktopGlobals.onMessage as (handler: (msg: string) => void) => void;
export const windowMinimize = desktopGlobals.windowMinimize as () => void;
export const windowMaximize = desktopGlobals.windowMaximize as () => void;
export const windowUnmaximize = desktopGlobals.windowUnmaximize as () => void;
export const windowSetTitle = desktopGlobals.windowSetTitle as (title: string) => void;
export const windowDrag = desktopGlobals.windowDrag as () => void;
export const windowSetPosition = desktopGlobals.windowSetPosition as (x: number, y: number) => void;
export const windowSetSize = desktopGlobals.windowSetSize as (w: number, h: number) => void;
export const windowSetAlwaysOnTop = desktopGlobals.windowSetAlwaysOnTop as (value: boolean) => void;
export const windowQuit = desktopGlobals.windowQuit as () => void;