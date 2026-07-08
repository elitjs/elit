// ../../../src/dom.ts
function resolveElement(rootElement) {
  return typeof rootElement === "string" ? document.getElementById(rootElement.replace("#", "")) : rootElement;
}
function ensureElement(el, rootElement) {
  if (!el) {
    throw new Error(`Element not found: ${rootElement}`);
  }
  return el;
}
function shouldSkipChild(child) {
  return child == null || child === false;
}
function isPrimitiveJson(json) {
  return json == null || typeof json === "boolean" || typeof json === "string" || typeof json === "number";
}
var DomNode = class {
  constructor() {
    this.elementCache = /* @__PURE__ */ new WeakMap();
    this.reactiveNodes = /* @__PURE__ */ new Map();
  }
  createElement(tagName, props = {}, children = []) {
    return { tagName, props, children };
  }
  renderToDOM(vNode, parent) {
    if (vNode == null || vNode === false) return;
    if (typeof vNode !== "object") {
      parent.appendChild(document.createTextNode(String(vNode)));
      return;
    }
    if (this.isState(vNode)) {
      const textNode2 = document.createTextNode(String(vNode.value ?? ""));
      parent.appendChild(textNode2);
      vNode.subscribe((newValue) => {
        textNode2.textContent = String(newValue ?? "");
      });
      return;
    }
    if (Array.isArray(vNode)) {
      for (const child of vNode) {
        this.renderToDOM(child, parent);
      }
      return;
    }
    const { tagName, props, children } = vNode;
    if (!tagName) {
      for (const child of children) {
        if (shouldSkipChild(child)) continue;
        if (Array.isArray(child)) {
          for (const c of child) {
            !shouldSkipChild(c) && this.renderToDOM(c, parent);
          }
        } else {
          this.renderToDOM(child, parent);
        }
      }
      return;
    }
    const isSVG = tagName === "svg" || tagName[0] === "s" && tagName[1] === "v" && tagName[2] === "g" || parent.namespaceURI === "http://www.w3.org/2000/svg";
    const el = isSVG ? document.createElementNS("http://www.w3.org/2000/svg", tagName.replace("svg", "").toLowerCase() || tagName) : document.createElement(tagName);
    for (const key in props) {
      const value = props[key];
      if (value == null || value === false) continue;
      const c = key.charCodeAt(0);
      if (c === 99 && (key.length < 6 || key[5] === "N")) {
        const classValue = Array.isArray(value) ? value.join(" ") : value;
        isSVG ? el.setAttribute("class", classValue) : el.className = classValue;
      } else if (c === 115 && key.length === 5) {
        if (typeof value === "string") {
          el.style.cssText = value;
        } else {
          const s2 = el.style;
          for (const k in value) s2[k] = value[k];
        }
      } else if (c === 111 && key.charCodeAt(1) === 110) {
        el[key.toLowerCase()] = value;
      } else if (c === 100 && key.length > 20) {
        el.innerHTML = value.__html;
      } else if (c === 114 && key === "ref") {
        setTimeout(() => {
          typeof value === "function" ? value(el) : value.current = el;
        }, 0);
      } else {
        el.setAttribute(key, value === true ? "" : String(value));
      }
    }
    const len = children.length;
    if (!len) {
      parent.appendChild(el);
      return;
    }
    const renderChildren = (target) => {
      for (let i2 = 0; i2 < len; i2++) {
        const child = children[i2];
        if (shouldSkipChild(child)) continue;
        if (Array.isArray(child)) {
          for (let j = 0, cLen = child.length; j < cLen; j++) {
            const c = child[j];
            !shouldSkipChild(c) && this.renderToDOM(c, target);
          }
        } else {
          this.renderToDOM(child, target);
        }
      }
    };
    if (len > 30) {
      const fragment2 = document.createDocumentFragment();
      renderChildren(fragment2);
      el.appendChild(fragment2);
    } else {
      renderChildren(el);
    }
    parent.appendChild(el);
  }
  render(rootElement, vNode) {
    const el = ensureElement(resolveElement(rootElement), rootElement);
    el.innerHTML = "";
    if (vNode.children && vNode.children.length > 500) {
      const fragment2 = document.createDocumentFragment();
      this.renderToDOM(vNode, fragment2);
      el.appendChild(fragment2);
    } else {
      this.renderToDOM(vNode, el);
    }
    return el;
  }
  batchRender(rootElement, vNodes) {
    const el = ensureElement(resolveElement(rootElement), rootElement);
    const len = vNodes.length;
    if (len > 3e3) {
      const fragment2 = document.createDocumentFragment();
      let processed = 0;
      const chunkSize = 1500;
      const processChunk = () => {
        const end = Math.min(processed + chunkSize, len);
        for (let i2 = processed; i2 < end; i2++) {
          this.renderToDOM(vNodes[i2], fragment2);
        }
        processed = end;
        if (processed >= len) {
          el.appendChild(fragment2);
        } else {
          requestAnimationFrame(processChunk);
        }
      };
      processChunk();
    } else {
      const fragment2 = document.createDocumentFragment();
      for (let i2 = 0; i2 < len; i2++) {
        this.renderToDOM(vNodes[i2], fragment2);
      }
      el.appendChild(fragment2);
    }
    return el;
  }
  renderChunked(rootElement, vNodes, chunkSize = 5e3, onProgress) {
    const el = ensureElement(resolveElement(rootElement), rootElement);
    const len = vNodes.length;
    let index = 0;
    const renderChunk = () => {
      const end = Math.min(index + chunkSize, len);
      const fragment2 = document.createDocumentFragment();
      for (let i2 = index; i2 < end; i2++) {
        this.renderToDOM(vNodes[i2], fragment2);
      }
      el.appendChild(fragment2);
      index = end;
      if (onProgress) onProgress(index, len);
      if (index < len) {
        requestAnimationFrame(renderChunk);
      }
    };
    requestAnimationFrame(renderChunk);
    return el;
  }
  renderToHead(...vNodes) {
    const head2 = document.head;
    if (head2) {
      for (const vNode of vNodes.flat()) {
        vNode && this.renderToDOM(vNode, head2);
      }
    }
    return head2;
  }
  addStyle(cssText) {
    const el = document.createElement("style");
    el.textContent = cssText;
    return document.head.appendChild(el);
  }
  addMeta(attrs) {
    const el = document.createElement("meta");
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return document.head.appendChild(el);
  }
  addLink(attrs) {
    const el = document.createElement("link");
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return document.head.appendChild(el);
  }
  setTitle(text) {
    return document.title = text;
  }
  // Reactive State Management
  createState(initialValue, options = {}) {
    let value = initialValue;
    const listeners = /* @__PURE__ */ new Set();
    let updateTimer = null;
    const { throttle = 0, deep = false } = options;
    const notify = () => listeners.forEach((fn) => fn(value));
    const scheduleUpdate = () => {
      if (throttle > 0) {
        if (!updateTimer) {
          updateTimer = setTimeout(() => {
            updateTimer = null;
            notify();
          }, throttle);
        }
      } else {
        notify();
      }
    };
    return {
      get value() {
        return value;
      },
      set value(newValue) {
        const changed = deep ? JSON.stringify(value) !== JSON.stringify(newValue) : value !== newValue;
        if (changed) {
          value = newValue;
          scheduleUpdate();
        }
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      destroy() {
        listeners.clear();
        updateTimer && clearTimeout(updateTimer);
      }
    };
  }
  computed(states, computeFn) {
    const values = states.map((s2) => s2.value);
    const result = this.createState(computeFn(...values));
    states.forEach((state, index) => {
      state.subscribe((newValue) => {
        values[index] = newValue;
        result.value = computeFn(...values);
      });
    });
    return result;
  }
  effect(stateFn) {
    stateFn();
  }
  // Virtual scrolling helper for large lists
  createVirtualList(container2, items, renderItem, itemHeight = 50, bufferSize = 5) {
    const viewportHeight = container2.clientHeight;
    const totalHeight = items.length * itemHeight;
    let scrollTop = 0;
    const getVisibleRange = () => {
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
      const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + bufferSize);
      return { start, end };
    };
    const render2 = () => {
      const { start, end } = getVisibleRange();
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `height:${totalHeight}px;position:relative`;
      for (let i2 = start; i2 < end; i2++) {
        const itemEl = document.createElement("div");
        itemEl.style.cssText = `position:absolute;top:${i2 * itemHeight}px;height:${itemHeight}px;width:100%`;
        this.renderToDOM(renderItem(items[i2], i2), itemEl);
        wrapper.appendChild(itemEl);
      }
      container2.innerHTML = "";
      container2.appendChild(wrapper);
    };
    const scrollHandler = () => {
      scrollTop = container2.scrollTop;
      requestAnimationFrame(render2);
    };
    container2.addEventListener("scroll", scrollHandler);
    render2();
    return {
      render: render2,
      destroy: () => {
        container2.removeEventListener("scroll", scrollHandler);
        container2.innerHTML = "";
      }
    };
  }
  // Lazy load components
  lazy(loadFn) {
    let component = null;
    let loading = false;
    return async (...args) => {
      if (!component && !loading) {
        loading = true;
        component = await loadFn();
        loading = false;
      }
      return component ? component(...args) : { tagName: "div", props: { class: "loading" }, children: ["Loading..."] };
    };
  }
  // Memory management - cleanup unused elements
  cleanupUnusedElements(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.id && node.id.startsWith("r") && !this.elementCache.has(node)) {
        toRemove.push(node);
      }
    }
    toRemove.forEach((el) => el.remove());
    return toRemove.length;
  }
  // Server-Side Rendering - convert VNode to HTML string
  renderToString(vNode, options = {}) {
    const { pretty = false, indent = 0 } = options;
    const indentStr = pretty ? "  ".repeat(indent) : "";
    const newLine = pretty ? "\n" : "";
    let resolvedVNode = this.resolveStateValue(vNode);
    resolvedVNode = this.unwrapReactive(resolvedVNode);
    if (Array.isArray(resolvedVNode)) {
      return resolvedVNode.map((child) => this.renderToString(child, options)).join("");
    }
    if (typeof resolvedVNode !== "object" || resolvedVNode === null) {
      if (resolvedVNode === null || resolvedVNode === void 0 || resolvedVNode === false) {
        return "";
      }
      return this.escapeHtml(String(resolvedVNode));
    }
    const { tagName, props, children } = resolvedVNode;
    const isSelfClosing = this.isSelfClosingTag(tagName);
    let html2 = `${indentStr}<${tagName}`;
    const attrs = this.propsToAttributes(props);
    if (attrs) {
      html2 += ` ${attrs}`;
    }
    if (isSelfClosing) {
      html2 += ` />${newLine}`;
      return html2;
    }
    html2 += ">";
    if (props.dangerouslySetInnerHTML) {
      html2 += props.dangerouslySetInnerHTML.__html;
      html2 += `</${tagName}>${newLine}`;
      return html2;
    }
    if (children && children.length > 0) {
      const resolvedChildren = children.map((c) => {
        const resolved = this.resolveStateValue(c);
        return this.unwrapReactive(resolved);
      });
      const hasComplexChildren = resolvedChildren.some(
        (c) => typeof c === "object" && c !== null && !Array.isArray(c) && "tagName" in c
      );
      if (pretty && hasComplexChildren) {
        html2 += newLine;
        for (const child of resolvedChildren) {
          if (shouldSkipChild(child)) continue;
          if (Array.isArray(child)) {
            for (const c of child) {
              if (!shouldSkipChild(c)) {
                html2 += this.renderToString(c, { pretty, indent: indent + 1 });
              }
            }
          } else {
            html2 += this.renderToString(child, { pretty, indent: indent + 1 });
          }
        }
        html2 += indentStr;
      } else {
        for (const child of resolvedChildren) {
          if (shouldSkipChild(child)) continue;
          if (Array.isArray(child)) {
            for (const c of child) {
              if (!shouldSkipChild(c)) {
                html2 += this.renderToString(c, { pretty: false, indent: 0 });
              }
            }
          } else {
            html2 += this.renderToString(child, { pretty: false, indent: 0 });
          }
        }
      }
    }
    html2 += `</${tagName}>${newLine}`;
    return html2;
  }
  resolveStateValue(value) {
    if (value && typeof value === "object" && "value" in value && "subscribe" in value) {
      return value.value;
    }
    return value;
  }
  isReactiveWrapper(vNode) {
    if (!vNode || typeof vNode !== "object" || !vNode.tagName) {
      return false;
    }
    return vNode.tagName === "span" && vNode.props?.id && typeof vNode.props.id === "string" && vNode.props.id.match(/^r[a-z0-9]{9}$/);
  }
  unwrapReactive(vNode) {
    if (!this.isReactiveWrapper(vNode)) {
      return vNode;
    }
    const children = vNode.children;
    if (!children || children.length === 0) {
      return "";
    }
    if (children.length === 1) {
      const child = children[0];
      if (child && typeof child === "object" && child.tagName === "span") {
        const props = child.props;
        const hasNoProps = !props || Object.keys(props).length === 0;
        const hasSingleStringChild = child.children && child.children.length === 1 && typeof child.children[0] === "string";
        if (hasNoProps && hasSingleStringChild) {
          return child.children[0];
        }
      }
      return this.unwrapReactive(child);
    }
    return children.map((c) => this.unwrapReactive(c));
  }
  escapeHtml(text) {
    const htmlEscapes = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;"
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
  }
  isSelfClosingTag(tagName) {
    const selfClosingTags = /* @__PURE__ */ new Set([
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr"
    ]);
    return selfClosingTags.has(tagName.toLowerCase());
  }
  propsToAttributes(props) {
    const attrs = [];
    for (const key in props) {
      if (key === "children" || key === "dangerouslySetInnerHTML" || key === "ref") {
        continue;
      }
      let value = props[key];
      value = this.resolveStateValue(value);
      if (value == null || value === false) continue;
      if (key.startsWith("on") && typeof value === "function") {
        continue;
      }
      if (key === "className" || key === "class") {
        const className = Array.isArray(value) ? value.join(" ") : value;
        if (className) {
          attrs.push(`class="${this.escapeHtml(String(className))}"`);
        }
        continue;
      }
      if (key === "style") {
        const styleStr = this.styleToString(value);
        if (styleStr) {
          attrs.push(`style="${this.escapeHtml(styleStr)}"`);
        }
        continue;
      }
      if (value === true) {
        attrs.push(key);
        continue;
      }
      attrs.push(`${key}="${this.escapeHtml(String(value))}"`);
    }
    return attrs.join(" ");
  }
  styleToString(style2) {
    if (typeof style2 === "string") {
      return style2;
    }
    if (typeof style2 === "object" && style2 !== null) {
      const styles2 = [];
      for (const key in style2) {
        const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        styles2.push(`${cssKey}:${style2[key]}`);
      }
      return styles2.join(";");
    }
    return "";
  }
  isState(value) {
    return value && typeof value === "object" && "value" in value && "subscribe" in value && typeof value.subscribe === "function";
  }
  createReactiveChild(state, renderFn) {
    const currentValue = renderFn(state.value);
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const entry = { node: null, renderFn };
      this.reactiveNodes.set(state, entry);
      state.subscribe(() => {
        if (entry.node && entry.node.parentNode) {
          const newValue = renderFn(state.value);
          entry.node.textContent = String(newValue ?? "");
        }
      });
    }
    return currentValue;
  }
  jsonToVNode(json) {
    if (this.isState(json)) {
      return this.createReactiveChild(json, (v) => v);
    }
    if (isPrimitiveJson(json)) {
      return json;
    }
    const { tag, attributes = {}, children } = json;
    const props = {};
    for (const key in attributes) {
      const value = attributes[key];
      if (key === "class") {
        props.className = this.isState(value) ? value.value : value;
      } else {
        props[key] = this.isState(value) ? value.value : value;
      }
    }
    const childrenArray = [];
    if (children != null) {
      if (Array.isArray(children)) {
        for (const child of children) {
          if (this.isState(child)) {
            childrenArray.push(this.createReactiveChild(child, (v) => v));
          } else {
            const converted = this.jsonToVNode(child);
            if (converted != null && converted !== false) {
              childrenArray.push(converted);
            }
          }
        }
      } else if (this.isState(children)) {
        childrenArray.push(this.createReactiveChild(children, (v) => v));
      } else if (typeof children === "object" && "tag" in children) {
        const converted = this.jsonToVNode(children);
        if (converted != null && converted !== false) {
          childrenArray.push(converted);
        }
      } else {
        childrenArray.push(children);
      }
    }
    return { tagName: tag, props, children: childrenArray };
  }
  vNodeJsonToVNode(json) {
    if (this.isState(json)) {
      return this.createReactiveChild(json, (v) => v);
    }
    if (isPrimitiveJson(json)) {
      return json;
    }
    const { tagName, props = {}, children = [] } = json;
    const resolvedProps = {};
    for (const key in props) {
      const value = props[key];
      resolvedProps[key] = this.isState(value) ? value.value : value;
    }
    const childrenArray = [];
    for (const child of children) {
      if (this.isState(child)) {
        childrenArray.push(this.createReactiveChild(child, (v) => v));
      } else {
        const converted = this.vNodeJsonToVNode(child);
        if (converted != null && converted !== false) {
          childrenArray.push(converted);
        }
      }
    }
    return { tagName, props: resolvedProps, children: childrenArray };
  }
  renderJson(rootElement, json) {
    const vNode = this.jsonToVNode(json);
    if (!vNode || typeof vNode !== "object" || !("tagName" in vNode)) {
      throw new Error("Invalid JSON structure");
    }
    return this.render(rootElement, vNode);
  }
  renderVNode(rootElement, json) {
    const vNode = this.vNodeJsonToVNode(json);
    if (!vNode || typeof vNode !== "object" || !("tagName" in vNode)) {
      throw new Error("Invalid VNode JSON structure");
    }
    return this.render(rootElement, vNode);
  }
  renderJsonToString(json, options = {}) {
    const vNode = this.jsonToVNode(json);
    return this.renderToString(vNode, options);
  }
  renderVNodeToString(json, options = {}) {
    const vNode = this.vNodeJsonToVNode(json);
    return this.renderToString(vNode, options);
  }
  // Generate complete HTML document as string (for SSR)
  renderToHTMLDocument(vNode, options = {}) {
    const { title: title2 = "", meta: meta2 = [], links = [], scripts = [], styles: styles2 = [], lang = "en", head: head2 = "", bodyAttrs = {}, pretty = false } = options;
    const nl = pretty ? "\n" : "";
    const indent = pretty ? "  " : "";
    const indent2 = pretty ? "    " : "";
    let html2 = `<!DOCTYPE html>${nl}<html lang="${lang}">${nl}${indent}<head>${nl}${indent2}<meta charset="UTF-8">${nl}${indent2}<meta name="viewport" content="width=device-width, initial-scale=1.0">${nl}`;
    if (title2) html2 += `${indent2}<title>${this.escapeHtml(title2)}</title>${nl}`;
    for (const m of meta2) {
      html2 += `${indent2}<meta`;
      for (const k in m) html2 += ` ${k}="${this.escapeHtml(m[k])}"`;
      html2 += `>${nl}`;
    }
    for (const l of links) {
      html2 += `${indent2}<link`;
      for (const k in l) html2 += ` ${k}="${this.escapeHtml(l[k])}"`;
      html2 += `>${nl}`;
    }
    for (const s2 of styles2) {
      if (s2.href) {
        html2 += `${indent2}<link rel="stylesheet" href="${this.escapeHtml(s2.href)}">${nl}`;
      } else if (s2.content) {
        html2 += `${indent2}<style>${s2.content}</style>${nl}`;
      }
    }
    if (head2) html2 += head2 + nl;
    html2 += `${indent}</head>${nl}${indent}<body`;
    for (const k in bodyAttrs) html2 += ` ${k}="${this.escapeHtml(bodyAttrs[k])}"`;
    html2 += `>${nl}`;
    html2 += this.renderToString(vNode, { pretty, indent: 2 });
    for (const script2 of scripts) {
      html2 += `${indent2}<script`;
      if (script2.type) html2 += ` type="${this.escapeHtml(script2.type)}"`;
      if (script2.async) html2 += ` async`;
      if (script2.defer) html2 += ` defer`;
      if (script2.src) {
        html2 += ` src="${this.escapeHtml(script2.src)}"></script>${nl}`;
      } else if (script2.content) {
        html2 += `>${script2.content}</script>${nl}`;
      } else {
        html2 += `></script>${nl}`;
      }
    }
    html2 += `${indent}</body>${nl}</html>`;
    return html2;
  }
  // Expose elementCache for reactive updates
  getElementCache() {
    return this.elementCache;
  }
};
var dom = new DomNode();
var render = dom.render.bind(dom);
var renderToString = dom.renderToString.bind(dom);

