const STATUS = document.getElementById('status');
const CONTENT = document.getElementById('content');
const TABS = document.querySelectorAll('.tab');
const COUNTS = {
    state: document.querySelector('[data-count="state"]'),
    router: document.querySelector('[data-count="router"]'),
};

let activeTab = 'components';
let snapshot = null;
let selectedPath = null;
let collapsedPaths = new Set();
let inspectorOpen = false;
let inspectorDetail = null;
let splitRatio = null;
let splitDrag = null;
let pollHandle = null;
let picking = false;

TABS.forEach((t) => {
    t.addEventListener('click', () => {
        TABS.forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        activeTab = t.dataset.tab;
        if (activeTab !== 'components') {
            runBridgeOp('clearHighlight');
            if (picking) {
                picking = false;
                runBridgeOp('stopPicking');
            }
        }
        render();
    });
});

async function runBridgeOp(method, ...args) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return null;
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: (m, a) => {
                const bridge = window.__ELIT_DEVTOOLS__ || window.e || window.t;
                if (!bridge || typeof bridge[m] !== 'function') return null;
                try {
                    return bridge[m](...(a || []));
                } catch (err) {
                    return { __error: String(err && err.message || err) };
                }
            },
            args: [method, args],
        });
        return result?.result ?? null;
    } catch (err) {
        STATUS.textContent = `Error: ${err.message}`;
        return null;
    }
}

