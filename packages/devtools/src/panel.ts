import { DEFAULT_POLL_INTERVAL_MS } from './registry';
import type { ComponentNode, DevToolsBridge, DevToolsSnapshot } from './types';

const PANEL_ID = '__elit-devtools-panel__';
const PANEL_Z_INDEX = 2147483646;

type TabKey = 'components' | 'state' | 'router' | 'perf';

interface PanelState {
    mounted: boolean;
    visible: boolean;
    collapsed: boolean;
    floating: boolean;
    maximized: boolean;
    panelPos: { x: number; y: number } | null;
    activeTab: TabKey;
    pollHandle: number | null;
    selectedPath: number[] | null;
    collapsedPaths: Set<string>;
    inspectorOpen: boolean;
    splitRatio: number | null;
    picking: boolean;
}

const state: PanelState = {
    mounted: false,
    visible: false,
    collapsed: false,
    floating: false,
    maximized: false,
    panelPos: null,
    activeTab: 'components',
    pollHandle: null,
    selectedPath: null,
    collapsedPaths: new Set(),
    inspectorOpen: false,
    splitRatio: null,
    picking: false,
};

let panelEl: HTMLDivElement | null = null;
let bodyEl: HTMLDivElement | null = null;
let titleEl: HTMLDivElement | null = null;
let inspectorEl: HTMLDivElement | null = null;
let panelDrag: { dx: number; dy: number } | null = null;
let splitDrag: { startY: number; startTopH: number; totalH: number } | null = null;
let expandBtn: HTMLButtonElement | null = null;
let pipWindow: Window | null = null;