// ../../../src/state.ts
var ELIT_NATIVE_BINDING = /* @__PURE__ */ Symbol("elit.native.binding");
var createState = (initial, options) => dom.createState(initial, options);
function bindValue(state) {
  const props = {
    value: state.value,
    onInput: (event) => {
      const target = event.target;
      if (!target) {
        return;
      }
      const nextValue = typeof state.value === "number" ? Number(target.value) : target.value;
      state.value = typeof state.value === "number" && Number.isNaN(nextValue) ? state.value : nextValue;
    }
  };
  props[ELIT_NATIVE_BINDING] = {
    kind: "value",
    state
  };
  return props;
}
function bindChecked(state) {
  const props = {
    checked: state.value,
    onInput: (event) => {
      const target = event.target;
      if (!target) {
        return;
      }
      state.value = Boolean(target.checked);
    }
  };
  props[ELIT_NATIVE_BINDING] = {
    kind: "checked",
    state
  };
  return props;
}
var SharedState = class {
  constructor(key, defaultValue, wsUrl) {
    this.key = key;
    this.wsUrl = wsUrl;
    this.ws = null;
    this.pendingUpdates = [];
    this.localState = createState(defaultValue);
    this.previousValue = defaultValue;
    this.connect();
  }
  /**
   * Get current value
   */
  get value() {
    return this.localState.value;
  }
  /**
   * Set new value and sync to server
   */
  set value(newValue) {
    this.previousValue = this.localState.value;
    this.localState.value = newValue;
    this.sendToServer(newValue);
  }
  /**
   * Get the underlying Elit State (for reactive binding)
   */
  get state() {
    return this.localState;
  }
  /**
   * Subscribe to changes (returns Elit State for reactive)
   */
  onChange(callback) {
    return this.localState.subscribe((newValue) => {
      const oldValue = this.previousValue;
      this.previousValue = newValue;
      callback(newValue, oldValue);
    });
  }
  /**
   * Update value using a function
   */
  update(updater) {
    this.value = updater(this.value);
  }
  /**
   * Connect to WebSocket
   */
  connect() {
    if (typeof window === "undefined") return;
    const url = this.wsUrl || `ws://${location.host}`;
    this.ws = new WebSocket(url);
    this.ws.addEventListener("open", () => {
      this.subscribe();
      while (this.pendingUpdates.length > 0) {
        const value = this.pendingUpdates.shift();
        this.sendToServer(value);
      }
    });
    this.ws.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
    this.ws.addEventListener("close", () => {
      setTimeout(() => this.connect(), 1e3);
    });
    this.ws.addEventListener("error", (error) => {
      console.error("[SharedState] WebSocket error:", error);
    });
  }
  /**
   * Subscribe to server state
   */
  subscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "state:subscribe",
      key: this.key
    }));
  }
  /**
   * Handle message from server
   */
  handleMessage(data2) {
    try {
      const msg = JSON.parse(data2);
      if (msg.key !== this.key) return;
      if (msg.type === "state:init" || msg.type === "state:update") {
        this.localState.value = msg.value;
      }
    } catch (error) {
    }
  }
  /**
   * Send value to server
   */
  sendToServer(value) {
    if (!this.ws) return;
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.pendingUpdates.push(value);
      return;
    }
    this.ws.send(JSON.stringify({
      type: "state:change",
      key: this.key,
      value
    }));
  }
  /**
   * Disconnect
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  /**
   * Destroy state and cleanup
   */
  destroy() {
    this.disconnect();
    this.localState.destroy();
  }
};
var SharedStateManager = class {
  constructor() {
    this.states = /* @__PURE__ */ new Map();
  }
  /**
   * Create or get a shared state
   */
  create(key, defaultValue, wsUrl) {
    if (this.states.has(key)) {
      return this.states.get(key);
    }
    const state = new SharedState(key, defaultValue, wsUrl);
    this.states.set(key, state);
    return state;
  }
  /**
   * Get existing state
   */
  get(key) {
    return this.states.get(key);
  }
  /**
   * Delete a state
   */
  delete(key) {
    const state = this.states.get(key);
    if (state) {
      state.destroy();
      return this.states.delete(key);
    }
    return false;
  }
  /**
   * Clear all states
   */
  clear() {
    this.states.forEach((state) => state.destroy());
    this.states.clear();
  }
};
var sharedStateManager = new SharedStateManager();

