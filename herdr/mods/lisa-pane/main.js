// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "lisa-pane" } } } }
// Shows the program's icon (the app's program table), the agent's name or
// the terminal's title, the folder, and the agent's status; buttons split, zoom and close
// this pane. Props from the app: { pane, terminal }. Click: focus the pane.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { MONO, chip, roundButton } from "./lisa.js";
import { panes, props, run, theme, home } from "herdr";


function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane extends View {
  init() { this.hovered = false; }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(t, w, id, icon, command, args) {
    return roundButton(t, id, svg(`mods/lisa-pane/${icon}.svg`).size(12), (_e, cx) => {
      cx.stop_propagation();
      run(command, args);
    }).size(24).text_color(w.muted);
  }

  // props().look picks the header's paint, set per layout:
  //   (none)   the card's lilac strip over a 3px rule, the terminal below it
  //            is the card's field (the guide's folder card)
  //   "glass"  see-through, so a pane background image runs behind it
  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const st = p.status;
    const look = props()?.look;
    const w = { bg: look === "glass" ? "#00000000" : t.chrome, text: t.foreground, muted: t.muted };
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = icon(p.program, 14, w.text);
    const pane = p.pane;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .px(12)
      .gap(8)
      .items_center()
      .bg(w.bg)
      .when(look !== "glass", el => el.border_b_3().border_color(t.border))
      .text_size(12)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_none().truncate().max_w(260).font_medium().text_size(13).text_color(w.text).child(name))
      .child(div().flex_1().truncate().font_family(MONO).font_bold().text_size(11).text_color(w.muted).child(folder(p.cwd)))
      .when(st === "working", el => el.child(svg("mods/lisa-pane/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", el => el.child(chip(t, "Needs you", 1)))
      .when(st === "done", el => el.child(chip(t, "Done", 4)))
      .when(this.hovered, el => el
        .child(this.button(t, w, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, w, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, w, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, w, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