const STYLES = {
    container: `
        position: fixed;
        bottom: 0;
        right: 0;
        width: 420px;
        max-height: 60vh;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        border-top-left-radius: 8px;
        border: 1px solid #45475a;
        border-bottom: none;
        box-shadow: -4px -4px 16px rgba(0,0,0,0.4);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: ${PANEL_Z_INDEX};
    `,
    containerFloating: `
        position: fixed;
        top: 80px;
        left: 24px;
        width: 420px;
        max-height: 70vh;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        border-radius: 10px;
        border: 1px solid #45475a;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: ${PANEL_Z_INDEX};
    `,
    containerMaximized: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        max-width: 100vw;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        border: none;
        border-radius: 0;
        box-shadow: 0 0 0 rgba(0, 0, 0, 0);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: ${PANEL_Z_INDEX};
    `,
    header: `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #181825;
        border-bottom: 1px solid #45475a;
        cursor: pointer;
        user-select: none;
        font-weight: 600;
        letter-spacing: 0.04em;
    `,
    headerFloating: `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #181825;
        border-bottom: 1px solid #45475a;
        cursor: move;
        user-select: none;
        font-weight: 600;
        letter-spacing: 0.04em;
    `,
    headerBrand: `
        display: flex;
        align-items: center;
        gap: 8px;
        color: #cba6f7;
    `,
    headerDot: `
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #a6e3a1;
    `,
    headerActions: `
        display: flex;
        align-items: center;
        gap: 6px;
    `,
    headerButton: `
        background: transparent;
        color: #a6adc8;
        border: 1px solid #45475a;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        font-family: inherit;
    `,
    tabs: `
        display: flex;
        background: #181825;
        border-bottom: 1px solid #45475a;
    `,
    tab: `
        flex: 1;
        padding: 6px 10px;
        text-align: center;
        cursor: pointer;
        color: #a6adc8;
        border-right: 1px solid #313244;
        font-family: inherit;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    `,
    tabActive: `
        color: #cdd6f4;
        background: #1e1e2e;
        border-bottom: 2px solid #cba6f7;
    `,
    body: `
        flex: 1;
        overflow: auto;
        padding: 8px;
        max-height: 50vh;
    `,
    bodyMaximized: `
        flex: 1;
        overflow: auto;
        padding: 8px;
        max-height: none;
    `,
    bodySplit: `
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
        height: 50vh;
    `,
    bodySplitMaximized: `
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
        min-height: 0;
    `,
    treePane: `
        flex: 1 1 0;
        overflow: auto;
        padding: 8px;
        min-height: 40px;
        min-width: 0;
    `,
    inspectorPane: `
        flex: 1 1 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: #181825;
        min-height: 40px;
        min-width: 0;
    `,
    splitDivider: `
        height: 6px;
        flex: 0 0 6px;
        background: #313244;
        cursor: row-resize;
        user-select: none;
        position: relative;
    `,
    splitDividerHover: `
        background: #cba6f7;
    `,
    bodyCollapsed: `
        display: none;
    `,
    row: `
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        padding: 4px 6px;
        border-bottom: 1px dashed #313244;
        align-items: center;
    `,
    rowName: `
        color: #89b4fa;
        font-weight: 600;
        word-break: break-all;
    `,
    rowValue: `
        color: #a6e3a1;
        font-style: italic;
        text-align: right;
        word-break: break-all;
        max-width: 240px;
    `,
    rowMeta: `
        grid-column: 1 / -1;
        color: #6c7086;
        font-size: 10px;
        display: flex;
        gap: 12px;
    `,
    empty: `
        color: #6c7086;
        text-align: center;
        padding: 24px 8px;
        font-style: italic;
    `,
    treeRow: `
        display: flex;
        align-items: baseline;
        gap: 6px;
        padding: 2px 4px;
        white-space: nowrap;
        cursor: pointer;
        border-left: 2px solid transparent;
    `,
    treeRowSelected: `
        background: rgba(167, 139, 250, 0.16);
        border-left-color: #cba6f7;
        color: #cdd6f4;
    `,
    treeRowHover: `
        background: rgba(255, 255, 255, 0.04);
    `,
    treePickBtn: `
        background: transparent;
        border: none;
        color: #6c7086;
        cursor: pointer;
        font-size: 13px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: inherit;
    `,
    treePickBtnActive: `
        background: #cba6f7;
        color: #1e1e2e;
    `,
    treeCaret: `
        color: #6c7086;
        font-size: 10px;
        min-width: 10px;
        cursor: pointer;
        user-select: none;
    `,
    treeInfoIcon: `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(137, 180, 250, 0.12);
        color: #89b4fa;
        font-size: 10px;
        font-weight: 700;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        cursor: pointer;
        user-select: none;
        line-height: 1;
        opacity: 0.55;
        transition: opacity 100ms ease, background 100ms ease, color 100ms ease;
    `,
    treeInfoIconHover: `
        opacity: 1;
        background: rgba(137, 180, 250, 0.28);
        color: #cdd6f4;
    `,
    treeInfoIconActive: `
        opacity: 1;
        background: #89b4fa;
        color: #1a1b26;
    `,
    treeTag: `
        color: #f9e2af;
    `,
    treeAttr: `
        color: #89b4fa;
        font-size: 11px;
    `,
    treeAttrDim: `
        color: #7f849e;
        font-size: 11px;
    `,
    treeText: `
        color: #a6adc8;
        font-style: italic;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 220px;
    `,
    treeChildCount: `
        color: #6c7086;
        font-size: 10px;
    `,
    treeHidden: `
        opacity: 0.45;
        font-style: italic;
        color: #f38ba8;
        font-size: 10px;
    `,
    treeBox: `
        color: #94e2d5;
        font-size: 10px;
    `,
    inspector: `
        flex: 1;
        background: transparent;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    `,
    inspectorTitle: `
        color: #cba6f7;
        font-weight: 600;
        font-size: 11px;
        padding: 6px 10px;
        background: rgba(137, 180, 250, 0.08);
        border-bottom: 1px solid #313244;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    `,
    inspectorBody: `
        padding: 8px 10px;
        overflow: auto;
        flex: 1;
    `,
    inspectorSection: `
        margin-bottom: 8px;
    `,
    inspectorSectionLabel: `
        color: #6c7086;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 3px;
    `,
    inspectorRow: `
        display: grid;
        grid-template-columns: 90px 1fr;
        gap: 6px;
        font-size: 11px;
        padding: 2px 0;
        align-items: baseline;
    `,
    inspectorKey: `
        color: #89b4fa;
        font-size: 10px;
    `,
    inspectorValue: `
        color: #cdd6f4;
        word-break: break-all;
    `,
    inspectorCode: `
        background: #11111b;
        border: 1px solid #313244;
        border-radius: 4px;
        padding: 6px 8px;
        color: #a6adc8;
        font-size: 10px;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 140px;
        overflow: auto;
    `,
    inspectorCloseBtn: `
        background: transparent;
        color: #a6adc8;
        border: 1px solid #45475a;
        border-radius: 4px;
        padding: 1px 7px;
        font-size: 10px;
        cursor: pointer;
        font-family: inherit;
    `,
    perfItem: `
        display: flex;
        justify-content: space-between;
        padding: 3px 6px;
        border-bottom: 1px dashed #313244;
    `,
    perfType: `
        color: #f9e2af;
    `,
    perfName: `
        color: #cdd6f4;
    `,
    perfTime: `
        color: #6c7086;
    `,
    perfBadgeState: `
        color: #89b4fa;
    `,
    perfBadgeRouter: `
        color: #f5c2e7;
    `,
    perfBadgeRender: `
        color: #a6e3a1;
    `,
};

function applyStyle(element: HTMLElement, style: string): void {
    element.setAttribute('style', style);
}

