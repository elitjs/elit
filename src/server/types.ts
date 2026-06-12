import type { Server } from 'http';
import type { WebSocketServer } from 'ws';

import type { Child } from '../core/types';
import type { ElitSMTPServerConfig, ElitSMTPServerHandle } from './smtp-server';

export type Router = import('./server').ServerRouter;
export type StateManager = import('./server').StateManager;
export type WebSocketConnection = import('./ws').WebSocket;
export type WebSocketRequest = import('./http').IncomingMessage;

export interface WebSocketEndpointContext {
    ws: WebSocketConnection;
    req: WebSocketRequest;
    path: string;
    query: Record<string, string>;
    headers: Record<string, string | string[] | undefined>;
}

export type WebSocketEndpointHandler = (ctx: WebSocketEndpointContext) => void | Promise<void>;

export interface WebSocketEndpointConfig {
    path: string;
    handler: WebSocketEndpointHandler;
}

export interface ClientConfig {
    root: string;
    fallbackRoot?: string;
    basePath: string;
    index?: string;
    ssr?: () => Child | string;
    watch?: string[];
    ignore?: string[];
    proxy?: ProxyConfig[];
    worker?: WorkerConfig[];
    api?: Router;
    ws?: WebSocketEndpointConfig[];
    smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[];
    mode?: 'dev' | 'preview';
}

export interface ProxyConfig {
    context: string;
    target: string;
    changeOrigin?: boolean;
    pathRewrite?: Record<string, string>;
    headers?: Record<string, string>;
    ws?: boolean;
}

export interface WorkerConfig {
    path: string;
    name?: string;
    type?: 'module' | 'classic';
}

export interface DevServerOptions {
    port?: number;
    host?: string;
    domain?: string;
    root?: string;
    fallbackRoot?: string;
    basePath?: string;
    index?: string;
    clients?: ClientConfig[];
    https?: boolean;
    open?: boolean;
    watch?: string[];
    ignore?: string[];
    worker?: WorkerConfig[];
    logging?: boolean;
    /** Glob patterns for files that must never be served (e.g. ".env", ".env.*", "*.key"). Default blocks .env, .env.*, .git/**, and common secret files. */
    blockFiles?: string[];
    api?: Router;
    ws?: WebSocketEndpointConfig[];
    smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[];
    ssr?: () => Child | string;
    proxy?: ProxyConfig[];
    mode?: 'dev' | 'preview';
    env?: Record<string, string>;
    standalone?: boolean;
    outDir?: string;
    outFile?: string;
}

export interface DevServer {
    server: Server;
    wss: WebSocketServer;
    smtpServers: ElitSMTPServerHandle[];
    url: string;
    state: StateManager;
    close: () => Promise<void>;
}

export interface HMRMessage {
    type: 'update' | 'reload' | 'error' | 'connected';
    path?: string;
    timestamp?: number;
    error?: string;
}

export interface PreviewOptions {
    port?: number;
    host?: string;
    domain?: string;
    root?: string;
    basePath?: string;
    index?: string;
    clients?: ClientConfig[];
    https?: boolean;
    open?: boolean;
    logging?: boolean;
    /** Glob patterns for files that must never be served (e.g. ".env", ".env.*", "*.key"). Default blocks .env, .env.*, .git/**, and common secret files. */
    blockFiles?: string[];
    api?: Router;
    ws?: WebSocketEndpointConfig[];
    smtp?: ElitSMTPServerConfig | ElitSMTPServerConfig[];
    ssr?: () => Child | string;
    proxy?: ProxyConfig[];
    worker?: WorkerConfig[];
    env?: Record<string, string>;
    standalone?: boolean;
    outFile?: string;
}
