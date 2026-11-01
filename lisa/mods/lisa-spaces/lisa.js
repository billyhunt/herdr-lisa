// Lisa pieces for the lisa-* mods. Mods can't import across folders, so every
// lisa-* mod carries an identical copy of this file as ./lisa.js. The source is
// lisa-kit/lisa.js in the herdr-lisa repo; install.sh copies it into each mod.
//
// Colours come from the theme (themes/lisa-day.json, themes/lisa-dusk.json):
// t.fill_1..fill_7, t.on_fill, t.on_fill_<n> (6 and 7), t.accent_text, t.ring,
// plus the usual t.foreground, t.muted, t.border, t.chrome, t.canvas, t.hover.
// Rules: neon is a fill, never text by Day; text on a fill is onFill(t, n);
// every edge is 3px; buttons and chips are pills.
import { div } from "gpui-kit";
import { layout, run, shared, setShared, window } from "herdr";

// Display is for the wordmark only (22px+); small text uses the UI font (Fredoka).
export const DISPLAY = "Bungee Shade";
export const MONO = "Space Mono";
// Fill by job: 1 primary/blocked, 2 warning, 3 highlight, 4 success/done,
// 5 selection/working, 6 decoration, 7 idle (a soft violet tint, so resting
// things sit back and only live states are full neon). A fill's text colour is
// t.on_fill_<n> where the theme sets one (6 and 7), else t.on_fill.
// Outside the Lisa themes (`herdr-app check` renders with a stock theme) the
// tokens are missing, so each falls back to the nearest stock colour.
const STOCK_FILL = { 1: "blocked", 2: "accent", 3: "accent", 4: "done", 5: "working", 6: "accent", 7: "idle" };
export const fill = (t, n) => t[`fill_${n}`] ?? t[STOCK_FILL[n]];
export const onFill = (t, n) => t[`on_fill_${n}`] ?? t.on_fill ?? t.accent_foreground;
export const accentText = t => t.accent_text ?? t.accent;
// Section label: Space Mono capitals.
export const label = (t, text) =>
  div().font_family(MONO).font_bold().text_size(11).text_color(t.muted).child(String(text).toUpperCase());

// A pill of fill n with ink text and a 3px edge. Never clickable on its own.
export const chip = (t, text, n) =>
  div().flex_none().h(22).px(9).flex().items_center().rounded_full().border_3().border_color(t.border)
    .bg(fill(t, n)).text_color(onFill(t, n)).font_family(MONO).font_bold().text_size(10.5)
    .child(String(text).toUpperCase());

// Status by job: blocked is fill 1, working fill 5, done fill 4, idle fill 7.
// Anything without an agent status (a plain shell) reads as idle.
export const STATUS_FILL = { blocked: 1, working: 5, done: 4, idle: 7 };
export const statusFill = status => STATUS_FILL[status] ?? 7;

// A round icon button: plain at rest, selection fill under a 3px edge on hover.
export const roundButton = (t, id, child, action) =>
  div().id(id).size(28).flex_none().flex().items_center().justify_center().rounded_full()
    .border_3().border_color("#00000000").text_color(t.muted)
    .hover(s => s.bg(fill(t, 5)).border_color(t.border).text_color(onFill(t, 5)))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(child);

// A list row pill filled with its status, ink text, 3px edge. Selection is
// shown with lift(), never with a fill.
export const row = (t, id, status) => {
  const n = statusFill(status);
  return div().id(id).rounded_full().border_3().border_color(t.border).bg(fill(t, n)).text_color(onFill(t, n));
};

// Lisa depth: a hard 4px offset shadow in the edge colour. Wrap every row in
// lift() (on or off) so lifted and flat rows keep the same width; the shadow
// shows only when `on`.
export const lift = (t, el, on) =>
  div().relative().pr(4).pb(4)
    .when(on, w => w.child(div().absolute().top(4).left(4).right(0).bottom(0).rounded_full().bg(t.border)))
    .child(el);

// The layout node with this id, searching the tree.
export function findNode(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
export const narrow = () => (findNode(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (76 on macOS, wide enough for the traffic lights; 60 elsewhere,
// room for the 3px edges and the lift shadow), or back to the width it had.
export function toggleSidebar() {
  const width = findNode(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 60 });
}