function createPanel(bridge: DevToolsBridge): HTMLDivElement {
    const container = document.createElement('div');
    container.id = PANEL_ID;
    applyStyle(container, STYLES.container);
    container.style.display = state.visible ? 'flex' : 'none';

    const header = document.createElement('div');
    applyStyle(header, STYLES.header);

    const brand = document.createElement('div');
    applyStyle(brand, STYLES.headerBrand);
    brand.innerHTML = `<span style="${STYLES.headerDot}"></span> Elit DevTools`;

    const actions = document.createElement('div');
    applyStyle(actions, STYLES.headerActions);

    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = state.collapsed ? '+' : '–';
    applyStyle(collapseBtn, STYLES.headerButton);
    collapseBtn.title = 'Collapse panel';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'x';
    applyStyle(closeBtn, STYLES.headerButton);
    closeBtn.title = 'Hide panel (Ctrl+Shift+E)';

    const expandBtnEl = document.createElement('button');
    expandBtnEl.textContent = '⧉';
    applyStyle(expandBtnEl, STYLES.headerButton);
    expandBtnEl.title = 'Detach as maximized window';

    actions.append(collapseBtn, expandBtnEl, closeBtn);
    header.append(brand, actions);
    expandBtn = expandBtnEl;

    const tabsBar = document.createElement('div');
    applyStyle(tabsBar, STYLES.tabs);

    const tabs: Array<{ key: TabKey; label: string }> = [
        { key: 'components', label: 'Components' },
        { key: 'state', label: `State (${bridge.states.size})` },
        { key: 'router', label: `Router (${bridge.routers.size})` },
        { key: 'perf', label: 'Perf' },
    ];

    const tabEls = new Map<TabKey, HTMLDivElement>();
    for (const tab of tabs) {
        const tabEl = document.createElement('div');
        tabEl.textContent = tab.label;
        applyStyle(tabEl, state.activeTab === tab.key ? `${STYLES.tab}; ${STYLES.tabActive}` : STYLES.tab);
        tabEl.addEventListener('click', () => {
            if (state.activeTab !== tab.key && state.activeTab === 'components') {
                window.__ELIT_DEVTOOLS__?.clearHighlight();
                if (state.picking) {
                    state.picking = false;
                    window.__ELIT_DEVTOOLS__?.stopPicking();
                }
            }
            state.activeTab = tab.key;
            for (const [key, el] of tabEls) {
                applyStyle(el, key === tab.key ? `${STYLES.tab}; ${STYLES.tabActive}` : STYLES.tab);
            }
            renderBody(bridge);
        });
        tabEls.set(tab.key, tabEl);
        tabsBar.appendChild(tabEl);
    }

    const body = document.createElement('div');
    applyStyle(body, state.collapsed ? STYLES.bodyCollapsed : (state.maximized ? STYLES.bodyMaximized : STYLES.body));

    container.append(header, tabsBar, body);

    header.addEventListener('click', (event) => {
        if (event.target === closeBtn || event.target === collapseBtn || event.target === expandBtnEl) return;
        if (state.floating) return;
        toggleCollapse(bridge);
    });

    collapseBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCollapse(bridge);
        collapseBtn.textContent = state.collapsed ? '+' : '–';
    });

    closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        hide();
    });

    expandBtnEl.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleExpand();
    });

    header.addEventListener('mousedown', (event) => {
        if (!state.floating) return;
        if (event.target === closeBtn || event.target === collapseBtn || event.target === expandBtnEl) return;
        const rect = panelEl!.getBoundingClientRect();
        panelDrag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
        event.preventDefault();
    });

    panelEl = container;
    bodyEl = body;
    titleEl = tabsBar;
    container.addEventListener('mouseleave', () => {
        window.__ELIT_DEVTOOLS__?.clearHighlight();
    });
    return container;
}

function toggleCollapse(bridge: DevToolsBridge): void {
    state.collapsed = !state.collapsed;
    if (bodyEl) {
        applyStyle(bodyEl, state.collapsed ? STYLES.bodyCollapsed : (state.maximized ? STYLES.bodyMaximized : STYLES.body));
    }
    if (titleEl) {
        applyStyle(titleEl, state.collapsed ? STYLES.bodyCollapsed : STYLES.tabs);
    }
}

function toggleExpand(): void {
    if (state.floating) {
        closePip();
        return;
    }
    state.maximized = true;
    state.floating = true;
    applyPanelLayout();
    if (bodyEl) {
        applyStyle(bodyEl, state.collapsed ? STYLES.bodyCollapsed : STYLES.bodyMaximized);
    }
    updateExpandBtn();
    openPip().catch(() => {
        if (panelEl) document.body.appendChild(panelEl);
        applyPanelLayout();
        updateExpandBtn();
    });
}

function updateExpandBtn(): void {
    if (!expandBtn) return;
    if (state.floating) {
        expandBtn.textContent = '⤓';
        expandBtn.title = 'Dock to corner';
    } else {
        expandBtn.textContent = '⧉';
        expandBtn.title = 'Detach as maximized window';
    }
}