async function poll() {
    try {
        const result = await runBridgeOp('snapshot');
        const next = result && result.__error ? null : result;
        if (next && next.pickedPath && next.pickedPath.length) {
            selectedPath = [...next.pickedPath];
            for (let i = 1; i <= selectedPath.length; i++) {
                collapsedPaths.delete(selectedPath.slice(0, i).join('/'));
            }
            inspectorOpen = true;
            picking = false;
            await Promise.all([
                runBridgeOp('clearPickedPath'),
                runBridgeOp('highlightByPath', selectedPath),
                loadInspector(selectedPath),
            ]);
            snapshot = next;
            render();
            setTimeout(() => {
                const row = CONTENT.querySelector(`[data-path="${selectedPath.join(',')}"]`);
                row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 60);
            return;
        }
        if (next && typeof next.picking === 'boolean') {
            picking = next.picking && activeTab === 'components';
        }
        if (JSON.stringify(next) !== JSON.stringify(snapshot)) {
            snapshot = next;
            render();
        }
    } catch (err) {
        STATUS.textContent = `Error: ${err.message}`;
    }
}

const BRAND_ICON = document.getElementById('brand-icon');

function updateBrandIcon() {
    if (!BRAND_ICON) return;
    if (snapshot) BRAND_ICON.classList.add('active');
    else BRAND_ICON.classList.remove('active');
}

function render() {
    updateBrandIcon();
    if (!snapshot) {
        STATUS.textContent = 'No Elit app detected';
        COUNTS.state.textContent = '0';
        COUNTS.router.textContent = '0';
        CONTENT.innerHTML = '<div class="empty">Install <code>@elitjs/devtools</code> in your app and call <code>installDevTools()</code> to inspect state, routes, and perf events.</div>';
        return;
    }
    STATUS.textContent = `v${snapshot.version}`;
    COUNTS.state.textContent = String(snapshot.states.length);
    COUNTS.router.textContent = String(snapshot.routers.length);
    if (activeTab === 'components') renderComponents();
    else if (activeTab === 'state') renderState();
    else if (activeTab === 'router') renderRouter();
    else renderPerf();
}

function renderComponents() {
    if (!snapshot.componentTree || !snapshot.componentTree.length) {
        CONTENT.innerHTML = '<div class="empty">No root element found. Mount the app on <code>#app</code> to inspect.</div>';
        return;
    }

    const savedScrolls = captureScrolls();

    const lines = [];
    lines.push(`<div class="tree-header"><span class="tree-header-text">${snapshot.componentRoots} root node${snapshot.componentRoots === 1 ? '' : 's'} · click to inspect · hover to preview</span><button class="tree-pick-btn${picking ? ' active' : ''}" data-action="pick" type="button" title="Select an element in the page">◎</button></div>`);

    const walk = (node, depth) => {
        const pathKey = node.path.join('/');
        const isCollapsed = collapsedPaths.has(pathKey);
        const isSelected = selectedPath && selectedPath.join('/') === pathKey;
        const inspectorForThis = inspectorOpen && isSelected;
        const hasChildren = node.children && node.children.length > 0;
        const pad = 14 + depth * 12;
        const caret = hasChildren ? (isCollapsed ? '▸' : '▾') : '·';
        const info = `<span class="tree-info${inspectorForThis ? ' active' : ''}" data-action="inspect" title="Inspect element">i</span>`;
        const tag = `<span class="tree-tag">${escape(node.tag)}</span>`;
        const id = node.id ? `<span class="tree-attr">#${escape(node.id)}</span>` : '';
        const cls = formatClassList(node.classList);
        const attrs = formatAttrList(node.attributes);
        const text = node.textPreview ? `<span class="tree-text">"${escape(node.textPreview)}"</span>` : '';
        const box = node.box ? `<span class="tree-box">${node.box.width}×${node.box.height}</span>` : '';
        const hidden = node.visible === false ? '<span class="tree-hidden">hidden</span>' : '';
        const count = node.childElementCount > 0
            ? `<span class="tree-count">×${node.childElementCount}${node.descendantCount > node.childElementCount ? ` (${node.descendantCount})` : ''}</span>`
            : '';

        lines.push(
            `<div class="tree-row${isSelected ? ' selected' : ''}" style="padding-left:${pad}px" data-path="${node.path.join(',')}">`
            + `<span class="tree-caret">${caret}</span>`
            + `${info}${tag}${id}${cls}${attrs}${text}${box}${hidden}${count}`
            + `</div>`
        );

        if (hasChildren && !isCollapsed) {
            for (const child of node.children) walk(child, depth + 1);
        }
    };

    for (const node of snapshot.componentTree) walk(node, 0);

    const treeHtml = lines.join('');
    const showInspector = inspectorOpen && inspectorDetail;

    if (showInspector) {
        CONTENT.classList.add('split');
        const treeFlex = splitRatio !== null ? `0 0 ${(splitRatio * 100).toFixed(2)}%` : '1 1 0';
        CONTENT.innerHTML = `<div class="tree-pane" data-elit-scroll="tree" style="flex:${treeFlex}">${treeHtml}</div><div class="split-divider" data-action="split-drag" title="Drag to resize · double-click to reset"></div><div class="inspector-pane">${renderInspector()}</div>`;
        attachDividerHandlers();
        attachInspectorClose();
    } else {
        CONTENT.classList.remove('split');
        CONTENT.innerHTML = treeHtml;
    }

    attachTreeHandlers();
    restoreScrolls(savedScrolls);
}

function renderInspector() {
    const d = inspectorDetail;
    const id = d.id ? `#${escape(d.id)}` : '';
    const cls = d.classList && d.classList.length ? `.${escape(d.classList.join('.'))}` : '';
    const title = `${escape(d.tag)}${id}${cls}`;

    const boxRows = d.box
        ? [
            ['width', `${d.box.width}px`],
            ['height', `${d.box.height}px`],
            ['top', `${d.box.top}px`],
            ['left', `${d.box.left}px`],
        ]
        : [['box', 'no layout box']];

    const attrRows = (d.attributes && d.attributes.length)
        ? d.attributes.map((a) => [a.name, a.value])
        : [];

    const htmlBlock = d.outerHTMLPreview
        ? `<div class="inspector-code">${escape(d.outerHTMLPreview)}</div>`
        : '';

    const pathLabel = (d.path || []).join(' / ') || '-';

    return `<section class="inspector">
        <div class="inspector-title">
            <span>${title}</span>
            <button class="inspector-close-btn" data-action="close-inspector" type="button">×</button>
        </div>
        <div class="inspector-body">
            ${buildSection('Path', [['index', pathLabel]])}
            ${buildSection('Box model', boxRows)}
            ${attrRows.length ? buildSection('Attributes & content', attrRows) : ''}
            ${d.fullText ? buildSection('Text content', [['text', d.fullText]]) : ''}
            ${htmlBlock ? `<div class="inspector-section"><div class="inspector-section-label">Outer HTML</div>${htmlBlock}</div>` : ''}
        </div>
    </section>`;
}

function buildSection(label, rows) {
    const body = rows.map(([k, v]) => `
        <div class="inspector-row">
            <span class="inspector-key">${escape(k)}</span>
            <span class="inspector-value">${escape(String(v ?? ''))}</span>
        </div>
    `).join('');
    return `<div class="inspector-section"><div class="inspector-section-label">${escape(label)}</div>${body}</div>`;
}

function attachDividerHandlers() {
    const divider = CONTENT.querySelector('.split-divider');
    if (!divider) return;
    divider.addEventListener('mousedown', (event) => {
        const treePane = CONTENT.querySelector('.tree-pane');
        if (!treePane) return;
        splitDrag = {
            startY: event.clientY,
            startTopH: treePane.offsetHeight,
            totalH: CONTENT.offsetHeight,
        };
        event.preventDefault();
    });
    divider.addEventListener('dblclick', () => {
        splitRatio = null;
        const treePane = CONTENT.querySelector('.tree-pane');
        if (treePane) treePane.style.flex = '1 1 0';
    });
}

function attachInspectorClose() {
    const closeBtn = CONTENT.querySelector('.inspector-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            inspectorOpen = false;
            selectedPath = null;
            inspectorDetail = null;
            runBridgeOp('clearHighlight');
            render();
        });
    }
}

