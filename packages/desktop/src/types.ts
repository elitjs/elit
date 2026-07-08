export type DesktopRuntimeName = 'quickjs' | 'bun' | 'node' | 'deno';

export interface WindowOptions {
    url?: string;
    html?: string;
    title?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    center?: boolean;
    maximized?: boolean;
    resizable?: boolean;
    decorations?: boolean;
    transparent?: boolean;
    always_on_top?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    closable?: boolean;
    skip_taskbar?: boolean;
    icon?: string;
    devtools?: boolean;
    proxy_port?: number;
    proxy_pipe?: string;
    proxy_secret?: string;
}

export interface ServeWindowOptions extends Omit<WindowOptions, 'url'> {
    port?: number;
    exposePort?: boolean;
}

export interface ServeWindowResultExposed {
    port: number;
    host: string;
    url: string;
}

export interface ServeWindowResultPipe {
    pipe: string;
}

export type ServeWindowResult = ServeWindowResultExposed | ServeWindowResultPipe;