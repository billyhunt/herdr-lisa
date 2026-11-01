import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, theme, run, window, keys } from "herdr";
import { MONO, chip, STATUS_FILL } from "./lisa.js";

export default class WorkspaceStatus extends View {
  // The palette key as actually bound, not a hardcoded one; without a
  // binding the hint stays useful ("commands") instead of lying.
  hint(t) {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return key ? `${key}  commands` : "commands";
  }

  render() {
    const t = theme();
    const space = spaces().find(s => s.active);
    const list = agents();
    const count = (s) => list.filter(a => a.status === s).length;
    const label = (icon, text) => h_flex().gap(4).items_center().child(svg(`mods/lisa-workspace-status/${icon}.svg`).size(13)).child(String(text).toUpperCase());
    const counts = h_flex().gap(4).items_center().child(`${list.length} ${list.length === 1 ? "AGENT" : "AGENTS"}`);
    for (const s of ["working", "blocked", "done"]) {
      const n = count(s);
      if (n > 0) counts.child(chip(t, `${n} ${s === "blocked" ? "needs you" : s}`, STATUS_FILL[s]).h(20).px(8).text_size(10));
    }
    return h_flex().size_full().px(16).gap(16).items_center().bg(t.chrome).border_t_3().border_color(t.border)
      .font_family(MONO).font_bold().text_size(11).text_color(t.muted)
      .child(label(space?.machine ? "server" : "monitor", space?.machine ?? "This computer"))
      .when(Boolean(space?.branch), el => el.child(label("branch", space.branch)))
      .child(counts)
      .child(div().flex_1())
      .child(div().id("palette").cursor_pointer().hover(s => s.text_color(t.foreground)).on_click(() => run("app.palette")).child(this.hint(t).toUpperCase()));
  }
}