// shared.ts
var APP_NAME = "Elit Universal Example";
var APP_TAGLINE = "One repo validating browser, desktop, and Android mobile workflows.";
var APP_LINK = "https://github.com/elitjs/elit";
var INITIAL_VALIDATION_COUNT = 3;
var INITIAL_VALIDATION_TARGET = "web + desktop + mobile";
var INITIAL_REPO_NOTE = "Desktop and mobile are driven from the same repo.";
var INITIAL_NATIVE_ENABLED = true;
var UNIVERSAL_FORM_COPY = {
  title: "Web state and shared content",
  questionLabel: "What are you validating?",
  questionPlaceholder: "web + desktop + mobile",
  noteLabel: "Repo note",
  notePlaceholder: "Explain what changed in the shared component tree",
  toggleLabel: "Keep native mobile generation enabled for Android checks"
};
var UNIVERSAL_PRIMARY_ACTION_LABEL = "Record another validation pass";
function createUniversalExampleState() {
  return {
    launchCount: createState(INITIAL_VALIDATION_COUNT),
    validationTarget: createState(INITIAL_VALIDATION_TARGET),
    notes: createState(INITIAL_REPO_NOTE),
    nativeEnabled: createState(INITIAL_NATIVE_ENABLED)
  };
}
function createUniversalStatusMessages(state) {
  return [
    ["Validation counter: ", state.launchCount],
    ["Current validation target: ", state.validationTarget],
    ["Latest note: ", state.notes],
    ["Native mobile generation enabled: ", state.nativeEnabled],
    "The primary CTA now carries shared bridge metadata through elit/universal while web/native form state now shares the same binding model."
  ];
}
var PLATFORM_SURFACES = [
  {
    id: "web",
    title: "Web",
    description: "Build and preview the browser app from the same project root."
  },
  {
    id: "desktop",
    title: "Desktop",
    description: "Run the same repo inside the native WebView desktop runtime."
  },
  {
    id: "mobile",
    title: "Mobile",
    description: "Sync built web assets and generate Android Compose from a native entry."
  }
];
var VALIDATION_STEPS = [
  "Browser build output under dist/",
  "Desktop IPC smoke run",
  "Android scaffold + Compose generation",
  "Shared repo-level scripts for all three surfaces"
];
var SHARED_CHECKLIST = [
  "Reactive state on the web app",
  "Desktop shell with native IPC",
  "Compose toggle and text input generation",
  "External link handling for native mobile"
];