async function openPip(): Promise<void> {
    const api = (window as Window & { documentPictureInPicture?: { requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!api || typeof api.requestWindow !== 'function' || !panelEl) {
        throw new Error('Document PiP not supported');
    }
    const win = await api.requestWindow({ width: 1200, height: 800 });
    pipWindow = win;
    copyStylesTo(win.document);
    win.document.body.style.margin = '0';
    win.document.body.style.background = '#1e1e2e';
    if (panelEl) win.document.body.appendChild(panelEl);
    state.floating = true;
    applyPanelLayout();
    updateExpandBtn();
    win.addEventListener('pagehide', () => {
        if (pipWindow !== win) return;
        movePanelBackToOriginal();
    });
}

function closePip(): void {
    if (pipWindow) {
        try { (pipWindow as Window & { close?: () => void }).close?.(); } catch { /* ignore */ }
    }
    movePanelBackToOriginal();
}

function movePanelBackToOriginal(): void {
    if (panelEl) {
        document.body.appendChild(panelEl);
    }
    pipWindow = null;
    state.floating = false;
    state.maximized = false;
    state.panelPos = null;
    applyPanelLayout();
    if (bodyEl) {
        applyStyle(bodyEl, state.collapsed ? STYLES.bodyCollapsed : STYLES.body);
    }
    updateExpandBtn();
}

function copyStylesTo(targetDoc: Document): void {
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        targetDoc.head.appendChild(node.cloneNode(true));
    });
}

function applyPanelLayout(): void {
    if (!panelEl) return;
    if (state.maximized) {
        applyStyle(panelEl, STYLES.containerMaximized);
        const header = panelEl.querySelector(':scope > div');
        if (header) applyStyle(header as HTMLElement, STYLES.header);
        panelEl.style.left = '';
        panelEl.style.top = '';
    } else if (state.floating) {
        applyStyle(panelEl, STYLES.containerFloating);
        const header = panelEl.querySelector(':scope > div');
        if (header) applyStyle(header as HTMLElement, STYLES.headerFloating);
        if (state.panelPos) {
            panelEl.style.left = `${state.panelPos.x}px`;
            panelEl.style.top = `${state.panelPos.y}px`;
        }
    } else {
        applyStyle(panelEl, STYLES.container);
        const header = panelEl.querySelector(':scope > div');
        if (header) applyStyle(header as HTMLElement, STYLES.header);
        panelEl.style.left = '';
        panelEl.style.top = '';
    }
    panelEl.style.display = state.visible ? 'flex' : 'none';
}

function onPanelDragMove(event: MouseEvent): void {
    if (!panelDrag || !panelEl) return;
    const x = Math.max(0, Math.min(window.innerWidth - panelEl.offsetWidth, event.clientX - panelDrag.dx));
    const y = Math.max(0, Math.min(window.innerHeight - panelEl.offsetHeight, event.clientY - panelDrag.dy));
    panelEl.style.left = `${x}px`;
    panelEl.style.top = `${y}px`;
    state.panelPos = { x, y };
}

function onPanelDragEnd(): void {
    panelDrag = null;
}

function applyPaneFlex(pane: HTMLElement, ratio: number | null): void {
    if (ratio === null) {
        pane.style.flex = '1 1 0';
    } else {
        pane.style.flex = `0 0 ${(ratio * 100).toFixed(2)}%`;
    }
}

function startSplitDrag(event: MouseEvent): void {
    if (!bodyEl) return;
    const treePane = bodyEl.children[0] as HTMLElement | undefined;
    if (!treePane) return;
    splitDrag = {
        startY: event.clientY,
        startTopH: treePane.offsetHeight,
        totalH: bodyEl.offsetHeight,
    };
    event.preventDefault();
}

function onSplitDragMove(event: MouseEvent): void {
    if (!splitDrag || !bodyEl) return;
    const treePane = bodyEl.children[0] as HTMLElement | undefined;
    if (!treePane) return;
    const delta = event.clientY - splitDrag.startY;
    const usable = Math.max(80, splitDrag.totalH - 12);
    const newH = Math.max(40, Math.min(usable - 40, splitDrag.startTopH + delta));
    const ratio = newH / splitDrag.totalH;
    state.splitRatio = ratio;
    treePane.style.flex = `0 0 ${newH}px`;
}

function onSplitDragEnd(): void {
    splitDrag = null;
}

