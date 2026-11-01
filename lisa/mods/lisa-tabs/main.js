import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { MONO, fill, onFill, roundButton, statusFill, findNode } from "./lisa.js";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, settings } from "herdr";

export default class Tabs extends View {
  init() {
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const stop = (_e, cx) => cx.stop_propagation();
    // Folder tabs: square bottoms resting on the bar's 3px rule, rounded tops,
    // filled with the status (working 5, blocked 1, done 4, idle 7). The
    // active tab stands taller.
    const item = (c, i) => {
      const program = panes().find(p => p.tab === c.id && p.program?.agent)?.program ?? panes().find(p => p.tab === c.id)?.program;
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name;
      const n = statusFill(c.status);
      const ink = onFill(t, n);
      return h_flex().id(`tab-${c.id}`).h(c.active ? 36 : 30).px(14).gap(8).items_center().flex_none()
        .rounded_t(10).border_t_3().border_l_3().border_r_3().border_color(t.border)
        .bg(fill(t, n)).text_color(ink)
        .font_family(MONO).font_bold().text_size(11)
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .when(Boolean(program?.icon), el => el.child(program.tint ? svg(program.icon).size(14).text_color(ink) : image(program.icon).size(14)))
        .child(div().max_w(170).truncate().child((c.zoomed ? `${name} Z` : name).toUpperCase()))
        .when(c.status === "working", el => el.child(svg("mods/lisa-tabs/spinner.svg").size(12).flex_none().text_color(ink).spin(900)))
        .when(c.active, el => el.child(div().id(`close-${c.id}`).size(20).flex_none().flex().items_center().justify_center().rounded_full()
          .text_color(ink).hover(s => s.bg(ink).text_color(fill(t, n)))
          .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child(svg("mods/lisa-tabs/close.svg").size(10))));
    };
    const root = layout(), sidebar = findNode(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = findNode(root, "panel"), body = findNode(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(32).px(12).gap(4).flex_none().items_center().rounded_full().border_3().border_color(t.border)
        .text_size(13).font_medium()
        .when(on, el => el.bg(fill(t, 5)).text_color(onFill(t, 5)))
        .when(!on, el => el.text_color(t.foreground).hover(s => s.bg(t.hover))).on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(icon).size(14)).child(label);
    };
    return h_flex().size_full().min_w(0).px(12).pl(lightsPadding).gap(8).items_center().bg(t.canvas).border_b_3().border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_end().gap(4).overflow_x_scrollbar().children(shown.map(item)))
      .child(roundButton(t, "tab-new", div().text_size(18).font_bold().child("+"), () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))
      .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "mods/files/file.svg")))
      .when(enabled.includes("changes"), el => el.child(panelButton("changes", "Changes", "mods/changes/changes.svg")))
      .when(w?.buttons, el => el.child(roundButton(t, "minimize", w.platform === "windows" ? svg("mods/lisa-tabs/win-min.svg").size(16) : "−", () => run("window.minimize")))
        .child(roundButton(t, "maximize", w.platform === "windows" ? svg(`mods/lisa-tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", () => run("window.maximize")))
        .child(roundButton(t, "close-window", w.platform === "windows" ? svg("mods/lisa-tabs/win-close.svg").size(16) : svg("mods/lisa-tabs/close.svg").size(13), () => run("window.close"))));
  }
}
