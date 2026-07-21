import { hasInjectionContext as se, inject as ie, effectScope as ae, ref as y, markRaw as z, toRaw as R, watch as ce, unref as G, createApp as le, defineComponent as pe, onMounted as ue, openBlock as k, createElementBlock as O, createElementVNode as m, createVNode as de, toDisplayString as N, createTextVNode as fe } from "vue";
import { addCollection as he, Icon as ge } from "@iconify/vue";
import { addIcons as me, hostCss as ve, loadCss as be, api as _e, define as ye } from "@wippy-fe/proxy";
var we = Object.defineProperty, xe = (e, t, r) => t in e ? we(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, u = (e, t, r) => xe(e, typeof t != "symbol" ? t + "" : t, r), Se = [
  "themeConfigUrl",
  "primeVueCssUrl",
  "markdownCssUrl",
  "iframeCssUrl"
];
function Ee(e, t) {
  const o = (t ?? Se).map(async (n) => {
    const s = ve[n];
    if (!s)
      return console.warn(`[wippy-fe/webcomponent-core] hostCss key "${n}" is undefined — skipping. Remove it from hostCssKeys if the CSS was removed.`), null;
    try {
      return await be(s);
    } catch (i) {
      return console.warn(`[wippy-fe/webcomponent-core] Failed to load hostCss "${n}" (${s}):`, i), null;
    }
  });
  return Promise.all(o).then((n) => {
    for (const s of n) {
      if (!s)
        continue;
      const i = document.createElement("style");
      i.textContent = s, i.setAttribute("role", "@wippy-fe/host-css"), e.appendChild(i);
    }
  });
}
function Ce(e, t) {
  const r = document.createElement("style");
  r.textContent = t, e.appendChild(r);
}
function B(e) {
  return e.__wippyHost ?? null;
}
function ke(e) {
  return e.replace(/-([a-z])/g, (t, r) => r.toUpperCase());
}
function Oe(e, t, r) {
  switch (r.type) {
    case "string":
      return { value: t };
    case "number": {
      const o = Number.parseFloat(t);
      return Number.isNaN(o) ? { value: void 0, error: `Invalid ${e}: expected a number` } : { value: o };
    }
    case "integer": {
      const o = Number.parseInt(t, 10);
      return Number.isNaN(o) ? { value: void 0, error: `Invalid ${e}: expected an integer` } : { value: o };
    }
    case "boolean":
      return { value: t !== "false" };
    case "array":
    case "object":
      try {
        const o = JSON.parse(t);
        return r.type === "array" && !Array.isArray(o) ? { value: void 0, error: `Invalid ${e}: expected a JSON array` } : { value: o };
      } catch {
        return { value: void 0, error: `Invalid ${e}: must be valid JSON` };
      }
    default:
      return { value: t };
  }
}
function V(e, t) {
  const r = {}, o = [];
  for (const [n, s] of Object.entries(t.properties)) {
    const i = e.getAttribute(n), a = ke(n);
    if (i === null) {
      s.default !== void 0 && (r[a] = s.default);
      continue;
    }
    const c = Oe(n, i, s);
    c.error ? o.push(c.error) : r[a] = c.value;
  }
  return { props: r, errors: o };
}
var Pe = class {
  constructor(e, t) {
    u(this, "_props"), u(this, "_errors"), u(this, "_content"), u(this, "_propsListeners", /* @__PURE__ */ new Set()), u(this, "_contentListeners", /* @__PURE__ */ new Set()), u(this, "_disposed", !1), u(this, "_emitToDom"), u(this, "props"), u(this, "events"), u(this, "content"), this._props = e.props, this._errors = e.errors, this._content = e.content, this._emitToDom = t;
    const r = this;
    this.props = {
      get value() {
        return r._props;
      },
      get errors() {
        return r._errors;
      },
      subscribe(o, n) {
        return r._subscribeProps(o, n);
      }
    }, this.events = {
      emit(o, n) {
        r._disposed || r._emitToDom(o, n);
      }
    }, this.content = e.hasContent ? {
      get value() {
        return r._content;
      },
      subscribe(o, n) {
        return r._subscribeContent(o, n);
      }
    } : null;
  }
  /** @internal */
  notifyProps(e, t) {
    if (!this._disposed) {
      this._props = e, this._errors = t;
      for (const r of this._propsListeners)
        r(e, t);
    }
  }
  /** @internal */
  notifyContent(e) {
    if (!this._disposed) {
      this._content = e;
      for (const t of this._contentListeners)
        t(e);
    }
  }
  /** @internal */
  dispose() {
    this._disposed || (this._disposed = !0, this._propsListeners.clear(), this._contentListeners.clear());
  }
  _subscribeProps(e, t) {
    if (this._disposed || t?.signal?.aborted)
      return () => {
      };
    this._propsListeners.add(e), t?.immediate && e(this._props, this._errors);
    const r = () => {
      this._propsListeners.delete(e), t?.signal?.removeEventListener("abort", r);
    };
    return t?.signal?.addEventListener("abort", r, { once: !0 }), r;
  }
  _subscribeContent(e, t) {
    if (this._disposed || t?.signal?.aborted)
      return () => {
      };
    this._contentListeners.add(e), t?.immediate && e(this._content);
    const r = () => {
      this._contentListeners.delete(e), t?.signal?.removeEventListener("abort", r);
    };
    return t?.signal?.addEventListener("abort", r, { once: !0 }), r;
  }
}, Ie = class extends HTMLElement {
  constructor() {
    super(), u(this, "_internals"), u(this, "_contentObserver", null), u(this, "_initialized", !1), u(this, "_container", null), u(this, "_reactive", null), u(this, "_lastProps", null), u(this, "_lastErrors", []), u(this, "_lastContent", null), this._internals = this.attachInternals();
  }
  /**
   * Override to provide the component's configuration.
   * Must be static because `observedAttributes` reads it before construction.
   *
   * Specify the generic to get typed `validateProps`:
   * ```ts
   * static get wippyConfig(): WippyElementConfig<MyProps> { ... }
   * ```
   */
  static get wippyConfig() {
    return { propsSchema: { properties: {} } };
  }
  /**
   * Derived from the props schema + any `extraObservedAttributes`.
   */
  static get observedAttributes() {
    const e = this.wippyConfig, t = Object.keys(e.propsSchema.properties), r = e.extraObservedAttributes ?? [];
    return [...t, ...r];
  }
  /**
   * Panel-scoped `host` wrapper attached by the managed-layout shell's
   * content resolvers (`ComponentResolver` / `WebComponentPackageLoader`).
   *
   * Inside a managed-layout panel, this is a wrapper around the universal
   * `host` API where context-aware calls (`layout.broadcast / send / on`)
   * are routed through the panel-bound bus — so `sourcePanelId` is
   * attributed correctly without postMessage indirection. Layout
   * mutations and other host methods pass through unchanged.
   *
   * `null` outside a managed-layout context (compat shell, chat sidebar,
   * standalone playground). Subclass code that needs a host in those
   * cases can fall back to `import { host } from '@wippy-fe/proxy'`.
   */
  get host() {
    return B(this);
  }
  /**
   * Emit a CustomEvent that bubbles and crosses shadow DOM boundaries.
   */
  emitEvent(e, t) {
    this.dispatchEvent(new CustomEvent(e, {
      bubbles: !0,
      composed: !0,
      detail: t
    }));
  }
  /**
   * Opt-in reactive adapter — framework-agnostic. Subscribe to prop
   * changes, content changes, or emit typed events from a non-Vue
   * consumer without re-rolling reactivity.
   *
   * ```ts
   * class MyEl extends WippyElement<{ count: number }, { tick: { n: number } }> {
   *   protected onMount() {
   *     const ctrl = new AbortController()
   *     this.reactive.props.subscribe(({ count }) => {
   *       this.shadowRoot!.querySelector('.n')!.textContent = String(count)
   *     }, { signal: ctrl.signal, immediate: true })
   *   }
   *   tick(n: number) { this.reactive.events.emit('tick', { n }) }
   * }
   * ```
   *
   * Allocation cost is zero unless this getter is touched. Disposed on
   * `disconnectedCallback`; a fresh adapter is allocated on the next
   * access after reconnect.
   */
  get reactive() {
    if (!this._reactive) {
      const e = this.constructor.wippyConfig, t = !!e.contentTemplate;
      let r, o;
      if (this._lastProps !== null)
        r = this._lastProps, o = this._lastErrors;
      else {
        const s = V(this, e.propsSchema);
        e.validateProps && s.errors.push(...e.validateProps(s.props)), r = s.props, o = s.errors, this._lastProps = r, this._lastErrors = o;
      }
      const n = t ? this._lastContent ?? this._extractContent(e.contentTemplate) : null;
      t && this._lastContent === null && (this._lastContent = n), this._reactive = new Pe(
        { props: r, errors: o, content: n, hasContent: t },
        this.emitEvent.bind(this)
      );
    }
    return this._reactive;
  }
  // ── Lifecycle ──────────────────────────────────────────────
  connectedCallback() {
    this._internals.states.add("loading");
    try {
      const e = this.constructor.wippyConfig, t = this._initialized, r = this.shadowRoot ?? this.attachShadow({ mode: e.shadowMode ?? "open" });
      let o;
      if (t)
        o = this._container;
      else {
        this.onInit(r), e.inlineCss && Ce(r, e.inlineCss), (e.hostCssKeys === void 0 || e.hostCssKeys.length > 0) && Ee(r, e.hostCssKeys), o = document.createElement("div");
        const c = e.containerClasses ?? [];
        c.length > 0 && o.classList.add(...c), r.appendChild(o), this._container = o, me(he);
      }
      const { props: n, errors: s } = V(this, e.propsSchema);
      e.validateProps && s.push(...e.validateProps(n));
      const i = n;
      this._lastProps = i, this._lastErrors = s;
      let a = null;
      e.contentTemplate && (a = this._extractContent(e.contentTemplate), this._lastContent = a, this._contentObserver = new MutationObserver(() => {
        const c = this._extractContent(e.contentTemplate);
        this._lastContent = c, this._reactive?.notifyContent(c), this.onContentChanged(c);
      }), this._contentObserver.observe(this, {
        childList: !0,
        characterData: !0,
        subtree: !0
      })), this.onMount(r, o, i, s, a, t), this._internals.states.delete("loading"), this._internals.states.add("ready"), t || (this._initialized = !0), this.onReady(), this.emitEvent("load");
    } catch (e) {
      this.onError(e), this._internals.states.delete("loading"), this._internals.states.add("error"), this.emitEvent("error", {
        message: e instanceof Error ? e.message : String(e),
        error: e
      });
    }
  }
  disconnectedCallback() {
    this._contentObserver && (this._contentObserver.disconnect(), this._contentObserver = null), this.onUnmount(), this.emitEvent("unload"), this._internals.states.clear(), this._reactive?.dispose(), this._reactive = null, this._lastProps = null, this._lastErrors = [], this._lastContent = null, delete this.__wippyHost, delete this.__wippyHostBus;
  }
  attributeChangedCallback(e, t, r) {
    if (t === r)
      return;
    const o = this.constructor.wippyConfig, { props: n, errors: s } = V(this, o.propsSchema);
    o.validateProps && s.push(...o.validateProps(n));
    const i = n;
    this._lastProps = i, this._lastErrors = s, this._reactive?.notifyProps(i, s), this.onPropsChanged(i, s);
  }
  // ── Hooks ──────────────────────────────────────────────────
  /** Called right after shadow DOM is attached, before CSS or container. */
  onInit(e) {
  }
  /** Called after internals state is set to ready, before the `load` event. */
  onReady() {
  }
  /** Called when connectedCallback throws. Default logs to console. */
  onError(e) {
    console.error(`${this.constructor.name} initialization failed:`, e);
  }
  /** Called when observed attributes change. Override to update framework state. */
  onPropsChanged(e, t) {
  }
  /**
   * Extract text from a child `<template data-type="...">` element.
   * Uses `.content.textContent` since `<template>` stores content in a DocumentFragment.
   */
  _extractContent(e) {
    return this.querySelector(`template[data-type="${e}"]`)?.content.textContent?.trim() ?? null;
  }
  /** Called when child `<template>` content changes. Override to update framework state. */
  onContentChanged(e) {
  }
};
function Te(e) {
  return e.__wippyHostBus ?? null;
}
function Ae(e) {
  return e.dataset.wippyPanelId ?? null;
}
function Re() {
  return J().__VUE_DEVTOOLS_GLOBAL_HOOK__;
}
function J() {
  return typeof navigator < "u" && typeof window < "u" ? window : typeof globalThis < "u" ? globalThis : {};
}
const $e = typeof Proxy == "function", Le = "devtools-plugin:setup", Ne = "plugin:settings:set";
let S, D;
function Ve() {
  var e;
  return S !== void 0 || (typeof window < "u" && window.performance ? (S = !0, D = window.performance) : typeof globalThis < "u" && (!((e = globalThis.perf_hooks) === null || e === void 0) && e.performance) ? (S = !0, D = globalThis.perf_hooks.performance) : S = !1), S;
}
function De() {
  return Ve() ? D.now() : Date.now();
}
class Ue {
  constructor(t, r) {
    this.target = null, this.targetQueue = [], this.onQueue = [], this.plugin = t, this.hook = r;
    const o = {};
    if (t.settings)
      for (const i in t.settings) {
        const a = t.settings[i];
        o[i] = a.defaultValue;
      }
    const n = `__vue-devtools-plugin-settings__${t.id}`;
    let s = Object.assign({}, o);
    try {
      const i = localStorage.getItem(n), a = JSON.parse(i);
      Object.assign(s, a);
    } catch {
    }
    this.fallbacks = {
      getSettings() {
        return s;
      },
      setSettings(i) {
        try {
          localStorage.setItem(n, JSON.stringify(i));
        } catch {
        }
        s = i;
      },
      now() {
        return De();
      }
    }, r && r.on(Ne, (i, a) => {
      i === this.plugin.id && this.fallbacks.setSettings(a);
    }), this.proxiedOn = new Proxy({}, {
      get: (i, a) => this.target ? this.target.on[a] : (...c) => {
        this.onQueue.push({
          method: a,
          args: c
        });
      }
    }), this.proxiedTarget = new Proxy({}, {
      get: (i, a) => this.target ? this.target[a] : a === "on" ? this.proxiedOn : Object.keys(this.fallbacks).includes(a) ? (...c) => (this.targetQueue.push({
        method: a,
        args: c,
        resolve: () => {
        }
      }), this.fallbacks[a](...c)) : (...c) => new Promise((l) => {
        this.targetQueue.push({
          method: a,
          args: c,
          resolve: l
        });
      })
    });
  }
  async setRealTarget(t) {
    this.target = t;
    for (const r of this.onQueue)
      this.target.on[r.method](...r.args);
    for (const r of this.targetQueue)
      r.resolve(await this.target[r.method](...r.args));
  }
}
function W(e, t) {
  const r = e, o = J(), n = Re(), s = $e && r.enableEarlyProxy;
  if (n && (o.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !s))
    n.emit(Le, e, t);
  else {
    const i = s ? new Ue(r, n) : null;
    (o.__VUE_DEVTOOLS_PLUGINS__ = o.__VUE_DEVTOOLS_PLUGINS__ || []).push({
      pluginDescriptor: r,
      setupFn: t,
      proxy: i
    }), i && t(i.proxiedTarget);
  }
}
/*!
 * pinia v2.3.1
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
let K;
const Q = (e) => K = e, je = () => se() && ie(Y) || K, Y = process.env.NODE_ENV !== "production" ? Symbol("pinia") : (
  /* istanbul ignore next */
  Symbol()
);
var w;
(function(e) {
  e.direct = "direct", e.patchObject = "patch object", e.patchFunction = "patch function";
})(w || (w = {}));
const U = typeof window < "u", M = typeof window == "object" && window.window === window ? window : typeof self == "object" && self.self === self ? self : typeof global == "object" && global.global === global ? global : typeof globalThis == "object" ? globalThis : { HTMLElement: null };
function He(e, { autoBom: t = !1 } = {}) {
  return t && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type) ? new Blob(["\uFEFF", e], { type: e.type }) : e;
}
function j(e, t, r) {
  const o = new XMLHttpRequest();
  o.open("GET", e), o.responseType = "blob", o.onload = function() {
    Z(o.response, t, r);
  }, o.onerror = function() {
    console.error("could not download file");
  }, o.send();
}
function q(e) {
  const t = new XMLHttpRequest();
  t.open("HEAD", e, !1);
  try {
    t.send();
  } catch {
  }
  return t.status >= 200 && t.status <= 299;
}
function P(e) {
  try {
    e.dispatchEvent(new MouseEvent("click"));
  } catch {
    const r = document.createEvent("MouseEvents");
    r.initMouseEvent("click", !0, !0, window, 0, 0, 0, 80, 20, !1, !1, !1, !1, 0, null), e.dispatchEvent(r);
  }
}
const I = typeof navigator == "object" ? navigator : { userAgent: "" }, X = /Macintosh/.test(I.userAgent) && /AppleWebKit/.test(I.userAgent) && !/Safari/.test(I.userAgent), Z = U ? (
  // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
  typeof HTMLAnchorElement < "u" && "download" in HTMLAnchorElement.prototype && !X ? Me : (
    // Use msSaveOrOpenBlob as a second approach
    "msSaveOrOpenBlob" in I ? Fe : (
      // Fallback to using FileReader and a popup
      ze
    )
  )
) : () => {
};
function Me(e, t = "download", r) {
  const o = document.createElement("a");
  o.download = t, o.rel = "noopener", typeof e == "string" ? (o.href = e, o.origin !== location.origin ? q(o.href) ? j(e, t, r) : (o.target = "_blank", P(o)) : P(o)) : (o.href = URL.createObjectURL(e), setTimeout(function() {
    URL.revokeObjectURL(o.href);
  }, 4e4), setTimeout(function() {
    P(o);
  }, 0));
}
function Fe(e, t = "download", r) {
  if (typeof e == "string")
    if (q(e))
      j(e, t, r);
    else {
      const o = document.createElement("a");
      o.href = e, o.target = "_blank", setTimeout(function() {
        P(o);
      });
    }
  else
    navigator.msSaveOrOpenBlob(He(e, r), t);
}
function ze(e, t, r, o) {
  if (o = o || open("", "_blank"), o && (o.document.title = o.document.body.innerText = "downloading..."), typeof e == "string")
    return j(e, t, r);
  const n = e.type === "application/octet-stream", s = /constructor/i.test(String(M.HTMLElement)) || "safari" in M, i = /CriOS\/[\d]+/.test(navigator.userAgent);
  if ((i || n && s || X) && typeof FileReader < "u") {
    const a = new FileReader();
    a.onloadend = function() {
      let c = a.result;
      if (typeof c != "string")
        throw o = null, new Error("Wrong reader.result type");
      c = i ? c : c.replace(/^data:[^;]*;/, "data:attachment/file;"), o ? o.location.href = c : location.assign(c), o = null;
    }, a.readAsDataURL(e);
  } else {
    const a = URL.createObjectURL(e);
    o ? o.location.assign(a) : location.href = a, o = null, setTimeout(function() {
      URL.revokeObjectURL(a);
    }, 4e4);
  }
}
function d(e, t) {
  const r = "🍍 " + e;
  typeof __VUE_DEVTOOLS_TOAST__ == "function" ? __VUE_DEVTOOLS_TOAST__(r, t) : t === "error" ? console.error(r) : t === "warn" ? console.warn(r) : console.log(r);
}
function H(e) {
  return "_a" in e && "install" in e;
}
function ee() {
  if (!("clipboard" in navigator))
    return d("Your browser doesn't support the Clipboard API", "error"), !0;
}
function te(e) {
  return e instanceof Error && e.message.toLowerCase().includes("document is not focused") ? (d('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn"), !0) : !1;
}
async function Ge(e) {
  if (!ee())
    try {
      await navigator.clipboard.writeText(JSON.stringify(e.state.value)), d("Global state copied to clipboard.");
    } catch (t) {
      if (te(t))
        return;
      d("Failed to serialize the state. Check the console for more details.", "error"), console.error(t);
    }
}
async function Be(e) {
  if (!ee())
    try {
      re(e, JSON.parse(await navigator.clipboard.readText())), d("Global state pasted from clipboard.");
    } catch (t) {
      if (te(t))
        return;
      d("Failed to deserialize the state from clipboard. Check the console for more details.", "error"), console.error(t);
    }
}
async function Je(e) {
  try {
    Z(new Blob([JSON.stringify(e.state.value)], {
      type: "text/plain;charset=utf-8"
    }), "pinia-state.json");
  } catch (t) {
    d("Failed to export the state as JSON. Check the console for more details.", "error"), console.error(t);
  }
}
let v;
function We() {
  v || (v = document.createElement("input"), v.type = "file", v.accept = ".json");
  function e() {
    return new Promise((t, r) => {
      v.onchange = async () => {
        const o = v.files;
        if (!o)
          return t(null);
        const n = o.item(0);
        return t(n ? { text: await n.text(), file: n } : null);
      }, v.oncancel = () => t(null), v.onerror = r, v.click();
    });
  }
  return e;
}
async function Ke(e) {
  try {
    const r = await We()();
    if (!r)
      return;
    const { text: o, file: n } = r;
    re(e, JSON.parse(o)), d(`Global state imported from "${n.name}".`);
  } catch (t) {
    d("Failed to import the state from JSON. Check the console for more details.", "error"), console.error(t);
  }
}
function re(e, t) {
  for (const r in t) {
    const o = e.state.value[r];
    o ? Object.assign(o, t[r]) : e.state.value[r] = t[r];
  }
}
function g(e) {
  return {
    _custom: {
      display: e
    }
  };
}
const oe = "🍍 Pinia (root)", T = "_root";
function Qe(e) {
  return H(e) ? {
    id: T,
    label: oe
  } : {
    id: e.$id,
    label: e.$id
  };
}
function Ye(e) {
  if (H(e)) {
    const r = Array.from(e._s.keys()), o = e._s;
    return {
      state: r.map((s) => ({
        editable: !0,
        key: s,
        value: e.state.value[s]
      })),
      getters: r.filter((s) => o.get(s)._getters).map((s) => {
        const i = o.get(s);
        return {
          editable: !1,
          key: s,
          value: i._getters.reduce((a, c) => (a[c] = i[c], a), {})
        };
      })
    };
  }
  const t = {
    state: Object.keys(e.$state).map((r) => ({
      editable: !0,
      key: r,
      value: e.$state[r]
    }))
  };
  return e._getters && e._getters.length && (t.getters = e._getters.map((r) => ({
    editable: !1,
    key: r,
    value: e[r]
  }))), e._customProperties.size && (t.customProperties = Array.from(e._customProperties).map((r) => ({
    editable: !0,
    key: r,
    value: e[r]
  }))), t;
}
function qe(e) {
  return e ? Array.isArray(e) ? e.reduce((t, r) => (t.keys.push(r.key), t.operations.push(r.type), t.oldValue[r.key] = r.oldValue, t.newValue[r.key] = r.newValue, t), {
    oldValue: {},
    keys: [],
    operations: [],
    newValue: {}
  }) : {
    operation: g(e.type),
    key: g(e.key),
    oldValue: e.oldValue,
    newValue: e.newValue
  } : {};
}
function Xe(e) {
  switch (e) {
    case w.direct:
      return "mutation";
    case w.patchFunction:
      return "$patch";
    case w.patchObject:
      return "$patch";
    default:
      return "unknown";
  }
}
let E = !0;
const A = [], _ = "pinia:mutations", h = "pinia", { assign: Ze } = Object, $ = (e) => "🍍 " + e;
function et(e, t) {
  W({
    id: "dev.esm.pinia",
    label: "Pinia 🍍",
    logo: "https://pinia.vuejs.org/logo.svg",
    packageName: "pinia",
    homepage: "https://pinia.vuejs.org",
    componentStateTypes: A,
    app: e
  }, (r) => {
    typeof r.now != "function" && d("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html."), r.addTimelineLayer({
      id: _,
      label: "Pinia 🍍",
      color: 15064968
    }), r.addInspector({
      id: h,
      label: "Pinia 🍍",
      icon: "storage",
      treeFilterPlaceholder: "Search stores",
      actions: [
        {
          icon: "content_copy",
          action: () => {
            Ge(t);
          },
          tooltip: "Serialize and copy the state"
        },
        {
          icon: "content_paste",
          action: async () => {
            await Be(t), r.sendInspectorTree(h), r.sendInspectorState(h);
          },
          tooltip: "Replace the state with the content of your clipboard"
        },
        {
          icon: "save",
          action: () => {
            Je(t);
          },
          tooltip: "Save the state as a JSON file"
        },
        {
          icon: "folder_open",
          action: async () => {
            await Ke(t), r.sendInspectorTree(h), r.sendInspectorState(h);
          },
          tooltip: "Import the state from a JSON file"
        }
      ],
      nodeActions: [
        {
          icon: "restore",
          tooltip: 'Reset the state (with "$reset")',
          action: (o) => {
            const n = t._s.get(o);
            n ? typeof n.$reset != "function" ? d(`Cannot reset "${o}" store because it doesn't have a "$reset" method implemented.`, "warn") : (n.$reset(), d(`Store "${o}" reset.`)) : d(`Cannot reset "${o}" store because it wasn't found.`, "warn");
          }
        }
      ]
    }), r.on.inspectComponent((o, n) => {
      const s = o.componentInstance && o.componentInstance.proxy;
      if (s && s._pStores) {
        const i = o.componentInstance.proxy._pStores;
        Object.values(i).forEach((a) => {
          o.instanceData.state.push({
            type: $(a.$id),
            key: "state",
            editable: !0,
            value: a._isOptionsAPI ? {
              _custom: {
                value: R(a.$state),
                actions: [
                  {
                    icon: "restore",
                    tooltip: "Reset the state of this store",
                    action: () => a.$reset()
                  }
                ]
              }
            } : (
              // NOTE: workaround to unwrap transferred refs
              Object.keys(a.$state).reduce((c, l) => (c[l] = a.$state[l], c), {})
            )
          }), a._getters && a._getters.length && o.instanceData.state.push({
            type: $(a.$id),
            key: "getters",
            editable: !1,
            value: a._getters.reduce((c, l) => {
              try {
                c[l] = a[l];
              } catch (f) {
                c[l] = f;
              }
              return c;
            }, {})
          });
        });
      }
    }), r.on.getInspectorTree((o) => {
      if (o.app === e && o.inspectorId === h) {
        let n = [t];
        n = n.concat(Array.from(t._s.values())), o.rootNodes = (o.filter ? n.filter((s) => "$id" in s ? s.$id.toLowerCase().includes(o.filter.toLowerCase()) : oe.toLowerCase().includes(o.filter.toLowerCase())) : n).map(Qe);
      }
    }), globalThis.$pinia = t, r.on.getInspectorState((o) => {
      if (o.app === e && o.inspectorId === h) {
        const n = o.nodeId === T ? t : t._s.get(o.nodeId);
        if (!n)
          return;
        n && (o.nodeId !== T && (globalThis.$store = R(n)), o.state = Ye(n));
      }
    }), r.on.editInspectorState((o, n) => {
      if (o.app === e && o.inspectorId === h) {
        const s = o.nodeId === T ? t : t._s.get(o.nodeId);
        if (!s)
          return d(`store "${o.nodeId}" not found`, "error");
        const { path: i } = o;
        H(s) ? i.unshift("state") : (i.length !== 1 || !s._customProperties.has(i[0]) || i[0] in s.$state) && i.unshift("$state"), E = !1, o.set(s, i, o.state.value), E = !0;
      }
    }), r.on.editComponentState((o) => {
      if (o.type.startsWith("🍍")) {
        const n = o.type.replace(/^🍍\s*/, ""), s = t._s.get(n);
        if (!s)
          return d(`store "${n}" not found`, "error");
        const { path: i } = o;
        if (i[0] !== "state")
          return d(`Invalid path for store "${n}":
${i}
Only state can be modified.`);
        i[0] = "$state", E = !1, o.set(s, i, o.state.value), E = !0;
      }
    });
  });
}
function tt(e, t) {
  A.includes($(t.$id)) || A.push($(t.$id)), W({
    id: "dev.esm.pinia",
    label: "Pinia 🍍",
    logo: "https://pinia.vuejs.org/logo.svg",
    packageName: "pinia",
    homepage: "https://pinia.vuejs.org",
    componentStateTypes: A,
    app: e,
    settings: {
      logStoreChanges: {
        label: "Notify about new/deleted stores",
        type: "boolean",
        defaultValue: !0
      }
      // useEmojis: {
      //   label: 'Use emojis in messages ⚡️',
      //   type: 'boolean',
      //   defaultValue: true,
      // },
    }
  }, (r) => {
    const o = typeof r.now == "function" ? r.now.bind(r) : Date.now;
    t.$onAction(({ after: i, onError: a, name: c, args: l }) => {
      const f = ne++;
      r.addTimelineEvent({
        layerId: _,
        event: {
          time: o(),
          title: "🛫 " + c,
          subtitle: "start",
          data: {
            store: g(t.$id),
            action: g(c),
            args: l
          },
          groupId: f
        }
      }), i((p) => {
        b = void 0, r.addTimelineEvent({
          layerId: _,
          event: {
            time: o(),
            title: "🛬 " + c,
            subtitle: "end",
            data: {
              store: g(t.$id),
              action: g(c),
              args: l,
              result: p
            },
            groupId: f
          }
        });
      }), a((p) => {
        b = void 0, r.addTimelineEvent({
          layerId: _,
          event: {
            time: o(),
            logType: "error",
            title: "💥 " + c,
            subtitle: "end",
            data: {
              store: g(t.$id),
              action: g(c),
              args: l,
              error: p
            },
            groupId: f
          }
        });
      });
    }, !0), t._customProperties.forEach((i) => {
      ce(() => G(t[i]), (a, c) => {
        r.notifyComponentUpdate(), r.sendInspectorState(h), E && r.addTimelineEvent({
          layerId: _,
          event: {
            time: o(),
            title: "Change",
            subtitle: i,
            data: {
              newValue: a,
              oldValue: c
            },
            groupId: b
          }
        });
      }, { deep: !0 });
    }), t.$subscribe(({ events: i, type: a }, c) => {
      if (r.notifyComponentUpdate(), r.sendInspectorState(h), !E)
        return;
      const l = {
        time: o(),
        title: Xe(a),
        data: Ze({ store: g(t.$id) }, qe(i)),
        groupId: b
      };
      a === w.patchFunction ? l.subtitle = "⤵️" : a === w.patchObject ? l.subtitle = "🧩" : i && !Array.isArray(i) && (l.subtitle = i.type), i && (l.data["rawEvent(s)"] = {
        _custom: {
          display: "DebuggerEvent",
          type: "object",
          tooltip: "raw DebuggerEvent[]",
          value: i
        }
      }), r.addTimelineEvent({
        layerId: _,
        event: l
      });
    }, { detached: !0, flush: "sync" });
    const n = t._hotUpdate;
    t._hotUpdate = z((i) => {
      n(i), r.addTimelineEvent({
        layerId: _,
        event: {
          time: o(),
          title: "🔥 " + t.$id,
          subtitle: "HMR update",
          data: {
            store: g(t.$id),
            info: g("HMR update")
          }
        }
      }), r.notifyComponentUpdate(), r.sendInspectorTree(h), r.sendInspectorState(h);
    });
    const { $dispose: s } = t;
    t.$dispose = () => {
      s(), r.notifyComponentUpdate(), r.sendInspectorTree(h), r.sendInspectorState(h), r.getSettings().logStoreChanges && d(`Disposed "${t.$id}" store 🗑`);
    }, r.notifyComponentUpdate(), r.sendInspectorTree(h), r.sendInspectorState(h), r.getSettings().logStoreChanges && d(`"${t.$id}" store installed 🆕`);
  });
}
let ne = 0, b;
function F(e, t, r) {
  const o = t.reduce((n, s) => (n[s] = R(e)[s], n), {});
  for (const n in o)
    e[n] = function() {
      const s = ne, i = r ? new Proxy(e, {
        get(...c) {
          return b = s, Reflect.get(...c);
        },
        set(...c) {
          return b = s, Reflect.set(...c);
        }
      }) : e;
      b = s;
      const a = o[n].apply(i, arguments);
      return b = void 0, a;
    };
}
function rt({ app: e, store: t, options: r }) {
  if (!t.$id.startsWith("__hot:")) {
    if (t._isOptionsAPI = !!r.state, !t._p._testing) {
      F(t, Object.keys(r.actions), t._isOptionsAPI);
      const o = t._hotUpdate;
      R(t)._hotUpdate = function(n) {
        o.apply(this, arguments), F(t, Object.keys(n._hmrPayload.actions), !!t._isOptionsAPI);
      };
    }
    tt(
      e,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      t
    );
  }
}
function ot() {
  const e = ae(!0), t = e.run(() => y({}));
  let r = [], o = [];
  const n = z({
    install(s) {
      Q(n), n._a = s, s.provide(Y, n), s.config.globalProperties.$pinia = n, process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" && U && et(s, n), o.forEach((i) => r.push(i)), o = [];
    },
    use(s) {
      return this._a ? r.push(s) : o.push(s), this;
    },
    _p: r,
    // it's actually undefined here
    // @ts-expect-error
    _a: null,
    _e: e,
    _s: /* @__PURE__ */ new Map(),
    state: t
  });
  return process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" && U && typeof Proxy < "u" && n.use(rt), n;
}
process.env.NODE_ENV !== "production" ? Symbol("pinia:skipHydration") : (
  /* istanbul ignore next */
  Symbol()
);
var nt = Object.defineProperty, st = (e, t, r) => t in e ? nt(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, C = (e, t, r) => st(e, typeof t != "symbol" ? t + "" : t, r), it = /* @__PURE__ */ Symbol("wippy:emit"), at = /* @__PURE__ */ Symbol("wippy:props"), ct = /* @__PURE__ */ Symbol("wippy:props_error"), lt = /* @__PURE__ */ Symbol("wippy:content"), pt = /* @__PURE__ */ Symbol("wippy:panel-id"), ut = /* @__PURE__ */ Symbol("wippy:layout-bus"), dt = /* @__PURE__ */ Symbol("wippy:host"), ft = class extends Ie {
  constructor() {
    super(...arguments), C(this, "_vueApp", null), C(this, "_propsRef", y({})), C(this, "_errorsRef", y([])), C(this, "_contentRef", y(null)), C(this, "_bridgeAbort", null);
  }
  /**
   * Override to provide Vue-specific configuration.
   */
  static get vueConfig() {
    throw new Error("WippyVueElement subclass must override static get vueConfig()");
  }
  onMount(e, t, r, o, n, s) {
    const i = this.constructor.vueConfig;
    this._propsRef.value = r, this._errorsRef.value = o, this._contentRef.value = n ?? null;
    for (const l of o)
      this.emitEvent("invalid", { message: l });
    const a = new AbortController();
    this._bridgeAbort = a, this.reactive.props.subscribe((l, f) => {
      this._propsRef.value = l, this._errorsRef.value = [...f];
      for (const p of f)
        this.emitEvent("invalid", { message: p });
    }, { signal: a.signal }), this.reactive.content && this.reactive.content.subscribe((l) => {
      this._contentRef.value = l;
    }, { signal: a.signal });
    const c = (l) => {
      if (a.signal.aborted)
        return;
      const f = je(), p = le(l.rootComponent);
      this._vueApp = p;
      const x = ot();
      if (l.piniaPlugins)
        for (const L of l.piniaPlugins)
          x.use(L);
      if (p.use(x), l.plugins)
        for (const L of l.plugins)
          p.use(L);
      p.provide(at, this._propsRef), p.provide(ct, this._errorsRef), p.provide(it, this.emitEvent.bind(this)), p.provide(lt, this._contentRef), p.provide(pt, Ae(this)), p.provide(ut, Te(this)), p.provide(dt, B(this)), l.providers && l.providers(p, this), p.mount(t), f && Q(f);
    };
    if (i.rootComponent)
      c(i);
    else if (i.lazyConfig) {
      const l = document.createElement("wippy-loading");
      l.setAttribute("no-bg", ""), t.appendChild(l), i.lazyConfig().then((f) => {
        a.signal.aborted || (l.remove(), c(f));
      }).catch((f) => {
        if (a.signal.aborted)
          return;
        const p = f instanceof Error ? f.message : String(f), x = document.createElement("wippy-error");
        x.setAttribute("title", "Failed to load"), x.setAttribute("message", p), l.replaceWith(x), this.emitEvent("error", { message: p });
      });
    } else
      throw new Error("WippyVueElement vueConfig must provide rootComponent or lazyConfig");
  }
  onUnmount() {
    this._bridgeAbort?.abort(), this._bridgeAbort = null, this._vueApp && (this._vueApp.unmount(), this._vueApp = null);
  }
};
const ht = { class: "st" }, gt = { class: "st-head" }, mt = { class: "st-head-icon" }, vt = { class: "st-title" }, bt = {
  key: 0,
  class: "st-state"
}, _t = {
  key: 1,
  class: "st-state st-error"
}, yt = {
  key: 2,
  class: "st-body"
}, wt = { class: "st-card" }, xt = { class: "st-count" }, St = /* @__PURE__ */ pe({
  __name: "starter",
  setup(e) {
    const t = y(null), r = y(!0), o = y("");
    async function n() {
      r.value = !0, o.value = "";
      try {
        const { data: s } = await _e.get("/api/v1/starter/status");
        if (!s?.success) throw new Error(s?.error || "Could not load starter status.");
        t.value = { module: String(s.module), count: Number(s.count) || 0 };
      } catch (s) {
        t.value = null, o.value = s instanceof Error ? s.message : "Could not load starter status.";
      } finally {
        r.value = !1;
      }
    }
    return ue(n), (s, i) => (k(), O("div", ht, [
      m("div", gt, [
        m("div", mt, [
          de(G(ge), { icon: "tabler:terminal-2" })
        ]),
        m("div", null, [
          m("h1", vt, N(t.value?.module ?? "acme/starter"), 1),
          i[0] || (i[0] = m("p", { class: "st-sub" }, "Log entries written through the starter sink.", -1))
        ])
      ]),
      r.value ? (k(), O("div", bt, "Loading…")) : o.value ? (k(), O("div", _t, [
        fe(N(o.value) + " ", 1),
        m("button", {
          class: "st-retry",
          type: "button",
          onClick: n
        }, "Retry")
      ])) : (k(), O("div", yt, [
        m("div", wt, [
          m("span", xt, N(t.value?.count ?? 0), 1),
          i[1] || (i[1] = m("span", { class: "st-count-label" }, "log entries", -1))
        ])
      ]))
    ]));
  }
}), Et = ":root{--p-primary: rgb(0, 95, 178);--p-primary-50: color-mix(in srgb, var(--p-primary) 5%, white);--p-primary-100: color-mix(in srgb, var(--p-primary) 10%, white);--p-primary-200: color-mix(in srgb, var(--p-primary) 20%, white);--p-primary-300: color-mix(in srgb, var(--p-primary) 30%, white);--p-primary-400: color-mix(in srgb, var(--p-primary) 40%, white);--p-primary-500: var(--p-primary);--p-primary-600: color-mix(in srgb, var(--p-primary) 80%, black);--p-primary-700: color-mix(in srgb, var(--p-primary) 70%, black);--p-primary-800: color-mix(in srgb, var(--p-primary) 60%, black);--p-primary-900: color-mix(in srgb, var(--p-primary) 50%, black);--p-primary-950: color-mix(in srgb, var(--p-primary) 40%, black);--p-secondary: #6f7385;--p-secondary-50: color-mix(in srgb, var(--p-secondary) 5%, white);--p-secondary-100: color-mix(in srgb, var(--p-secondary) 10%, white);--p-secondary-200: color-mix(in srgb, var(--p-secondary) 20%, white);--p-secondary-300: color-mix(in srgb, var(--p-secondary) 35%, white);--p-secondary-400: color-mix(in srgb, var(--p-secondary) 65%, white);--p-secondary-500: var(--p-secondary);--p-secondary-600: color-mix(in srgb, var(--p-secondary) 80%, black);--p-secondary-700: color-mix(in srgb, var(--p-secondary) 65%, black);--p-secondary-800: color-mix(in srgb, var(--p-secondary) 55%, black);--p-secondary-900: color-mix(in srgb, var(--p-secondary) 50%, black);--p-secondary-950: color-mix(in srgb, var(--p-secondary) 30%, black);--p-danger: rgb(239, 68, 68);--p-danger-50: color-mix(in srgb, var(--p-danger) 5%, white);--p-danger-100: color-mix(in srgb, var(--p-danger) 10%, white);--p-danger-200: color-mix(in srgb, var(--p-danger) 20%, white);--p-danger-300: color-mix(in srgb, var(--p-danger) 30%, white);--p-danger-400: color-mix(in srgb, var(--p-danger) 40%, white);--p-danger-500: var(--p-danger);--p-danger-600: color-mix(in srgb, var(--p-danger) 80%, black);--p-danger-700: color-mix(in srgb, var(--p-danger) 70%, black);--p-danger-800: color-mix(in srgb, var(--p-danger) 60%, black);--p-danger-900: color-mix(in srgb, var(--p-danger) 50%, black);--p-danger-950: color-mix(in srgb, var(--p-danger) 40%, black);--p-success: rgb(34, 197, 94);--p-success-50: color-mix(in srgb, var(--p-success) 5%, white);--p-success-100: color-mix(in srgb, var(--p-success) 10%, white);--p-success-200: color-mix(in srgb, var(--p-success) 20%, white);--p-success-300: color-mix(in srgb, var(--p-success) 30%, white);--p-success-400: color-mix(in srgb, var(--p-success) 40%, white);--p-success-500: var(--p-success);--p-success-600: color-mix(in srgb, var(--p-success) 80%, black);--p-success-700: color-mix(in srgb, var(--p-success) 70%, black);--p-success-800: color-mix(in srgb, var(--p-success) 60%, black);--p-success-900: color-mix(in srgb, var(--p-success) 50%, black);--p-success-950: color-mix(in srgb, var(--p-success) 40%, black);--p-warn: rgb(249, 115, 22);--p-warn-50: color-mix(in srgb, var(--p-warn) 5%, white);--p-warn-100: color-mix(in srgb, var(--p-warn) 10%, white);--p-warn-200: color-mix(in srgb, var(--p-warn) 20%, white);--p-warn-300: color-mix(in srgb, var(--p-warn) 30%, white);--p-warn-400: color-mix(in srgb, var(--p-warn) 40%, white);--p-warn-500: var(--p-warn);--p-warn-600: color-mix(in srgb, var(--p-warn) 80%, black);--p-warn-700: color-mix(in srgb, var(--p-warn) 70%, black);--p-warn-800: color-mix(in srgb, var(--p-warn) 60%, black);--p-warn-900: color-mix(in srgb, var(--p-warn) 50%, black);--p-warn-950: color-mix(in srgb, var(--p-warn) 40%, black);--p-info: rgb(14, 165, 233);--p-info-50: color-mix(in srgb, var(--p-info) 5%, white);--p-info-100: color-mix(in srgb, var(--p-info) 10%, white);--p-info-200: color-mix(in srgb, var(--p-info) 20%, white);--p-info-300: color-mix(in srgb, var(--p-info) 30%, white);--p-info-400: color-mix(in srgb, var(--p-info) 40%, white);--p-info-500: var(--p-info);--p-info-600: color-mix(in srgb, var(--p-info) 80%, black);--p-info-700: color-mix(in srgb, var(--p-info) 70%, black);--p-info-800: color-mix(in srgb, var(--p-info) 60%, black);--p-info-900: color-mix(in srgb, var(--p-info) 50%, black);--p-info-950: color-mix(in srgb, var(--p-info) 40%, black);--p-help: rgb(168, 85, 247);--p-help-50: color-mix(in srgb, var(--p-help) 5%, white);--p-help-100: color-mix(in srgb, var(--p-help) 10%, white);--p-help-200: color-mix(in srgb, var(--p-help) 20%, white);--p-help-300: color-mix(in srgb, var(--p-help) 30%, white);--p-help-400: color-mix(in srgb, var(--p-help) 40%, white);--p-help-500: var(--p-help);--p-help-600: color-mix(in srgb, var(--p-help) 80%, black);--p-help-700: color-mix(in srgb, var(--p-help) 70%, black);--p-help-800: color-mix(in srgb, var(--p-help) 60%, black);--p-help-900: color-mix(in srgb, var(--p-help) 50%, black);--p-help-950: color-mix(in srgb, var(--p-help) 40%, black);--p-accent: rgb(20, 184, 166);--p-accent-50: color-mix(in srgb, var(--p-accent) 5%, white);--p-accent-100: color-mix(in srgb, var(--p-accent) 10%, white);--p-accent-200: color-mix(in srgb, var(--p-accent) 20%, white);--p-accent-300: color-mix(in srgb, var(--p-accent) 30%, white);--p-accent-400: color-mix(in srgb, var(--p-accent) 40%, white);--p-accent-500: var(--p-accent);--p-accent-600: color-mix(in srgb, var(--p-accent) 80%, black);--p-accent-700: color-mix(in srgb, var(--p-accent) 70%, black);--p-accent-800: color-mix(in srgb, var(--p-accent) 60%, black);--p-accent-900: color-mix(in srgb, var(--p-accent) 50%, black);--p-accent-950: color-mix(in srgb, var(--p-accent) 40%, black);--p-surface-0: #ffffff;--p-surface-50: #fafafa;--p-surface-100: #f5f5f5;--p-surface-200: #e5e5e5;--p-surface-300: #d4d4d4;--p-surface-400: #a3a3a3;--p-surface-500: #737373;--p-surface-600: #525252;--p-surface-700: #404040;--p-surface-800: #262626;--p-surface-850: color-mix(in srgb, var(--p-surface-800) 50%, var(--p-surface-900));--p-surface-900: #171717;--p-surface-950: #0a0a0a;--p-content-border-radius: 6px}:root{--p-primary-color: var(--p-primary-500);--p-primary-contrast-color: var(--p-surface-0);--p-primary-hover-color: var(--p-primary-600);--p-primary-active-color: var(--p-primary-700);--p-content-border-color: var(--p-surface-200);--p-content-hover-background: var(--p-surface-100);--p-content-hover-color: var(--p-surface-800);--p-highlight-background: var(--p-primary-50);--p-highlight-color: var(--p-primary-700);--p-highlight-focus-background: var(--p-primary-100);--p-highlight-focus-color: var(--p-primary-800);--p-content-background: var(--p-surface-0);--p-text-color: var(--p-surface-700);--p-text-hover-color: var(--p-surface-800);--p-text-muted-color: var(--p-surface-500);--p-text-hover-muted-color: var(--p-surface-600)}@media(prefers-color-scheme:dark){:root{--p-surface-D: #fff;--p-surface-0: #fff;--p-surface-50: #fafafa;--p-surface-100: #f4f4f5;--p-surface-200: #e4e4e7;--p-surface-300: #d4d4d8;--p-surface-400: #a1a1aa;--p-surface-500: #71717a;--p-surface-600: #545250;--p-surface-700: #403e3c;--p-surface-800: #2b2927;--p-surface-850: color-mix(in srgb, var(--p-surface-800) 50%, var(--p-surface-900));--p-surface-900: #1c1a19;--p-surface-950: #0f0e0d;--p-primary: rgb(0, 125, 178);--p-primary-50: color-mix(in srgb, var(--p-primary) 5%, white);--p-primary-100: color-mix(in srgb, var(--p-primary) 10%, white);--p-primary-200: color-mix(in srgb, var(--p-primary) 20%, white);--p-primary-300: color-mix(in srgb, var(--p-primary) 30%, white);--p-primary-400: color-mix(in srgb, var(--p-primary) 40%, white);--p-primary-500: var(--p-primary);--p-primary-600: color-mix(in srgb, var(--p-primary) 80%, black);--p-primary-700: color-mix(in srgb, var(--p-primary) 70%, black);--p-primary-800: color-mix(in srgb, var(--p-primary) 60%, black);--p-primary-900: color-mix(in srgb, var(--p-primary) 50%, black);--p-primary-950: color-mix(in srgb, var(--p-primary) 40%, black);--p-primary-color: var(--p-primary-400);--p-primary-contrast-color: var(--p-surface-900);--p-primary-hover-color: var(--p-primary-300);--p-primary-active-color: var(--p-primary-200);--p-content-border-color: var(--p-surface-700);--p-content-hover-background: var(--p-surface-800);--p-content-hover-color: var(--p-surface-0);--p-highlight-background: color-mix(in srgb, var(--p-primary-400), transparent 84%);--p-highlight-color: rgba(255, 255, 255, 87%);--p-highlight-focus-background: color-mix(in srgb, var(--p-primary-400), transparent 76%);--p-highlight-focus-color: rgba(255, 255, 255, 87%);--p-content-background: var(--p-surface-900);--p-text-color: var(--p-surface-0);--p-text-hover-color: var(--p-surface-0);--p-text-muted-color: var(--p-surface-400);--p-text-hover-muted-color: var(--p-surface-300)}}:host{display:block;height:100%;min-height:0}:host>div{height:100%;min-height:0}*,*:before,*:after{box-sizing:border-box}.st{font-family:inherit;color:var(--p-text-color);background:var(--p-content-background);height:100%;display:flex;flex-direction:column;overflow:auto}.st-head{display:flex;align-items:center;gap:12px;padding:20px 24px 14px}.st-head-icon{width:40px;height:40px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--p-primary-color) 14%,transparent);color:var(--p-primary-color)}.st-head-icon svg{width:22px;height:22px}.st-title{font-size:17px;font-weight:700;margin:0}.st-sub{font-size:13px;color:var(--p-text-muted-color);margin:2px 0 0}.st-body{padding:8px 24px 24px}.st-card{display:inline-flex;align-items:baseline;gap:10px;padding:16px 20px;border-radius:12px;border:1px solid var(--p-content-border-color)}.st-count{font-size:28px;font-weight:700}.st-count-label{font-size:13px;color:var(--p-text-muted-color)}.st-state{padding:8px 24px;font-size:13px;color:var(--p-text-muted-color)}.st-error{color:var(--p-danger-color)}.st-retry{margin-left:8px;font:inherit;font-size:13px;cursor:pointer;color:var(--p-primary-color);background:transparent;border:none;padding:0}.st-retry:hover{text-decoration:underline}", Ct = { props: { type: "object", properties: {} } }, kt = {
  wippy: Ct
};
class Ot extends ft {
  static get wippyConfig() {
    return {
      propsSchema: kt.wippy.props,
      hostCssKeys: ["themeConfigUrl"],
      inlineCss: Et
    };
  }
  static get vueConfig() {
    return { rootComponent: St };
  }
}
ye(import.meta.url, Ot);
//# sourceMappingURL=index.js.map