function renderBody(bridge: DevToolsBridge): void {
    if (!bodyEl) return;
    const snapshot = bridge.snapshot();

    state.picking = snapshot.picking;
    if (snapshot.pickedPath && snapshot.pickedPath.length) {
        state.selectedPath = [...snapshot.pickedPath];
        for (let i = 1; i <= state.selectedPath.length; i++) {
            state.collapsedPaths.delete(state.selectedPath.slice(0, i).join('/'));
        }
        state.inspectorOpen = true;
        state.picking = false;
        bridge.clearPickedPath();
        bridge.highlightByPath(state.selectedPath);
        setTimeout(() => {
            const key = state.selectedPath!.join(',');
            const row = bodyEl?.querySelector(`[data-path="${key}"]`) as HTMLElement | null;
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
    }

    const savedScrolls = captureScrollPositions();
    bodyEl.innerHTML = '';

    const shouldShowInspector = state.activeTab === 'components' && state.inspectorOpen && state.selectedPath;
    if (!shouldShowInspector) {
        inspectorEl = null;
    }

    if (state.activeTab === 'components') {
        if (shouldShowInspector) {
            applyStyle(bodyEl, state.maximized ? STYLES.bodySplitMaximized : STYLES.bodySplit);
            const treePane = document.createElement('div');
            applyStyle(treePane, STYLES.treePane);
            renderComponentsTree(snapshot, treePane);
            const divider = document.createElement('div');
            applyStyle(divider, STYLES.splitDivider);
            divider.addEventListener('mousedown', startSplitDrag);
            divider.addEventListener('dblclick', () => {
                state.splitRatio = null;
                applyPaneFlex(treePane, null);
                applyPaneFlex(inspectorPane, null);
            });
            const inspectorPane = document.createElement('div');
            applyStyle(inspectorPane, STYLES.inspectorPane);
            applyPaneFlex(treePane, state.splitRatio);
            bodyEl.append(treePane, divider, inspectorPane);
            renderInspector(inspectorPane, snapshot);
        } else {
            applyStyle(bodyEl, state.maximized ? STYLES.bodyMaximized : STYLES.body);
            renderComponentsTree(snapshot, bodyEl);
        }
    } else if (state.activeTab === 'state') {
        applyStyle(bodyEl, state.maximized ? STYLES.bodyMaximized : STYLES.body);
        renderStateTab(snapshot, bodyEl);
    } else if (state.activeTab === 'router') {
        applyStyle(bodyEl, state.maximized ? STYLES.bodyMaximized : STYLES.body);
        renderRouterTab(snapshot, bodyEl);
    } else {
        applyStyle(bodyEl, state.maximized ? STYLES.bodyMaximized : STYLES.body);
        renderPerfTab(snapshot, bodyEl);
    }

    restoreScrollPositions(savedScrolls);
}

function captureScrollPositions(): { tree: number; inspector: number; body: number } {
    if (!bodyEl) return { tree: 0, inspector: 0, body: 0 };
    const treePane = bodyEl.children[0] as HTMLElement | undefined;
    const inspectorPane = bodyEl.children[2] as HTMLElement | undefined;
    const inspectorBody = inspectorPane?.querySelector('[data-elit-inspector-body]') as HTMLElement | undefined;
    return {
        tree: treePane?.scrollTop ?? 0,
        inspector: inspectorBody?.scrollTop ?? 0,
        body: bodyEl.scrollTop ?? 0,
    };
}

function restoreScrollPositions(saved: { tree: number; inspector: number; body: number }): void {
    if (!bodyEl) return;
    if (saved.body > 0) bodyEl.scrollTop = saved.body;
    const treePane = bodyEl.children[0] as HTMLElement | undefined;
    if (treePane && saved.tree > 0) treePane.scrollTop = saved.tree;
    const inspectorPane = bodyEl.children[2] as HTMLElement | undefined;
    const inspectorBody = inspectorPane?.querySelector('[data-elit-inspector-body]') as HTMLElement | undefined;
    if (inspectorBody && saved.inspector > 0) inspectorBody.scrollTop = saved.inspector;
}

function renderComponentsTree(snapshot: DevToolsSnapshot, root: HTMLDivElement): void {
    if (snapshot.componentTree.length === 0) {
        const empty = document.createElement('div');
        applyStyle(empty, STYLES.empty);
        empty.textContent = 'No root element found. Mount the app on #app to inspect.';
        root.appendChild(empty);
        return;
    }

    const header = document.createElement('div');
    applyStyle(header, STYLES.rowMeta);
    header.style.justifyContent = 'space-between';
    header.style.padding = '0 6px 6px';
    const headerText = document.createElement('span');
    headerText.textContent = `${snapshot.componentRoots} root node${snapshot.componentRoots === 1 ? '' : 's'}  ·  click rows to highlight · hover to preview`;
    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.title = 'Select an element in the page';
    pickBtn.textContent = '◎';
    applyStyle(pickBtn, state.picking ? `${STYLES.treePickBtn};${STYLES.treePickBtnActive}` : STYLES.treePickBtn);
    pickBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        state.picking = !state.picking;
        if (state.picking) {
            window.__ELIT_DEVTOOLS__?.startPicking();
        } else {
            window.__ELIT_DEVTOOLS__?.stopPicking();
        }
        renderBody(window.__ELIT_DEVTOOLS__ as DevToolsBridge);
    });
    header.append(headerText, pickBtn);

    const container = document.createElement('div');
    applyStyle(container, 'display:flex;flex-direction:column;padding-bottom:8px;');
    for (const node of snapshot.componentTree) {
        renderComponentNode(node, container, 0);
    }
    root.append(header, container);
}

