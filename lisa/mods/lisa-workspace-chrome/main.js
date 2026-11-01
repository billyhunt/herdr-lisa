import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, window, updates } from "herdr";
import { DISPLAY, fill, onFill, chip, roundButton, narrow, toggleSidebar } from "./lisa.js";

export default class WorkspaceChrome extends View {
  render() {
    const t = theme();
    const collapsed = narrow();
    if (props()?.footer) {
      const row = (id, icon, label, action) => h_flex().id(id).h(32).px(12).gap(8).items_center().rounded_full()
        .border_3().border_color("#00000000").font_medium().text_color(t.foreground)
        .hover(s => s.bg(fill(t, 5)).border_color(t.border).text_color(onFill(t, 5))).cursor_pointer()
        .on_click(action).child(svg(`mods/lisa-workspace-chrome/${icon}.svg`).size(16))
        .when(!collapsed, el => el.child(div().flex_1().child(label)));
      // An update waiting: an "Update" chip, or on the rail a lemon dot in the corner.
      const ready = Boolean(updates().app.ready);
      return v_flex().size_full().bg(t.chrome).border_t_3().border_color(t.border).px(8).pt(4).pb(4).text_size(13)
        .child(row("settings", "settings", "Settings", () => run("app.settings"))
          .when(ready && !collapsed, el => el.child(chip(t, "Update", 3)))
          .when(ready && collapsed, el => el.relative().child(div().absolute().top(0).right(0).size(10).rounded_full().border_2().border_color(t.border).bg(fill(t, 3)))))
        .child(row("machine", "plus", "Add machine", () => run("mod.open", { name: "machine-add" })));
    }
    return h_flex().size_full().bg(t.chrome).pl(collapsed ? 8 : 16).pr(12).gap(4).items_center()
      .when(window()?.platform === "macos" && !collapsed, el => el.pl(76))
      .when(!collapsed, el => el.child(h_flex().flex_1().gap(8).items_center()
        .child(image("frame/welcome/herdr.png").size(24).rounded_full().border_3().border_color(t.border))
        .child(div().font_family(DISPLAY).text_size(22).text_color(t.foreground).child("HERDR"))))
      .when(!collapsed, el => el.child(roundButton(t, "search", svg("mods/lisa-workspace-chrome/search.svg").size(16), () => run("mod.open", { name: "picker" }))))
      // On the macOS rail the traffic lights fill the row; the agents list's » unfolds it.
      .when(!(collapsed && window()?.platform === "macos"), el => el.child(roundButton(t, "sidebar-toggle", svg("mods/lisa-workspace-chrome/sidebar.svg").size(16), toggleSidebar)));
  }
}