document.addEventListener('mousemove', (event) => {
    if (!splitDrag) return;
    const treePane = CONTENT.querySelector('.tree-pane');
    if (!treePane) return;
    const delta = event.clientY - splitDrag.startY;
    const usable = Math.max(80, splitDrag.totalH - 12);
    const newH = Math.max(40, Math.min(usable - 40, splitDrag.startTopH + delta));
    splitRatio = newH / splitDrag.totalH;
    treePane.style.flex = `0 0 ${newH}px`;
});

document.addEventListener('mouseup', () => {
    if (!splitDrag) return;
    splitDrag = null;
});

function captureScrolls() {
    const tree = CONTENT.querySelector('[data-elit-scroll="tree"]');
    const inspector = CONTENT.querySelector('.inspector-body');
    return {
        tree: tree ? tree.scrollTop : 0,
        inspector: inspector ? inspector.scrollTop : 0,
        body: CONTENT.scrollTop,
    };
}

function restoreScrolls(saved) {
    if (!saved) return;
    if (saved.body && saved.body > 0) CONTENT.scrollTop = saved.body;
    const tree = CONTENT.querySelector('[data-elit-scroll="tree"]');
    if (tree && saved.tree > 0) tree.scrollTop = saved.tree;
    const inspector = CONTENT.querySelector('.inspector-body');
    if (inspector && saved.inspector > 0) inspector.scrollTop = saved.inspector;
}

function attachTreeHandlers() {
    const pickBtn = CONTENT.querySelector('[data-action="pick"]');
    if (pickBtn) {
        pickBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            picking = !picking;
            if (picking) await runBridgeOp('startPicking');
            else await runBridgeOp('stopPicking');
            render();
        });
    }

    const rows = CONTENT.querySelectorAll('.tree-row');
    rows.forEach((row) => {
        const rawPath = row.dataset.path || '';
        const path = rawPath.split(',').map(Number).filter((n) => !Number.isNaN(n));

        row.addEventListener('click', async (event) => {
            const target = event.target;
            const isInfo = target && target.classList && target.classList.contains('tree-info');
            const isCaret = target && target.classList && target.classList.contains('tree-caret');
            const node = findNodeByPath(path);
            const hasChildren = node && node.children && node.children.length > 0;

            if (isCaret && hasChildren && !isInfo) {
                const key = path.join('/');
                if (collapsedPaths.has(key)) collapsedPaths.delete(key);
                else collapsedPaths.add(key);
                render();
                return;
            }

            selectedPath = path;

            if (isInfo) {
                inspectorOpen = true;
                await Promise.all([
                    runBridgeOp('highlightByPath', path),
                    loadInspector(path),
                ]);
            } else {
                await runBridgeOp('highlightByPath', path);
            }
            render();
        });

        row.addEventListener('mouseenter', () => {
            if (selectedPath && selectedPath.join('/') === path.join('/')) return;
            runBridgeOp('hoverByPath', path);
        });

        row.addEventListener('mouseleave', () => {
            runBridgeOp('clearHighlight');
        });
    });

    CONTENT.onmouseleave = () => {
        runBridgeOp('clearHighlight');
    };
}