function renderComponentNode(node: ComponentNode, parent: HTMLElement, indent: number): void {
    const pathKey = node.path.join('/');
    const isSelected = !!state.selectedPath && state.selectedPath.join('/') === pathKey;
    const isCollapsed = state.collapsedPaths.has(pathKey);
    const hasChildren = !!node.children && node.children.length > 0;

    const row = document.createElement('div');
    applyStyle(row, `${STYLES.treeRow}${isSelected ? `;${STYLES.treeRowSelected}` : ''}`);
    row.style.paddingLeft = `${indent * 12 + 4}px`;

    const caret = document.createElement('span');
    applyStyle(caret, STYLES.treeCaret);
    caret.textContent = hasChildren ? (isCollapsed ? '▸' : '▾') : '·';

    const info = document.createElement('span');
    const inspectorForThis = state.inspectorOpen && isSelected;
    applyStyle(info, `${STYLES.treeInfoIcon}${inspectorForThis ? `;${STYLES.treeInfoIconActive}` : ''}`);
    info.textContent = 'i';
    info.title = 'Inspect element';

    const tag = document.createElement('span');
    applyStyle(tag, STYLES.treeTag);
    tag.textContent = node.tag;

    row.append(caret, info, tag);

    if (node.id) {
        const idSpan = document.createElement('span');
        applyStyle(idSpan, STYLES.treeAttr);
        idSpan.textContent = `#${node.id}`;
        row.appendChild(idSpan);
    }

    if (node.classList && node.classList.length > 0) {
        const cls = document.createElement('span');
        applyStyle(cls, STYLES.treeAttr);
        const shown = node.classList.slice(0, 2);
        const more = node.classList.length - shown.length;
        cls.textContent = `.${shown.join('.')}${more > 0 ? `+${more}` : ''}`;
        row.appendChild(cls);
    }

    if (node.attributes && node.attributes.length > 0) {
        const attrSpan = document.createElement('span');
        applyStyle(attrSpan, STYLES.treeAttrDim);
        const names = node.attributes.slice(0, 3).map((a) => a.name);
        attrSpan.textContent = `[${names.join(',')}${node.attributes.length > 3 ? `+${node.attributes.length - 3}` : ''}]`;
        row.appendChild(attrSpan);
    }

    if (node.textPreview) {
        const text = document.createElement('span');
        applyStyle(text, STYLES.treeText);
        text.textContent = `"${node.textPreview}"`;
        row.appendChild(text);
    }

    if (node.box) {
        const box = document.createElement('span');
        applyStyle(box, STYLES.treeBox);
        box.textContent = `${node.box.width}×${node.box.height}`;
        row.appendChild(box);
    }

    if (!node.visible && node.tag !== 'head' && node.tag !== 'script') {
        const hidden = document.createElement('span');
        applyStyle(hidden, STYLES.treeHidden);
        hidden.textContent = 'hidden';
        row.appendChild(hidden);
    } else if (node.childElementCount > 0) {
        const count = document.createElement('span');
        applyStyle(count, STYLES.treeChildCount);
        count.textContent = `×${node.childElementCount}${node.descendantCount > node.childElementCount ? ` (${node.descendantCount})` : ''}`;
        row.appendChild(count);
    }

    parent.appendChild(row);

    row.addEventListener('click', (event) => {
        event.stopPropagation();
        if (event.target === caret && hasChildren) {
            if (isCollapsed) state.collapsedPaths.delete(pathKey);
            else state.collapsedPaths.add(pathKey);
        } else if (event.target === info) {
            state.selectedPath = [...node.path];
            state.inspectorOpen = true;
            window.__ELIT_DEVTOOLS__?.highlightByPath(node.path);
        } else {
            state.selectedPath = [...node.path];
            window.__ELIT_DEVTOOLS__?.highlightByPath(node.path);
        }
        renderBody(window.__ELIT_DEVTOOLS__ as DevToolsBridge);
    });

    info.addEventListener('mouseenter', () => {
        if (!(state.inspectorOpen && isSelected)) {
            applyStyle(info, `${STYLES.treeInfoIcon};${STYLES.treeInfoIconHover}`);
        }
    });
    info.addEventListener('mouseleave', () => {
        if (!(state.inspectorOpen && isSelected)) {
            applyStyle(info, STYLES.treeInfoIcon);
        }
    });

    row.addEventListener('mouseenter', () => {
        if (isSelected) return;
        applyStyle(row, `${STYLES.treeRow};${STYLES.treeRowHover}`);
        window.__ELIT_DEVTOOLS__?.hoverByPath(node.path);
    });
    row.addEventListener('mouseleave', () => {
        applyStyle(row, `${STYLES.treeRow}${isSelected ? `;${STYLES.treeRowSelected}` : ''}`);
        window.__ELIT_DEVTOOLS__?.clearHighlight();
    });

    if (hasChildren && !isCollapsed) {
        for (const child of node.children!) {
            renderComponentNode(child, parent, indent + 1);
        }
    }
}

