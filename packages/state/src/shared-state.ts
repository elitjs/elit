import type { State } from '../../core/types';
import { createState } from './core';

const ELIT_INTERNAL_WS_PATH = '/__elit_ws';

type StateChangeCallback<T = any> = (value: T, oldValue: T) => void;

interface StateMessage {
    type: 'state:init' | 'state:update' | 'state:subscribe' | 'state:unsubscribe' | 'state:change';
    key: string;
    value?: any;
    timestamp?: number;
}

function resolveSharedStateWebSocketUrl(wsUrl?: string): string {
    const protocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss:' : 'ws:';
    const origin = typeof location !== 'undefined' ? `${protocol}//${location.host}` : `${protocol}//localhost`;

    if (!wsUrl) {
        return `${origin}${ELIT_INTERNAL_WS_PATH}`;
    }

    if (/^wss?:\/\//i.test(wsUrl)) {
        const parsedUrl = new URL(wsUrl);
        if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
            parsedUrl.pathname = ELIT_INTERNAL_WS_PATH;
        }
        return parsedUrl.toString();
    }

    if (wsUrl.startsWith('/')) {
        return `${origin}${wsUrl}`;
    }

    return wsUrl;
}

export class SharedState<T = any> {
    private localState: State<T>;
    private ws: WebSocket | null = null;
    private pendingUpdates: T[] = [];
    private previousValue: T;

    constructor(
        public readonly key: string,
        defaultValue: T,
        private wsUrl?: string,
    ) {
        this.localState = createState(defaultValue);
        this.previousValue = defaultValue;
        this.connect();
    }

    get value(): T {
        return this.localState.value;
    }

    set value(newValue: T) {
        this.previousValue = this.localState.value;
        this.localState.value = newValue;
        this.sendToServer(newValue);
    }

    get state(): State<T> {
        return this.localState;
    }

    onChange(callback: StateChangeCallback<T>): () => void {
        return this.localState.subscribe((newValue) => {
            const oldValue = this.previousValue;
            this.previousValue = newValue;
            callback(newValue, oldValue);
        });
    }

    update(updater: (current: T) => T): void {
        this.value = updater(this.value);
    }

    private connect(): void {
        if (typeof window === 'undefined') {
            return;
        }

        const url = resolveSharedStateWebSocketUrl(this.wsUrl);
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', () => {
            this.subscribe();

            while (this.pendingUpdates.length > 0) {
                const value = this.pendingUpdates.shift();
                this.sendToServer(value!);
            }
        });

        this.ws.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });

        this.ws.addEventListener('close', () => {
            setTimeout(() => this.connect(), 1000);
        });

        this.ws.addEventListener('error', (error) => {
            console.error('[SharedState] WebSocket error:', error);
        });
    }

    private subscribe(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'state:subscribe',
            key: this.key,
        }));
    }

    private handleMessage(data: string): void {
        try {
            const msg = JSON.parse(data) as StateMessage;

            if (msg.key !== this.key) {
                return;
            }

            if (msg.type === 'state:init' || msg.type === 'state:update') {
                this.localState.value = msg.value;
            }
        } catch (error) {
            // Ignore parse errors (could be HMR messages)
        }
    }

    private sendToServer(value: T): void {
        if (!this.ws) {
            return;
        }

        if (this.ws.readyState !== WebSocket.OPEN) {
            this.pendingUpdates.push(value);
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'state:change',
            key: this.key,
            value,
        }));
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    destroy(): void {
        this.disconnect();
        this.localState.destroy();
    }
}

export function createSharedState<T>(key: string, defaultValue: T, wsUrl?: string): SharedState<T> {
    return new SharedState(key, defaultValue, wsUrl);
}

class SharedStateManager {
    private states = new Map<string, SharedState<any>>();

    create<T>(key: string, defaultValue: T, wsUrl?: string): SharedState<T> {
        if (this.states.has(key)) {
            return this.states.get(key) as SharedState<T>;
        }

        const state = new SharedState<T>(key, defaultValue, wsUrl);
        this.states.set(key, state);
        return state;
    }

    get<T>(key: string): SharedState<T> | undefined {
        return this.states.get(key) as SharedState<T>;
    }

    delete(key: string): boolean {
        const state = this.states.get(key);
        if (state) {
            state.destroy();
            return this.states.delete(key);
        }

        return false;
    }

    clear(): void {
        this.states.forEach((state) => state.destroy());
        this.states.clear();
    }
}

export const sharedStateManager = new SharedStateManager();