async function loadInspector(path) {
    const detail = await runBridgeOp('inspectByPath', path);
    inspectorDetail = detail && !detail.__error ? detail : null;
}

function findNodeByPath(path) {
    if (!path || !snapshot) return null;
    let candidates = snapshot.componentTree;
    let found = null;
    for (let i = 0; i < path.length; i++) {
        if (!candidates) return found;
        const node = candidates[path[i]];
        if (!node) return found;
        found = node;
        candidates = node.children;
    }
    return found;
}

function formatClassList(classList) {
    if (!classList || !classList.length) return '';
    const visible = classList.slice(0, 3);
    const extra = classList.length > 3 ? `+${classList.length - 3}` : '';
    return `<span class="tree-attr">.${escape(visible.join('.'))}</span>${extra ? `<span class="tree-attr-dim">${extra}</span>` : ''}`;
}

function formatAttrList(attrs) {
    if (!attrs || !attrs.length) return '';
    const visible = attrs.slice(0, 3);
    const extra = attrs.length > 3 ? ` +${attrs.length - 3}` : '';
    const parts = visible.map((a) => `<span class="tree-attr-dim">${escape(a.name)}</span>`);
    if (extra) parts.push(`<span class="tree-attr-dim">${extra}</span>`);
    return parts.join(' ');
}

function renderState() {
    if (!snapshot.states.length) {
        CONTENT.innerHTML = '<div class="empty">No tracked states. Wrap with <code>trackState(name, state)</code> to inspect.</div>';
        return;
    }
    CONTENT.innerHTML = snapshot.states.map((s) => `
        <div class="row">
            <div class="row-name">${escape(s.name)}</div>
            <div class="row-value">${escape(s.valuePreview)}</div>
            <div class="row-meta">subs: ${s.subscriberCount} · updates: ${s.updateCount} · ${timeAgo(s.lastUpdatedAt, snapshot.timestamp)}</div>
        </div>
    `).join('');
}

function renderRouter() {
    if (!snapshot.routers.length) {
        CONTENT.innerHTML = '<div class="empty">No tracked routers. Pass <code>{ router }</code> to <code>installDevTools()</code>.</div>';
        return;
    }
    CONTENT.innerHTML = snapshot.routers.map((r) => `
        <div class="row">
            <div class="row-name">${escape(r.name)}</div>
            <div class="row-value">${escape(r.current.path)}${escape(r.current.hash || '')}</div>
            <div class="row-meta">navigations: ${r.navigationCount} · last: ${timeAgo(r.lastNavigatedAt, snapshot.timestamp)} · params: ${formatParams(r.current.params)}</div>
        </div>
    `).join('');
}

function renderPerf() {
    if (!snapshot.perfEvents.length) {
        CONTENT.innerHTML = '<div class="empty">No events yet. Interact with the app to populate.</div>';
        return;
    }
    const events = [...snapshot.perfEvents].reverse().slice(0, 100);
    CONTENT.innerHTML = events.map((e) => `
        <div class="perf-item">
            <span class="perf-badge ${e.type}">${perfLabel(e.type)}</span>
            <span class="perf-name">${escape(e.name)}</span>
            <span class="perf-time">${formatTime(e.timestamp)}</span>
        </div>
    `).join('');
}

function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
}

function timeAgo(ts, now) {
    if (!ts) return 'never';
    const ms = Math.max(0, now - ts);
    if (ms < 1000) return `${ms}ms ago`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString();
}

function formatTime(ts) {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
}

function formatParams(params) {
    if (!params) return '-';
    const entries = Object.entries(params);
    if (!entries.length) return '-';
    return entries.map(([k, v]) => `${k}=${v}`).join(', ');
}

function perfLabel(type) {
    if (type === 'state-update') return 'state';
    if (type === 'router-nav') return 'router';
    return type;
}

poll();
pollHandle = setInterval(poll, 500);