function renderInspector(root: HTMLDivElement, snapshot: DevToolsSnapshot): void {
    const bridge = window.__ELIT_DEVTOOLS__;
    if (!bridge || !state.selectedPath) return;
    const detail = bridge.inspectByPath(state.selectedPath);
    if (!detail) return;

    if (!inspectorEl) {
        inspectorEl = document.createElement('div');
    }
    inspectorEl.innerHTML = '';
    applyStyle(inspectorEl, STYLES.inspector);

    const title = document.createElement('div');
    applyStyle(title, STYLES.inspectorTitle);
    const titleLeft = document.createElement('span');
    const idPart = detail.id ? `#${detail.id}` : '';
    const clsPart = detail.classList && detail.classList.length ? `.${detail.classList.join('.')}` : '';
    titleLeft.textContent = `${detail.tag}${idPart}${clsPart}`;
    const closeBtn = document.createElement('button');
    applyStyle(closeBtn, STYLES.inspectorCloseBtn);
    closeBtn.textContent = '× close';
    closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        state.inspectorOpen = false;
        state.selectedPath = null;
        bridge.clearHighlight();
        renderBody(bridge);
    });
    title.append(titleLeft, closeBtn);

    const body = document.createElement('div');
    body.setAttribute('data-elit-inspector-body', 'true');
    applyStyle(body, STYLES.inspectorBody);

    const sections: HTMLElement[] = [];

    if (detail.box) {
        sections.push(buildInspectorSection('Box model', [
            ['size', `${detail.box.width} × ${detail.box.height}`],
            ['position', `top ${detail.box.top}  left ${detail.box.left}`],
            ['descendants', `${detail.descendantCount} total  ·  ${detail.childElementCount} direct`],
        ]));
    }

    const attrRows: Array<[string, string]> = [];
    if (detail.id) attrRows.push(['id', detail.id]);
    if (detail.classList && detail.classList.length) attrRows.push(['class', detail.classList.join(' ')]);
    for (const attr of detail.attributes ?? []) attrRows.push([attr.name, attr.value]);
    if (detail.fullText) attrRows.push(['text', detail.fullText]);
    if (attrRows.length > 0) {
        sections.push(buildInspectorSection('Attributes & content', attrRows));
    }

    if (detail.outerHTMLPreview) {
        const label = document.createElement('div');
        applyStyle(label, STYLES.inspectorSectionLabel);
        label.textContent = 'outer HTML';
        const code = document.createElement('pre');
        applyStyle(code, STYLES.inspectorCode);
        code.textContent = detail.outerHTMLPreview;
        body.append(...sections, label, code);
    } else {
        body.append(...sections);
    }

    inspectorEl.append(title, body);
    root.appendChild(inspectorEl);
}

function buildInspectorSection(label: string, rows: Array<[string, string]>): HTMLElement {
    const section = document.createElement('div');
    applyStyle(section, STYLES.inspectorSection);
    const labelEl = document.createElement('div');
    applyStyle(labelEl, STYLES.inspectorSectionLabel);
    labelEl.textContent = label;
    section.appendChild(labelEl);
    for (const [key, value] of rows) {
        const row = document.createElement('div');
        applyStyle(row, STYLES.inspectorRow);
        const keyEl = document.createElement('span');
        applyStyle(keyEl, STYLES.inspectorKey);
        keyEl.textContent = key;
        const valEl = document.createElement('span');
        applyStyle(valEl, STYLES.inspectorValue);
        valEl.textContent = value;
        row.append(keyEl, valEl);
        section.appendChild(row);
    }
    return section;
}

function renderStateTab(snapshot: DevToolsSnapshot, root: HTMLDivElement): void {
    if (snapshot.states.length === 0) {
        const empty = document.createElement('div');
        applyStyle(empty, STYLES.empty);
        empty.textContent = 'No tracked states. Wrap with trackState(name, state) to inspect.';
        root.appendChild(empty);
        return;
    }

    for (const entry of snapshot.states) {
        const row = document.createElement('div');
        applyStyle(row, STYLES.row);

        const name = document.createElement('div');
        applyStyle(name, STYLES.rowName);
        name.textContent = entry.name;

        const value = document.createElement('div');
        applyStyle(value, STYLES.rowValue);
        value.textContent = entry.valuePreview;

        const meta = document.createElement('div');
        applyStyle(meta, STYLES.rowMeta);
        const updatedAgo = formatRelative(entry.lastUpdatedAt, snapshot.timestamp);
        meta.textContent = `subs: ${entry.subscriberCount}  ·  updates: ${entry.updateCount}  ·  ${updatedAgo}`;

        row.append(name, value, meta);
        root.appendChild(row);
    }
}

function renderRouterTab(snapshot: DevToolsSnapshot, root: HTMLDivElement): void {
    if (snapshot.routers.length === 0) {
        const empty = document.createElement('div');
        applyStyle(empty, STYLES.empty);
        empty.textContent = 'No tracked routers. Pass { router } to installDevTools().';
        root.appendChild(empty);
        return;
    }

    for (const router of snapshot.routers) {
        const header = document.createElement('div');
        applyStyle(header, STYLES.rowName);
        header.style.marginBottom = '4px';
        header.textContent = `${router.name} (${router.navigationCount} navigations)`;

        const path = document.createElement('div');
        applyStyle(path, STYLES.rowValue);
        path.style.textAlign = 'left';
        path.style.maxWidth = 'none';
        path.style.color = '#a6e3a1';
        path.textContent = `${router.current.path}${router.current.hash ?? ''}`;

        const meta = document.createElement('div');
        applyStyle(meta, STYLES.rowMeta);
        const ago = formatRelative(router.lastNavigatedAt, snapshot.timestamp);
        const params = router.current.params ? Object.entries(router.current.params).map(([k, v]) => `${k}=${v}`).join(', ') : '-';
        meta.textContent = `last: ${ago}  ·  params: ${params}`;

        root.append(header, path, meta);
    }
}