// ../../../src/el.ts
var hasDocument = typeof document !== "undefined";
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function bindDocMethod(method) {
  return hasDocument && method ? method.bind(doc) : void 0;
}
function createPrefixedFactories(tags2, prefix, elements2) {
  tags2.forEach((tag) => {
    const name = prefix + capitalize(tag);
    elements2[name] = createElementFactory(tag);
  });
}
var createElementFactory = (tag) => {
  return function(props, ...rest) {
    if (!arguments.length) return { tagName: tag, props: {}, children: [] };
    const isState = props && typeof props === "object" && "value" in props && "subscribe" in props;
    const isVNode = props && typeof props === "object" && "tagName" in props;
    const isChild = typeof props !== "object" || Array.isArray(props) || props === null || isState || isVNode;
    const actualProps = isChild ? {} : props;
    const args = isChild ? [props, ...rest] : rest;
    if (!args.length) return { tagName: tag, props: actualProps, children: [] };
    const flatChildren = [];
    for (let i2 = 0, len = args.length; i2 < len; i2++) {
      const child = args[i2];
      if (child == null || child === false) continue;
      if (Array.isArray(child)) {
        for (let j = 0, cLen = child.length; j < cLen; j++) {
          const c = child[j];
          c != null && c !== false && flatChildren.push(c);
        }
      } else {
        flatChildren.push(child);
      }
    }
    return { tagName: tag, props: actualProps, children: flatChildren };
  };
};
var tags = [
  "html",
  "head",
  "body",
  "title",
  "base",
  "link",
  "meta",
  "style",
  "address",
  "article",
  "aside",
  "footer",
  "header",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "main",
  "nav",
  "section",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "ul",
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "wbr",
  "area",
  "audio",
  "img",
  "map",
  "track",
  "video",
  "embed",
  "iframe",
  "object",
  "param",
  "picture",
  "portal",
  "source",
  "canvas",
  "noscript",
  "script",
  "del",
  "ins",
  "caption",
  "col",
  "colgroup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "button",
  "datalist",
  "fieldset",
  "form",
  "input",
  "label",
  "legend",
  "meter",
  "optgroup",
  "option",
  "output",
  "progress",
  "select",
  "textarea",
  "details",
  "dialog",
  "menu",
  "summary",
  "slot",
  "template"
];
var svgTags = [
  "svg",
  "circle",
  "rect",
  "path",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "g",
  "text",
  "tspan",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",
  "mask",
  "clipPath",
  "use",
  "symbol",
  "marker",
  "image",
  "foreignObject",
  "animate",
  "animateTransform",
  "animateMotion",
  "set",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feFlood",
  "feGaussianBlur",
  "feMorphology",
  "feOffset",
  "feSpecularLighting",
  "feTile",
  "feTurbulence"
];
var mathTags = [
  "math",
  "mi",
  "mn",
  "mo",
  "ms",
  "mtext",
  "mrow",
  "mfrac",
  "msqrt",
  "mroot",
  "msub",
  "msup"
];
var elements = {};
tags.forEach((tag) => {
  elements[tag] = createElementFactory(tag);
});
createPrefixedFactories(svgTags, "svg", elements);
createPrefixedFactories(mathTags, "math", elements);
elements.varElement = createElementFactory("var");
var {
  html,
  head,
  body,
  title,
  base,
  link,
  meta,
  style,
  address,
  article,
  aside,
  footer,
  header,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  main,
  nav,
  section,
  blockquote,
  dd,
  div,
  dl,
  dt,
  figcaption,
  figure,
  hr,
  li,
  ol,
  p,
  pre,
  ul,
  a,
  abbr,
  b,
  bdi,
  bdo,
  br,
  cite,
  code,
  data,
  dfn,
  em,
  i,
  kbd,
  mark,
  q,
  rp,
  rt,
  ruby,
  s,
  samp,
  small,
  span,
  strong,
  sub,
  sup,
  time,
  u,
  wbr,
  area,
  audio,
  img,
  map,
  track,
  video,
  embed,
  iframe,
  object,
  param,
  picture,
  portal,
  source,
  canvas,
  noscript,
  script,
  del,
  ins,
  caption,
  col,
  colgroup,
  table,
  tbody,
  td,
  tfoot,
  th,
  thead,
  tr,
  button,
  datalist,
  fieldset,
  form,
  input,
  label,
  legend,
  meter,
  optgroup,
  option,
  output,
  progress,
  select,
  textarea,
  details,
  dialog,
  menu,
  summary,
  slot,
  template,
  svgSvg,
  svgCircle,
  svgRect,
  svgPath,
  svgLine,
  svgPolyline,
  svgPolygon,
  svgEllipse,
  svgG,
  svgText,
  svgTspan,
  svgDefs,
  svgLinearGradient,
  svgRadialGradient,
  svgStop,
  svgPattern,
  svgMask,
  svgClipPath,
  svgUse,
  svgSymbol,
  svgMarker,
  svgImage,
  svgForeignObject,
  svgAnimate,
  svgAnimateTransform,
  svgAnimateMotion,
  svgSet,
  svgFilter,
  svgFeBlend,
  svgFeColorMatrix,
  svgFeComponentTransfer,
  svgFeComposite,
  svgFeConvolveMatrix,
  svgFeDiffuseLighting,
  svgFeDisplacementMap,
  svgFeFlood,
  svgFeGaussianBlur,
  svgFeMorphology,
  svgFeOffset,
  svgFeSpecularLighting,
  svgFeTile,
  svgFeTurbulence,
  mathMath,
  mathMi,
  mathMn,
  mathMo,
  mathMs,
  mathMtext,
  mathMrow,
  mathMfrac,
  mathMsqrt,
  mathMroot,
  mathMsub,
  mathMsup,
  varElement
} = elements;
var doc = hasDocument ? document : void 0;
var getEl = bindDocMethod(doc?.querySelector);
var getEls = bindDocMethod(doc?.querySelectorAll);
var createEl = bindDocMethod(doc?.createElement);
var createSvgEl = hasDocument ? doc.createElementNS.bind(doc, "http://www.w3.org/2000/svg") : void 0;
var createMathEl = hasDocument ? doc.createElementNS.bind(doc, "http://www.w3.org/1998/Math/MathML") : void 0;
var fragment = bindDocMethod(doc?.createDocumentFragment);
var textNode = bindDocMethod(doc?.createTextNode);
var commentNode = bindDocMethod(doc?.createComment);
var getElId = bindDocMethod(doc?.getElementById);
var getElClass = bindDocMethod(doc?.getElementsByClassName);
var getElTag = bindDocMethod(doc?.getElementsByTagName);
var getElName = bindDocMethod(doc?.getElementsByName);

// ../../../src/universal.ts
function serializePayload(payload) {
  if (payload === void 0) return void 0;
  return JSON.stringify(payload);
}
function isExternalUniversalDestination(destination) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(destination);
}
function createUniversalBridgeProps(options) {
  const props = {};
  const payloadJson = serializePayload(options.payload);
  const desktopMessage = options.desktopMessage ?? options.action ?? options.route;
  if (options.action) {
    props.nativeAction = options.action;
    props["data-elit-action"] = options.action;
  }
  if (options.route) {
    props.nativeRoute = options.route;
    props["data-elit-route"] = options.route;
  }
  if (payloadJson) {
    props.nativePayload = payloadJson;
    props["data-elit-payload"] = payloadJson;
  }
  if (desktopMessage) {
    props["data-desktop-message"] = desktopMessage;
  }
  return props;
}
function createUniversalLinkProps(destination, options = {}) {
  const external = isExternalUniversalDestination(destination);
  const route = options.route ?? (external ? void 0 : destination);
  const props = createUniversalBridgeProps({
    ...options,
    route
  });
  props.href = destination;
  if (external) {
    props.target = "_blank";
    props.rel = "noreferrer";
  }
  return props;
}
function mergeUniversalProps(...sources) {
  const merged = {};
  for (const source2 of sources) {
    if (!source2) continue;
    Object.assign(merged, source2);
  }
  return merged;
}

