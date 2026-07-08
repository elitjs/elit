import { setStateCreatedHook } from '@elitjs/dom';
import { DEFAULT_MAX_PERF_EVENTS, ensureBridge, registerPanelControls } from './registry';
import { destroyPanel, hide, show, toggle } from './panel';
import { trackRouter, trackState, untrackRouter, untrackState } from './track';
import type { DevToolsBridge, DevToolsInstallOptions } from './types';

const DEFAULT_HOTKEY = 'Ctrl+Shift+E';

let autoTrackCounter = 0;
let autoTrackInstalled = false;

export function installDevTools(options: DevToolsInstallOptions = {}): DevToolsBridge {
    const {
        router,
        routerName = 'default',
        hotkey = DEFAULT_HOTKEY,
        showPanel = true,
        maxPerfEvents = DEFAULT_MAX_PERF_EVENTS,
        autoTrack = false,
    } = options;

    if (typeof window === 'undefined') {
        throw new Error('@elitjs/devtools can only be installed in a browser environment.');
    }

    const bridge = ensureBridge(maxPerfEvents);

    if (router) {
        trackRouter(routerName, router);
    }

    if (autoTrack && !autoTrackInstalled) {
        autoTrackInstalled = true;
        setStateCreatedHook((state) => {
            autoTrackCounter += 1;
            trackState(`state#${autoTrackCounter}`, state);
        });
    }

    registerPanelControls(toggle, show, hide);

    if (hotkey !== false) {
        registerHotkey(hotkey);
    }

    if (showPanel) {
        show();
    }

    bridge.pushPerfEvent({
        type: 'render',
        name: '@elitjs/devtools installed',
        timestamp: Date.now(),
    });

    return bridge;
}

export function uninstallDevTools(): void {
    const bridge = window.__ELIT_DEVTOOLS__;
    if (!bridge) return;

    for (const router of bridge.routers.values()) {
        router.destroy();
    }
    bridge.routers.clear();

    for (const state of bridge.states.values()) {
        state.state.destroy?.();
    }
    bridge.states.clear();

    unregisterHotkey();
    destroyPanel();
    delete window.__ELIT_DEVTOOLS__;
}

let hotkeyListener: ((event: KeyboardEvent) => void) | null = null;
let activeHotkey: string | null = null;

function registerHotkey(hotkey: string): void {
    if (typeof document === 'undefined') return;
    unregisterHotkey();

    const expected = normalizeHotkey(hotkey);
    activeHotkey = expected;

    hotkeyListener = (event: KeyboardEvent) => {
        const actual = eventToHotkey(event);
        if (actual === expected) {
            event.preventDefault();
            toggle();
        }
    };

    document.addEventListener('keydown', hotkeyListener, true);
}

function unregisterHotkey(): void {
    if (hotkeyListener && typeof document !== 'undefined') {
        document.removeEventListener('keydown', hotkeyListener, true);
    }
    hotkeyListener = null;
    activeHotkey = null;
}

function normalizeHotkey(hotkey: string): string {
    return hotkey
        .split('+')
        .map((part) => part.trim())
        .map((part) => part.toLowerCase())
        .map((part) => {
            if (part === 'ctrl') return 'control';
            if (part === 'cmd') return 'meta';
            if (part === 'command') return 'meta';
            return part;
        })
        .sort()
        .join('+');
}

function eventToHotkey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('control');
    if (event.metaKey) parts.push('meta');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    const key = event.key.toLowerCase();
    if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
        parts.push(key);
    }
    return parts.sort().join('+');
}

export { show, hide, toggle, trackState, trackRouter, untrackState, untrackRouter };