function renderPerfTab(snapshot: DevToolsSnapshot, root: HTMLDivElement): void {
    if (snapshot.perfEvents.length === 0) {
        const empty = document.createElement('div');
        applyStyle(empty, STYLES.empty);
        empty.textContent = 'No events yet. Interact with the app to populate.';
        root.appendChild(empty);
        return;
    }

    const recent = [...snapshot.perfEvents].reverse().slice(0, 50);
    for (const event of recent) {
        const item = document.createElement('div');
        applyStyle(item, STYLES.perfItem);

        const typeSpan = document.createElement('span');
        applyStyle(typeSpan, badgeStyleForPerfType(event.type));

        const nameSpan = document.createElement('span');
        applyStyle(nameSpan, STYLES.perfName);
        nameSpan.textContent = event.name;
        nameSpan.style.flex = '1';
        nameSpan.style.margin = '0 8px';

        const timeSpan = document.createElement('span');
        applyStyle(timeSpan, STYLES.perfTime);
        timeSpan.textContent = formatTime(event.timestamp);

        typeSpan.textContent = labelForPerfType(event.type);
        item.append(typeSpan, nameSpan, timeSpan);
        root.appendChild(item);
    }
}

function badgeStyleForPerfType(type: string): string {
    if (type === 'state-update') return STYLES.perfBadgeState;
    if (type === 'router-nav') return STYLES.perfBadgeRouter;
    return STYLES.perfBadgeRender;
}

function labelForPerfType(type: string): string {
    if (type === 'state-update') return 'state';
    if (type === 'router-nav') return 'router';
    if (type === 'render') return 'render';
    return type;
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
}

function formatRelative(timestamp: number, now: number): string {
    const delta = Math.max(0, now - timestamp);
    if (delta < 1000) return `${delta}ms ago`;
    if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
    if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
}

function mount(bridge: DevToolsBridge): void {
    if (state.mounted) return;
    if (typeof document === 'undefined') return;

    const container = createPanel(bridge);
    document.body.appendChild(container);

    state.mounted = true;
    state.pollHandle = window.setInterval(() => {
        if (state.visible && !state.collapsed) {
            renderBody(bridge);
            updateTabCounts(bridge);
        }
    }, DEFAULT_POLL_INTERVAL_MS);

    document.addEventListener('mousemove', onPanelDragMove, true);
    document.addEventListener('mouseup', onPanelDragEnd, true);
    document.addEventListener('mousemove', onSplitDragMove, true);
    document.addEventListener('mouseup', onSplitDragEnd, true);

    renderBody(bridge);
}

function updateTabCounts(bridge: DevToolsBridge): void {
    if (!titleEl) return;
    const tabs = titleEl.children;
    if (tabs[1] && tabs[1] instanceof HTMLElement) {
        tabs[1].textContent = `State (${bridge.states.size})`;
    }
    if (tabs[2] && tabs[2] instanceof HTMLElement) {
        tabs[2].textContent = `Router (${bridge.routers.size})`;
    }
}

function unmount(): void {
    if (state.pollHandle !== null) {
        window.clearInterval(state.pollHandle);
        state.pollHandle = null;
    }
    document.removeEventListener('mousemove', onPanelDragMove, true);
    document.removeEventListener('mouseup', onPanelDragEnd, true);
    document.removeEventListener('mousemove', onSplitDragMove, true);
    document.removeEventListener('mouseup', onSplitDragEnd, true);
    try { (pipWindow as (Window | null) & { close?: () => void })?.close?.(); } catch { /* ignore */ }
    pipWindow = null;
    panelEl?.remove();
    panelEl = null;
    bodyEl = null;
    titleEl = null;
    inspectorEl?.remove();
    inspectorEl = null;
    panelDrag = null;
    splitDrag = null;
    expandBtn = null;
    state.mounted = false;
}

export function show(): void {
    const bridge = window.__ELIT_DEVTOOLS__;
    if (!bridge) return;
    if (!state.mounted) {
        mount(bridge);
    }
    state.visible = true;
    if (panelEl) {
        panelEl.style.display = 'flex';
    }
}

export function hide(): void {
    state.visible = false;
    if (panelEl) {
        panelEl.style.display = 'none';
    }
    if (state.picking) {
        state.picking = false;
        window.__ELIT_DEVTOOLS__?.stopPicking();
    }
}

export function toggle(): void {
    if (state.visible) {
        hide();
    } else {
        show();
    }
}

export function isPanelVisible(): boolean {
    return state.visible;
}

export function destroyPanel(): void {
    unmount();
    window.__ELIT_DEVTOOLS__?.clearHighlight();
    state.visible = false;
    state.collapsed = false;
    state.floating = false;
    state.maximized = false;
    state.panelPos = null;
    state.activeTab = 'components';
    state.selectedPath = null;
    state.collapsedPaths.clear();
    state.inspectorOpen = false;
    state.splitRatio = null;
}