// ../../../src/style.ts
var ELIT_SHARED_STYLE_STORE_KEY = "__elitSharedStyleStore__";
function createStyleStore() {
  return {
    variables: [],
    rules: [],
    mediaRules: [],
    keyframes: [],
    fontFaces: [],
    imports: [],
    containerRules: [],
    supportsRules: [],
    layerRules: [],
    layerOrder: []
  };
}
function getSharedStyleStore() {
  const globalScope = globalThis;
  if (!globalScope[ELIT_SHARED_STYLE_STORE_KEY]) {
    globalScope[ELIT_SHARED_STYLE_STORE_KEY] = createStyleStore();
  }
  return globalScope[ELIT_SHARED_STYLE_STORE_KEY];
}
var CreateStyle = class {
  constructor(store) {
    this.variables = [];
    this.rules = [];
    this.mediaRules = [];
    this.keyframes = [];
    this.fontFaces = [];
    this.imports = [];
    this.containerRules = [];
    this.supportsRules = [];
    this.layerRules = [];
    this._layerOrder = [];
    if (!store) {
      return;
    }
    this.variables = store.variables;
    this.rules = store.rules;
    this.mediaRules = store.mediaRules;
    this.keyframes = store.keyframes;
    this.fontFaces = store.fontFaces;
    this.imports = store.imports;
    this.containerRules = store.containerRules;
    this.supportsRules = store.supportsRules;
    this.layerRules = store.layerRules;
    this._layerOrder = store.layerOrder;
  }
  // CSS Variables
  addVar(name, value) {
    const cssVar = {
      name: name.startsWith("--") ? name : `--${name}`,
      value,
      toString() {
        return `var(${this.name})`;
      }
    };
    this.variables.push(cssVar);
    return cssVar;
  }
  var(variable, fallback) {
    const varName = typeof variable === "string" ? variable.startsWith("--") ? variable : `--${variable}` : variable.name;
    return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
  }
  // Basic Selectors
  addTag(tag, styles2) {
    const rule = { selector: tag, styles: styles2, type: "tag" };
    this.rules.push(rule);
    return rule;
  }
  addClass(name, styles2) {
    const selector = name.startsWith(".") ? name : `.${name}`;
    const rule = { selector, styles: styles2, type: "class" };
    this.rules.push(rule);
    return rule;
  }
  addId(name, styles2) {
    const selector = name.startsWith("#") ? name : `#${name}`;
    const rule = { selector, styles: styles2, type: "id" };
    this.rules.push(rule);
    return rule;
  }
  // Pseudo Selectors
  addPseudoClass(pseudo, styles2, baseSelector) {
    const pseudoClass = pseudo.startsWith(":") ? pseudo : `:${pseudo}`;
    const selector = baseSelector ? `${baseSelector}${pseudoClass}` : pseudoClass;
    const rule = { selector, styles: styles2, type: "pseudo-class" };
    this.rules.push(rule);
    return rule;
  }
  addPseudoElement(pseudo, styles2, baseSelector) {
    const pseudoElement = pseudo.startsWith("::") ? pseudo : `::${pseudo}`;
    const selector = baseSelector ? `${baseSelector}${pseudoElement}` : pseudoElement;
    const rule = { selector, styles: styles2, type: "pseudo-element" };
    this.rules.push(rule);
    return rule;
  }
  // Attribute Selectors
  addAttribute(attr, styles2, baseSelector) {
    const attrSelector = attr.startsWith("[") ? attr : `[${attr}]`;
    const selector = baseSelector ? `${baseSelector}${attrSelector}` : attrSelector;
    const rule = { selector, styles: styles2, type: "attribute" };
    this.rules.push(rule);
    return rule;
  }
  attrEquals(attr, value, styles2, baseSelector) {
    return this.addAttribute(`${attr}="${value}"`, styles2, baseSelector);
  }
  attrContainsWord(attr, value, styles2, baseSelector) {
    return this.addAttribute(`${attr}~="${value}"`, styles2, baseSelector);
  }
  attrStartsWith(attr, value, styles2, baseSelector) {
    return this.addAttribute(`${attr}^="${value}"`, styles2, baseSelector);
  }
  attrEndsWith(attr, value, styles2, baseSelector) {
    return this.addAttribute(`${attr}$="${value}"`, styles2, baseSelector);
  }
  attrContains(attr, value, styles2, baseSelector) {
    return this.addAttribute(`${attr}*="${value}"`, styles2, baseSelector);
  }
  // Combinator Selectors
  descendant(ancestor, descendant2, styles2) {
    return this.createAndAddRule(`${ancestor} ${descendant2}`, styles2);
  }
  child(parent, childSel, styles2) {
    return this.createAndAddRule(`${parent} > ${childSel}`, styles2);
  }
  adjacentSibling(element, sibling, styles2) {
    return this.createAndAddRule(`${element} + ${sibling}`, styles2);
  }
  generalSibling(element, sibling, styles2) {
    return this.createAndAddRule(`${element} ~ ${sibling}`, styles2);
  }
  multiple(selectors, styles2) {
    return this.createAndAddRule(selectors.join(", "), styles2);
  }
  // Nesting (BEM-style)
  addName(name, styles2) {
    const selector = name.startsWith("--") ? `&${name}` : `&--${name}`;
    const rule = { selector, styles: styles2, type: "name" };
    return rule;
  }
  nesting(parentRule, ...childRules) {
    parentRule.nested = childRules;
    return parentRule;
  }
  // @keyframes - Animations
  keyframe(name, steps) {
    const keyframeSteps = Object.entries(steps).map(([step, styles2]) => ({
      step: step === "from" ? "from" : step === "to" ? "to" : `${step}%`,
      styles: styles2
    }));
    const kf = { name, steps: keyframeSteps };
    this.keyframes.push(kf);
    return kf;
  }
  keyframeFromTo(name, from, to) {
    return this.keyframe(name, { from, to });
  }
  // @font-face - Custom Fonts
  fontFace(options) {
    this.fontFaces.push(options);
    return options;
  }
  // @import - Import Stylesheets
  import(url, mediaQuery) {
    const importRule = mediaQuery ? `@import url("${url}") ${mediaQuery};` : `@import url("${url}");`;
    this.imports.push(importRule);
    return importRule;
  }
  // @media - Media Queries
  media(type, condition, rules) {
    const mediaRule = { type, condition, rules: this.rulesToCSSRules(rules) };
    this.mediaRules.push(mediaRule);
    return mediaRule;
  }
  mediaScreen(condition, rules) {
    return this.media("screen", condition, rules);
  }
  mediaPrint(rules) {
    return this.media("print", "", rules);
  }
  mediaMinWidth(minWidth, rules) {
    return this.media("screen", `min-width: ${minWidth}`, rules);
  }
  mediaMaxWidth(maxWidth, rules) {
    return this.media("screen", `max-width: ${maxWidth}`, rules);
  }
  mediaDark(rules) {
    const mediaRule = { type: "", condition: "prefers-color-scheme: dark", rules: this.rulesToCSSRules(rules) };
    this.mediaRules.push(mediaRule);
    return mediaRule;
  }
  mediaLight(rules) {
    const mediaRule = { type: "", condition: "prefers-color-scheme: light", rules: this.rulesToCSSRules(rules) };
    this.mediaRules.push(mediaRule);
    return mediaRule;
  }
  mediaReducedMotion(rules) {
    const mediaRule = { type: "", condition: "prefers-reduced-motion: reduce", rules: this.rulesToCSSRules(rules) };
    this.mediaRules.push(mediaRule);
    return mediaRule;
  }
  // @container - Container Queries
  container(condition, rules, name) {
    const containerRule = { name, condition, rules: this.rulesToCSSRules(rules) };
    this.containerRules.push(containerRule);
    return containerRule;
  }
  addContainer(name, styles2) {
    const containerStyles = { ...styles2, containerName: name };
    return this.addClass(name, containerStyles);
  }
  // @supports - Feature Queries
  supports(condition, rules) {
    const supportsRule = { condition, rules: this.rulesToCSSRules(rules) };
    this.supportsRules.push(supportsRule);
    return supportsRule;
  }
  // @layer - Cascade Layers
  layerOrder(...layers) {
    this._layerOrder = layers;
  }
  layer(name, rules) {
    const layerRule = { name, rules: this.rulesToCSSRules(rules) };
    this.layerRules.push(layerRule);
    return layerRule;
  }
  // Custom Rules
  add(rules) {
    const cssRules = Object.entries(rules).map(([selector, styles2]) => {
      const rule = { selector, styles: styles2, type: "custom" };
      this.rules.push(rule);
      return rule;
    });
    return cssRules;
  }
  important(value) {
    return `${value} !important`;
  }
  getVariables() {
    return Object.fromEntries(this.variables.map((variable) => [variable.name, variable.value]));
  }
  resolveVariableReferences(value, variables) {
    let resolved = value;
    for (let index = 0; index < 8; index++) {
      let replaced = false;
      resolved = resolved.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^\)]+))?\)/g, (match, name, fallback) => {
        const variableValue = variables[name];
        if (variableValue !== void 0) {
          replaced = true;
          return variableValue;
        }
        if (fallback !== void 0) {
          replaced = true;
          return fallback.trim();
        }
        return match;
      });
      if (!replaced) {
        break;
      }
    }
    return resolved.replace(/\s*!important\s*$/i, "").trim();
  }
  normalizeTarget(target) {
    return {
      tagName: typeof target.tagName === "string" && target.tagName.trim() ? target.tagName.trim().toLowerCase() : void 0,
      classNames: Array.isArray(target.classNames) ? target.classNames.map((className) => className.trim()).filter(Boolean) : [],
      attributes: target.attributes ? Object.fromEntries(
        Object.entries(target.attributes).filter(([, value]) => value !== void 0 && value !== null && value !== false).map(([name, value]) => [name.toLowerCase(), String(value)])
      ) : {},
      pseudoStates: Array.isArray(target.pseudoStates) ? [...new Set(target.pseudoStates.map((pseudoState) => pseudoState.trim().toLowerCase()).filter(Boolean))] : []
    };
  }
  parseSimpleSelectorToken(token) {
    const trimmed = token.trim();
    if (!trimmed || /[#~*&]/.test(trimmed)) {
      return void 0;
    }
    let cursor = 0;
    let tagName;
    const classNames = [];
    const attributes = [];
    const pseudoClasses = [];
    const tagMatch = trimmed.slice(cursor).match(/^([_a-zA-Z][-_a-zA-Z0-9]*)/);
    if (tagMatch) {
      tagName = tagMatch[1].toLowerCase();
      cursor += tagMatch[0].length;
    }
    while (cursor < trimmed.length) {
      const char = trimmed[cursor];
      if (char === ".") {
        const classMatch = trimmed.slice(cursor).match(/^\.([_a-zA-Z][-_a-zA-Z0-9]*)/);
        if (!classMatch) {
          return void 0;
        }
        classNames.push(classMatch[1]);
        cursor += classMatch[0].length;
        continue;
      }
      if (char === "[") {
        const endIndex = trimmed.indexOf("]", cursor + 1);
        if (endIndex === -1) {
          return void 0;
        }
        const rawAttribute = trimmed.slice(cursor + 1, endIndex).trim();
        const attrMatch = rawAttribute.match(/^([_a-zA-Z][-_a-zA-Z0-9]*)(?:\s*(=|~=|\^=|\$=|\*=)\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?$/);
        if (!attrMatch) {
          return void 0;
        }
        attributes.push({
          name: attrMatch[1].toLowerCase(),
          operator: attrMatch[2],
          value: attrMatch[3] ?? attrMatch[4] ?? attrMatch[5]
        });
        cursor = endIndex + 1;
        continue;
      }
      if (char === ":") {
        if (trimmed[cursor + 1] === ":") {
          return void 0;
        }
        const pseudoMatch = trimmed.slice(cursor).match(/^:([_a-zA-Z][-_a-zA-Z0-9]*)/);
        if (!pseudoMatch) {
          return void 0;
        }
        pseudoClasses.push(pseudoMatch[1].toLowerCase());
        cursor += pseudoMatch[0].length;
        continue;
      }
      return void 0;
    }
    if (!tagName && classNames.length === 0 && attributes.length === 0 && pseudoClasses.length === 0) {
      return void 0;
    }
    return { tagName, classNames, attributes, pseudoClasses };
  }
  extractSupportedSelectorChains(selector) {
    return selector.split(",").map((segment) => segment.trim()).map((segment) => {
      const chain = [];
      let token = "";
      let combinator = "descendant";
      let invalid = false;
      const flushToken = () => {
        const trimmedToken = token.trim();
        token = "";
        if (!trimmedToken || invalid) {
          return;
        }
        const parsed = this.parseSimpleSelectorToken(trimmedToken);
        if (!parsed) {
          invalid = true;
          return;
        }
        if (chain.length > 0) {
          parsed.combinator = combinator;
        }
        chain.push(parsed);
        combinator = "descendant";
      };
      for (let index = 0; index < segment.length; index++) {
        const char = segment[index];
        if (char === ">") {
          flushToken();
          if (invalid) break;
          combinator = "child";
          continue;
        }
        if (/\s/.test(char)) {
          flushToken();
          if (invalid) break;
          if (combinator !== "child") {
            combinator = "descendant";
          }
          continue;
        }
        token += char;
      }
      flushToken();
      if (invalid || chain.length === 0) {
        return void 0;
      }
      return chain.some((part) => Boolean(part.tagName) || part.classNames.length > 0 || part.attributes.length > 0 || part.pseudoClasses.length > 0) ? chain : void 0;
    }).filter((segment) => Array.isArray(segment) && segment.length > 0);
  }
  matchesAttributeSelector(targetValue, selector) {
    if (selector.operator === void 0) {
      return targetValue !== void 0;
    }
    if (targetValue === void 0 || selector.value === void 0) {
      return false;
    }
    switch (selector.operator) {
      case "=":
        return targetValue === selector.value;
      case "~=":
        return targetValue.split(/\s+/).includes(selector.value);
      case "^=":
        return targetValue.startsWith(selector.value);
      case "$=":
        return targetValue.endsWith(selector.value);
      case "*=":
        return targetValue.includes(selector.value);
      default:
        return false;
    }
  }
  matchesSelectorPart(target, selector) {
    if (selector.tagName && target.tagName !== selector.tagName) {
      return false;
    }
    const classSet = new Set(target.classNames ?? []);
    if (!selector.classNames.every((className) => classSet.has(className))) {
      return false;
    }
    const attributes = target.attributes;
    if (!selector.attributes.every((attribute) => this.matchesAttributeSelector(attributes?.[attribute.name], attribute))) {
      return false;
    }
    return selector.pseudoClasses.every((pseudoClass) => this.matchesPseudoClass(target, pseudoClass));
  }
  matchesPseudoClass(target, pseudoClass) {
    const normalized = pseudoClass.trim().toLowerCase();
    const pseudoStates = new Set(target.pseudoStates ?? []);
    if (pseudoStates.has(normalized)) {
      return true;
    }
    const attributes = target.attributes;
    switch (normalized) {
      case "checked":
        return attributes?.checked !== void 0 && attributes.checked !== "false";
      case "disabled":
        return attributes?.disabled !== void 0 && attributes.disabled !== "false";
      case "selected":
        return attributes?.selected !== void 0 && attributes.selected !== "false" || attributes?.["aria-current"] !== void 0;
      default:
        return false;
    }
  }
  matchesSelectorChain(target, ancestors, chain) {
    if (!this.matchesSelectorPart(target, chain[chain.length - 1])) {
      return false;
    }
    let ancestorIndex = ancestors.length - 1;
    for (let chainIndex = chain.length - 1; chainIndex > 0; chainIndex--) {
      const selector = chain[chainIndex - 1];
      const combinator = chain[chainIndex].combinator ?? "descendant";
      if (combinator === "child") {
        if (ancestorIndex < 0 || !this.matchesSelectorPart(ancestors[ancestorIndex], selector)) {
          return false;
        }
        ancestorIndex -= 1;
        continue;
      }
      let matchedIndex = -1;
      for (let index = ancestorIndex; index >= 0; index--) {
        if (this.matchesSelectorPart(ancestors[index], selector)) {
          matchedIndex = index;
          break;
        }
      }
      if (matchedIndex < 0) {
        return false;
      }
      ancestorIndex = matchedIndex - 1;
    }
    return true;
  }
  parseMediaLength(value) {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/i);
    if (!match) {
      return void 0;
    }
    const numericValue = Number(match[1]);
    const unit = (match[2] ?? "px").toLowerCase();
    if (unit === "rem" || unit === "em") {
      return numericValue * 16;
    }
    return numericValue;
  }
  matchesMediaCondition(condition, options) {
    const normalized = condition.trim().replace(/^\(+|\)+$/g, "").trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    if (normalized.startsWith("min-width:")) {
      const minWidth = this.parseMediaLength(normalized.slice("min-width:".length));
      return minWidth !== void 0 && options.viewportWidth !== void 0 && options.viewportWidth >= minWidth;
    }
    if (normalized.startsWith("max-width:")) {
      const maxWidth = this.parseMediaLength(normalized.slice("max-width:".length));
      return maxWidth !== void 0 && options.viewportWidth !== void 0 && options.viewportWidth <= maxWidth;
    }
    if (normalized === "prefers-color-scheme: dark") {
      return options.colorScheme === "dark";
    }
    if (normalized === "prefers-color-scheme: light") {
      return (options.colorScheme ?? "light") === "light";
    }
    if (normalized === "prefers-reduced-motion: reduce") {
      return options.reducedMotion === true;
    }
    return false;
  }
  matchesMediaRule(rule, options) {
    const mediaType = options.mediaType ?? "screen";
    if (rule.type && rule.type !== mediaType && rule.type !== "all") {
      return false;
    }
    if (!rule.condition.trim()) {
      return true;
    }
    return rule.condition.split(/\band\b/i).map((part) => part.trim()).filter(Boolean).every((part) => this.matchesMediaCondition(part, options));
  }
  resolveNativeStyles(target, ancestors = [], options = {}) {
    const normalizedTarget = this.normalizeTarget(target);
    if (!normalizedTarget.tagName && (!normalizedTarget.classNames || normalizedTarget.classNames.length === 0)) {
      return {};
    }
    const normalizedAncestors = ancestors.map((ancestor) => this.normalizeTarget(ancestor));
    const variables = this.getVariables();
    const resolved = {};
    const applyRules = (rules) => {
      for (const rule of rules) {
        const selectorChains = this.extractSupportedSelectorChains(rule.selector);
        if (selectorChains.length === 0) {
          continue;
        }
        const matches = selectorChains.some((selectorChain) => this.matchesSelectorChain(normalizedTarget, normalizedAncestors, selectorChain));
        if (!matches) {
          continue;
        }
        for (const [property, value] of Object.entries(rule.styles)) {
          resolved[property] = typeof value === "string" ? this.resolveVariableReferences(value, variables) : value;
        }
      }
    };
    applyRules(this.rules);
    for (const mediaRule of this.mediaRules) {
      if (this.matchesMediaRule(mediaRule, options)) {
        applyRules(mediaRule.rules);
      }
    }
    return resolved;
  }
  resolveClassStyles(classNames) {
    return this.resolveNativeStyles({ classNames });
  }
  // Utility Methods
  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  // Helper: Create and add rule (eliminates duplication in combinator selectors)
  createAndAddRule(selector, styles2, type = "custom") {
    const rule = { selector, styles: styles2, type };
    this.rules.push(rule);
    return rule;
  }
  // Helper: Convert rules object to CSSRule array (eliminates duplication in media/container/supports/layer)
  rulesToCSSRules(rules) {
    return Object.entries(rules).map(([selector, styles2]) => ({
      selector,
      styles: styles2,
      type: "custom"
    }));
  }
  // Helper: Render rules with indentation (eliminates duplication in render methods)
  renderRulesWithIndent(rules, indent = "    ") {
    return rules.map((rule) => this.renderRule(rule, indent)).join("\n");
  }
  stylesToString(styles2, indent = "    ") {
    return Object.entries(styles2).map(([prop, value]) => {
      const cssValue = typeof value === "object" && value !== null && "name" in value ? `var(${value.name})` : value;
      return `${indent}${this.toKebabCase(prop)}: ${cssValue};`;
    }).join("\n");
  }
  renderRule(rule, indent = "") {
    let css = `${indent}${rule.selector} {
${this.stylesToString(rule.styles, indent + "    ")}
`;
    if (rule.nested && rule.nested.length > 0) {
      for (const nestedRule of rule.nested) {
        const nestedSelector = nestedRule.selector.startsWith("&") ? nestedRule.selector.replace(/&/g, rule.selector) : `${rule.selector} ${nestedRule.selector}`;
        css += `
${indent}${nestedSelector} {
${this.stylesToString(nestedRule.styles, indent + "    ")}
${indent}}
`;
      }
    }
    css += `${indent}}`;
    return css;
  }
  renderMediaRule(media) {
    const condition = media.type && media.condition ? `${media.type} and (${media.condition})` : media.type ? media.type : `(${media.condition})`;
    return `@media ${condition} {
${this.renderRulesWithIndent(media.rules)}
}`;
  }
  renderKeyframes(kf) {
    let css = `@keyframes ${kf.name} {
`;
    for (const step of kf.steps) {
      css += `    ${step.step} {
${this.stylesToString(step.styles, "        ")}
    }
`;
    }
    css += "}";
    return css;
  }
  renderFontFace(ff) {
    let css = "@font-face {\n";
    css += `    font-family: "${ff.fontFamily}";
`;
    css += `    src: ${ff.src};
`;
    if (ff.fontWeight) css += `    font-weight: ${ff.fontWeight};
`;
    if (ff.fontStyle) css += `    font-style: ${ff.fontStyle};
`;
    if (ff.fontDisplay) css += `    font-display: ${ff.fontDisplay};
`;
    if (ff.unicodeRange) css += `    unicode-range: ${ff.unicodeRange};
`;
    css += "}";
    return css;
  }
  renderContainerRule(container2) {
    const nameStr = container2.name ? `${container2.name} ` : "";
    return `@container ${nameStr}(${container2.condition}) {
${this.renderRulesWithIndent(container2.rules)}
}`;
  }
  renderSupportsRule(supports) {
    return `@supports (${supports.condition}) {
${this.renderRulesWithIndent(supports.rules)}
}`;
  }
  renderLayerRule(layer2) {
    return `@layer ${layer2.name} {
${this.renderRulesWithIndent(layer2.rules)}
}`;
  }
  // Render Output
  render(...additionalRules) {
    const parts = [];
    if (this.imports.length > 0) {
      parts.push(this.imports.join("\n"));
    }
    if (this._layerOrder.length > 0) {
      parts.push(`@layer ${this._layerOrder.join(", ")};`);
    }
    if (this.variables.length > 0) {
      const varDeclarations = this.variables.map((v) => `    ${v.name}: ${v.value};`).join("\n");
      parts.push(`:root {
${varDeclarations}
}`);
    }
    for (const ff of this.fontFaces) {
      parts.push(this.renderFontFace(ff));
    }
    for (const kf of this.keyframes) {
      parts.push(this.renderKeyframes(kf));
    }
    const allRules = [...this.rules];
    const allMediaRules = [...this.mediaRules];
    const allKeyframes = [];
    const allContainerRules = [...this.containerRules];
    const allSupportsRules = [...this.supportsRules];
    const allLayerRules = [...this.layerRules];
    for (const item of additionalRules) {
      if (!item) continue;
      if (Array.isArray(item)) {
        allRules.push(...item);
      } else if ("condition" in item && "rules" in item && !("name" in item && "steps" in item)) {
        if ("type" in item) {
          allMediaRules.push(item);
        } else if ("name" in item && typeof item.name === "string") {
          allContainerRules.push(item);
        } else {
          allSupportsRules.push(item);
        }
      } else if ("name" in item && "steps" in item) {
        allKeyframes.push(item);
      } else if ("name" in item && "rules" in item) {
        allLayerRules.push(item);
      } else {
        allRules.push(item);
      }
    }
    for (const kf of allKeyframes) {
      parts.push(this.renderKeyframes(kf));
    }
    for (const layer2 of allLayerRules) {
      parts.push(this.renderLayerRule(layer2));
    }
    for (const rule of allRules) {
      parts.push(this.renderRule(rule));
    }
    for (const supports of allSupportsRules) {
      parts.push(this.renderSupportsRule(supports));
    }
    for (const container2 of allContainerRules) {
      parts.push(this.renderContainerRule(container2));
    }
    for (const media of allMediaRules) {
      parts.push(this.renderMediaRule(media));
    }
    return parts.join("\n\n");
  }
  inject(styleId) {
    const css = this.render();
    const style2 = document.createElement("style");
    if (styleId) style2.id = styleId;
    style2.textContent = css;
    document.head.appendChild(style2);
    return style2;
  }
  clear() {
    this.variables.length = 0;
    this.rules.length = 0;
    this.mediaRules.length = 0;
    this.keyframes.length = 0;
    this.fontFaces.length = 0;
    this.imports.length = 0;
    this.containerRules.length = 0;
    this.supportsRules.length = 0;
    this.layerRules.length = 0;
    this._layerOrder.length = 0;
  }
};
var styles = new CreateStyle(getSharedStyleStore());
var {
  addVar,
  var: getVar,
  addTag,
  addClass,
  addId,
  addPseudoClass,
  addPseudoElement,
  addAttribute,
  attrEquals,
  attrContainsWord,
  attrStartsWith,
  attrEndsWith,
  attrContains,
  descendant,
  child: childStyle,
  adjacentSibling,
  generalSibling,
  multiple: multipleStyle,
  addName,
  nesting,
  keyframe,
  keyframeFromTo,
  fontFace,
  import: importStyle,
  media: mediaStyle,
  mediaScreen,
  mediaPrint,
  mediaMinWidth,
  mediaMaxWidth,
  mediaDark,
  mediaLight,
  mediaReducedMotion,
  container,
  addContainer,
  supports: supportsStyle,
  layerOrder,
  layer,
  add: addStyle,
  important,
  getVariables: getStyleVariables,
  resolveClassStyles,
  render: renderStyle,
  inject: injectStyle,
  clear: clearStyle
} = styles;
var style_default = styles;

// web-styles.ts
var paper = style_default.addVar("paper", "#f8f0e4");
var ink = style_default.addVar("ink", "#261914");
var ember = style_default.addVar("ember", "#d56e43");
var clay = style_default.addVar("clay", "#b75a36");
var line = style_default.addVar("line", "rgba(38, 25, 20, 0.12)");
style_default.addTag("*", {
  boxSizing: "border-box",
  margin: 0,
  padding: 0
});
style_default.addTag("body", {
  fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
  background: "linear-gradient(180deg, #f7e7d2 0%, #f0d7ba 100%)",
  color: ink.toString(),
  minHeight: "100vh"
});
style_default.addClass("page", {
  background: "linear-gradient(180deg, #f7e7d2 0%, #f0d7ba 100%)",
  minHeight: "100vh",
  padding: "40px 24px 80px"
});
style_default.addClass("shell", {
  maxWidth: "1080px",
  margin: "0 auto",
  display: "grid",
  gap: "20px"
});
style_default.addClass("hero", {
  width: "100%",
  padding: "32px",
  borderRadius: "28px",
  background: "rgba(255, 252, 247, 0.82)",
  border: `1px solid ${line.toString()}`,
  boxShadow: "0 24px 80px rgba(102, 61, 35, 0.12)",
  backdropFilter: "blur(18px)"
});
style_default.addClass("hero-layout", {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "20px"
});
style_default.addClass("hero-copy", {
  display: "grid",
  gap: "12px",
  flex: 1
});
style_default.addClass("hero-mark", {
  width: "84px",
  height: "84px",
  borderRadius: "22px",
  flexShrink: 0,
  boxShadow: "0 18px 48px rgba(102, 61, 35, 0.18)"
});
style_default.addClass("hero-badge", {
  width: "84px",
  height: "84px",
  borderRadius: "22px",
  flexShrink: 0,
  boxShadow: "0 18px 48px rgba(102, 61, 35, 0.18)",
  background: "linear-gradient(135deg, #171312 0%, #261f1c 100%)",
  border: `1px solid ${line.toString()}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
});
style_default.addClass("hero-badge-mark", {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: 1,
  letterSpacing: "0.02em",
  color: "#f1c27d"
});
style_default.addTag("h1", {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "clamp(2.4rem, 5vw, 4.4rem)",
  lineHeight: 1,
  marginBottom: "16px",
  color: ink.toString()
});
style_default.addTag("h2", {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "1.45rem",
  marginBottom: "14px",
  color: ink.toString()
});
style_default.addTag("p", {
  lineHeight: 1.7
});
style_default.child(".panel", "h2", {
  color: ink.toString(),
  fontSize: "23px",
  fontWeight: 700
});
style_default.child(".field-label", "span", {
  color: ink.toString(),
  fontWeight: 700
});
style_default.addClass("lede", {
  maxWidth: "720px",
  fontSize: "1.05rem",
  color: "#5d4335"
});
style_default.addClass("surface-grid", {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px"
});
style_default.addClass("surface-card", {
  width: "100%",
  padding: "20px",
  borderRadius: "22px",
  background: paper.toString(),
  border: `1px solid ${line.toString()}`
});
style_default.addClass("surface-id", {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(213, 110, 67, 0.12)",
  color: ember.toString(),
  marginBottom: "10px",
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
});
style_default.addClass("panel-grid", {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "20px"
});
style_default.addClass("panel", {
  width: "100%",
  padding: "24px",
  borderRadius: "24px",
  background: "rgba(255, 249, 241, 0.92)",
  border: `1px solid ${line.toString()}`
});
style_default.addClass("meta-list", {
  listStyle: "none",
  display: "grid",
  gap: "10px"
});
style_default.addClass("meta-item", {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "16px",
  background: "#fff",
  border: `1px solid ${line.toString()}`
});
style_default.addClass("form-grid", {
  width: "100%",
  display: "grid",
  gap: "14px"
});
style_default.addClass("field-label", {
  width: "100%",
  display: "grid",
  gap: "6px",
  fontWeight: 700,
  color: ink.toString()
});
style_default.multiple(["input", "textarea"], {
  width: "100%",
  borderRadius: "16px",
  border: `1px solid ${line.toString()}`,
  background: "#fff",
  padding: "14px 16px",
  color: ink.toString(),
  font: "inherit"
});
style_default.addClass("toggle-row", {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#5d4335"
});
style_default.addClass("button-row", {
  width: "100%",
  display: "flex",
  flexWrap: "wrap",
  gap: "12px"
});
style_default.addClass("btn", {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  font: "inherit",
  lineHeight: 1.2,
  textDecoration: "none"
});
style_default.addClass("btn-primary", {
  background: `linear-gradient(135deg, ${ember.toString()} 0%, ${clay.toString()} 100%)`,
  color: "#fff6ee"
});
style_default.addClass("btn-secondary", {
  background: "#fff",
  color: ink.toString(),
  border: `1px solid ${line.toString()}`
});
style_default.addPseudoClass("hover", {
  transform: "translateY(-1px)",
  boxShadow: "0 10px 28px rgba(102, 61, 35, 0.15)"
}, ".btn");
style_default.addClass("status", {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(213, 110, 67, 0.1)",
  color: "#6a412d"
});
style_default.child(".toggle-row", 'input[type="checkbox"]', {
  width: "20px",
  minWidth: "20px",
  height: "20px",
  padding: 0
});
style_default.addClass("link", {
  color: clay.toString(),
  fontWeight: 700,
  textDecoration: "none"
});
style_default.addPseudoClass("hover", {
  textDecoration: "underline"
}, ".link");
style_default.mediaMaxWidth(800, {
  ".panel-grid": {
    gridTemplateColumns: "1fr"
  },
  ".page": {
    padding: "20px 16px 48px"
  },
  ".hero": {
    padding: "24px"
  },
  ".hero-layout": {
    flexDirection: "column",
    alignItems: "flex-start"
  },
  ".hero-mark": {
    width: "72px",
    height: "72px"
  },
  ".hero-badge": {
    width: "72px",
    height: "72px"
  },
  ".hero-badge-mark": {
    fontSize: "24px"
  }
});
style_default.addClass("hero-layout-native", {
  flexDirection: "row",
  alignItems: "center"
});
style_default.mediaMaxWidth(800, {
  ".hero-layout-native": {
    flexDirection: "row",
    alignItems: "center"
  },
  ".hero-layout-native .hero-badge": {
    width: "84px",
    height: "84px"
  },
  ".hero-layout-native .hero-badge-mark": {
    fontSize: "28px"
  },
  ".page-native": {
    padding: "40px 24px 80px"
  },
  ".hero-native": {
    padding: "32px"
  },
  ".panel-grid-native": {
    gridTemplateColumns: "1fr 1fr",
    gap: "16px"
  }
});
var UNIVERSAL_APP_STYLE_ID = "universal-app-styles";
var universalAppCss = style_default.render();
if (typeof document !== "undefined" && !document.getElementById(UNIVERSAL_APP_STYLE_ID)) {
  style_default.inject(UNIVERSAL_APP_STYLE_ID);
}

// universal-components.ts
var surfacePalette = {
  ink: "#261914",
  bodyCopy: "#5d4335",
  line: "rgba(38, 25, 20, 0.12)"
};
var sharedStyles = {
  heroTitle: {
    color: surfacePalette.ink,
    fontSize: "38px",
    fontWeight: "700"
  },
  bodyCopy: {
    color: surfacePalette.bodyCopy
  },
  inputField: {
    width: "100%",
    background: "#fff",
    borderRadius: "16px",
    border: `1px solid ${surfacePalette.line}`,
    color: surfacePalette.ink
  }
};
function mergeClassName(baseClassName, extraClassName) {
  const normalizedExtraClassName = typeof extraClassName === "string" ? extraClassName.trim() : "";
  return normalizedExtraClassName ? `${baseClassName} ${normalizedExtraClassName}` : baseClassName;
}
function createHeroBadge() {
  return div(
    {
      className: "hero-badge",
      role: "img",
      "aria-label": `${APP_NAME} icon`
    },
    span({ className: "hero-badge-mark" }, "EU")
  );
}
function createStatusCard(content) {
  return div({ className: "status" }, span(content));
}
function renderAction(action) {
  const bridgeOptions = {
    action: action.action,
    route: action.route,
    payload: action.payload,
    desktopMessage: action.desktopMessage
  };
  const props = mergeUniversalProps(
    action.href ? createUniversalLinkProps(action.href, bridgeOptions) : createUniversalBridgeProps(bridgeOptions),
    {
      className: action.className ?? "btn btn-secondary"
    }
  );
  if (action.onClick) {
    props.onClick = action.onClick;
  }
  if (action.href) {
    props.href = action.href;
    if (action.target) props.target = action.target;
    if (action.rel) props.rel = action.rel;
    return a(props, action.label);
  }
  props.type = "button";
  return button(props, action.label);
}
function createHero(options) {
  const heroMedia = [];
  if (options.iconChild !== void 0) {
    heroMedia.push(options.iconChild);
  } else if (options.iconSrc) {
    heroMedia.push(img({ className: "hero-mark", src: options.iconSrc, alt: options.iconAlt ?? `${APP_NAME} icon` }));
  }
  const heroLayoutProps = {
    ...options.heroLayoutProps ?? {}
  };
  const existingHeroLayoutClassName = typeof heroLayoutProps.className === "string" ? heroLayoutProps.className.trim() : "";
  heroLayoutProps.className = existingHeroLayoutClassName ? `hero-layout ${existingHeroLayoutClassName}` : "hero-layout";
  return section(
    { className: mergeClassName("hero", options.heroClassName) },
    div(
      heroLayoutProps,
      ...heroMedia,
      div(
        { className: "hero-copy" },
        h1({ style: sharedStyles.heroTitle }, APP_NAME),
        p({ className: "lede" }, APP_TAGLINE),
        div(
          { className: "button-row" },
          ...options.heroActions.map(renderAction)
        )
      )
    )
  );
}
function createSurfacePanel(title2) {
  return section(
    { className: "panel" },
    h2(title2),
    div(
      { className: "surface-grid" },
      ...PLATFORM_SURFACES.map((surface) => article(
        { className: "surface-card" },
        span({ className: "surface-id" }, surface.id),
        h2(surface.title),
        p({ style: sharedStyles.bodyCopy }, surface.description)
      ))
    )
  );
}
function createFormPanel(options) {
  const questionInputProps = {
    style: sharedStyles.inputField,
    value: options.questionValue,
    placeholder: options.questionPlaceholder ?? options.questionLabel,
    onInput: options.onQuestionInput,
    ...options.questionInputProps
  };
  const noteInputProps = {
    style: sharedStyles.inputField,
    value: options.noteValue,
    placeholder: options.notePlaceholder ?? options.noteLabel,
    onInput: options.onNoteInput,
    ...options.noteInputProps
  };
  const toggleInputProps = {
    type: "checkbox",
    checked: options.nativeEnabled,
    onInput: options.onToggleInput,
    ...options.toggleInputProps
  };
  return section(
    { className: "panel" },
    h2(options.title ?? "Shared validation form"),
    div(
      { className: "form-grid" },
      div(
        { className: "field-label" },
        span(options.questionLabel),
        input(questionInputProps)
      ),
      div(
        { className: "field-label" },
        span(options.noteLabel),
        textarea(noteInputProps)
      ),
      div(
        { className: "toggle-row" },
        input(toggleInputProps),
        span({ style: sharedStyles.bodyCopy }, options.toggleLabel)
      ),
      ...options.statusItems ?? []
    )
  );
}
function createChecklistPanel(title2, items) {
  return section(
    { className: "panel" },
    h2(title2),
    ul(
      { className: "meta-list" },
      ...items.map((item) => li({ className: "meta-item" }, item))
    )
  );
}
function createUniversalShell(options) {
  const checklistItems = options.checklistItems ?? [...VALIDATION_STEPS, ...SHARED_CHECKLIST];
  return main(
    { className: mergeClassName("page", options.pageClassName) },
    div(
      { className: "shell" },
      createHero(options),
      createSurfacePanel(options.surfaceTitle ?? "Platform surfaces"),
      div(
        { className: mergeClassName("panel-grid", options.panelGridClassName) },
        createFormPanel(options.form),
        createChecklistPanel(options.checklistTitle ?? "Repo smoke checklist", checklistItems)
      )
    )
  );
}

// native-screen.ts
var screen = () => {
  const state = createUniversalExampleState();
  return createUniversalShell({
    iconChild: createHeroBadge(),
    pageClassName: "page-native",
    heroClassName: "hero-native",
    heroLayoutProps: {
      className: "hero-layout-native"
    },
    panelGridClassName: "panel-grid-native",
    heroActions: [
      {
        label: UNIVERSAL_PRIMARY_ACTION_LABEL,
        className: "btn btn-primary",
        action: "validation.record",
        payload: {
          surface: "mobile",
          target: "android-compose"
        }
      },
      {
        label: "Open the Elit repository",
        className: "btn btn-secondary",
        href: APP_LINK
      }
    ],
    form: {
      title: UNIVERSAL_FORM_COPY.title,
      questionLabel: UNIVERSAL_FORM_COPY.questionLabel,
      questionPlaceholder: UNIVERSAL_FORM_COPY.questionPlaceholder,
      questionInputProps: bindValue(state.validationTarget),
      noteLabel: UNIVERSAL_FORM_COPY.noteLabel,
      notePlaceholder: UNIVERSAL_FORM_COPY.notePlaceholder,
      noteInputProps: bindValue(state.notes),
      toggleLabel: UNIVERSAL_FORM_COPY.toggleLabel,
      toggleInputProps: bindChecked(state.nativeEnabled),
      statusItems: createUniversalStatusMessages(state).map((message) => createStatusCard(message))
    }
  });
};
export {
  screen
};
