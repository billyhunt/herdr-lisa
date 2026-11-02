// Workspace spaces: pills filled with each space's agent status, avatars in the
// project's colour, worktrees under their checkout, grouped by machine when more
// than one is known. After a space's name, the repo its first terminal is in now,
// only where unusual: branch, ahead/behind. Click to switch, right-click for its
// menu, drag to reorder.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, machines, panes, run, openOverlay, exec, hc, theme, watchFolder, window } from "herdr";
import { MONO, fill as lisaFill, onFill, accentText, label, chip, roundButton, row as lisaRow, lift, statusFill, narrow } from "./lisa.js";

// A space's mark is a small animal, no circle, inked like the row's text. Each
// project (a git repo's root, shared by its worktrees and second checkouts,
// else its folder) gets one. A new project prefers the animal its key hashes to,
// but takes the least-used animal among the projects listed now, so two
// projects in view only share one once all fourteen are taken. The pick is
// stored (ANIMAL_STORE) as an index, so new animals only ever go on the end of
// ANIMALS: a project keeps its animal across reorders and restarts.
const ANIMALS = ["cat", "frog", "owl", "bear", "rabbit", "fox", "penguin", "mouse", "pig", "elephant", "dog", "chick", "octopus", "deer"];
const ANIMAL_STORE = "lisa.project.animals";
const hashOf = (key) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return h;
};
const avatar = (animal, ink, size = 24) =>
  svg(`mods/lisa-spaces/animal-${ANIMALS[animal]}.svg`).size(size).flex_none().text_color(ink);
const dot = (t, n) => div().size(12).flex_none().rounded_full().border_3().border_color(t.border).bg(lisaFill(t, n));
// On a filled row the fill already says working/done; only blocked keeps a
// notice, lemon on the magenta row.
const statusMark = (t, status) => (status === "blocked" ? chip(t, "Needs you", 3) : null);

// Where a space is now: the live folder of the pane you're in (the shown tab's
// focused pane, else its first), so a new tab opened in another project moves
// the space there; else any pane's folder, else where it was made.
// `ps`: panes(), read once by the caller (each read copies every pane).
function place(s, ps) {
  const tabs = s.tabs ?? [];
  const ids = new Set(tabs.map((c) => c.id));
  const shown = tabs.find((c) => c.active)?.id;
  const here = ps.filter((p) => p.tab === shown && p.cwd);
  return (here.find((p) => p.focused) ?? here[0] ?? ps.find((p) => ids.has(p.tab) && p.cwd))?.cwd || s.folder;
}
const rowHeight = ({ tree }) => (tree ? 32 : 36);
const where = (s, ps) => JSON.stringify([s.machine ?? null, place(s, ps)]);
// The avatar's key: the repo root when git knows one, else where() itself, so a
// main checkout keeps its colour while its git is still being looked up.
const colorKey = (k, g) => {
  if (!g) return k;
  const [on, dir] = JSON.parse(g.repo);
  return JSON.stringify([on, dir.replace(/\/\.git$/, "")]);
};
const base = (path) => path.replace(/\/+$/, "").split("/").pop();
// Changes made outside Herdr (an editor's save, a commit in another app): looked
// for this often, in repos the list shows, while the window is in front.
const FALLBACK = 60000;

export default class Spaces extends View {
  init(_props, cx) {
    this.git = {}; // where() -> { name, branch, ahead, behind, repo, linked }, null: not a repo
    this.checked = {}; // where() -> when it was last looked at
    this.unsure = new Set(); // where()s git couldn't answer for (a machine away)
    this.pending = new Set(); // where()s to look at next
    this.busy = {}; // pane -> an agent working or a program in front of its shell
    this.ready = {}; // machine -> its layout was readable at the last look
    this.at = {}; // space -> its where() at the last look
    this.watching = new Set(); // local repos' git folders
    // Spaces made while this runs wait (at most a moment) for their git, so a
    // worktree appears under its repo instead of jumping there.
    this.shown = new Set(spaces().map((s) => s.id));
    this.born = {};
    this.pressed = null;
    this.over = null;
    this.machines = [];
    this.folded = new Set(JSON.parse(localStorage.getItem("machines.folded") ?? "[]"));
    this.refreshMachines(cx);
    cx.timer.every(15000, cx => this.refreshMachines(cx));
    // `git status` walks the whole tree, on another machine a process there:
    // only when its answer could have changed (see `due`).
    cx.timer.every(250, (cx) => this.checkNew(cx));
  }

  checkNew(cx) {
    const now = Date.now();
    const sp = spaces();
    for (const s of sp) if (!this.shown.has(s.id)) this.born[s.id] ??= now;
    const due = this.due(now, sp, panes());
    if (due.size) this.refreshGit(due, cx);
    if (sp.some((s) => !this.shown.has(s.id))) cx.notify();
  }

  // Places whose git could have changed: new ones (a new space, a cd), where a
  // command or an agent's turn just ended (a checkout, a commit, edits), those on
  // a machine that is back, and repos in view whose fallback is due.
  due(now, sp, ps) {
    // Moved there: what it knew of that place may be old.
    const at = {};
    for (const s of sp) at[s.id] = where(s, ps);
    const keys = new Set(Object.values(at).filter((k) => JSON.parse(k)[1]));
    const due = new Set([...keys].filter((k) => !(k in this.git)));
    for (const [id, k] of Object.entries(at)) if (this.at[id] && this.at[id] !== k && keys.has(k)) due.add(k);
    this.at = at;
    const spaceOf = {};
    for (const s of sp) for (const t of s.tabs ?? []) spaceOf[t.id] = s;
    const busy = {};
    for (const p of ps) {
      if (!p.terminal || !spaceOf[p.tab]) continue;
      busy[p.pane] = p.status === "working" || !(p.program?.shell || p.program?.agent);
      if (this.busy[p.pane] && !busy[p.pane]) this.sameRepo(at[spaceOf[p.tab].id], keys).forEach((k) => due.add(k));
    }
    this.busy = busy;
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && this.ready[m.name] === false) for (const k of keys) if (JSON.parse(k)[0] === m.name) due.add(k);
      this.ready[m.name] = ready;
    }
    if (window().active) {
      for (const k of keys) {
        const asks = this.git[k] || this.unsure.has(k);
        if (asks && !this.folded.has(JSON.parse(k)[0]) && now - (this.checked[k] ?? 0) > FALLBACK) due.add(k);
      }
    }
    return due;
  }

  // `key` and the other places in its repo (a commit there moves their ahead/behind).
  sameRepo(key, keys) {
    const repo = this.git[key]?.repo;
    return [key, ...(repo ? [...keys].filter((k) => this.git[k]?.repo === repo) : [])];
  }

  refreshMachines(cx) {
    cx.spawn(async cx => {
      try { const r = await hc(["machine", "ls", "--json"]); if (r.code === 0) this.machines = (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary); } catch {}
      cx.notify();
    });
  }

  // One look at a time, each place once however often it was asked for meanwhile.
  refreshGit(keys, cx) {
    for (const k of keys) this.pending.add(k);
    if (this.refreshing) return;
    this.refreshing = true;
    cx.spawn(async (cx) => {
      while (this.pending.size) {
        const keys = [...this.pending];
        this.pending.clear();
        for (const key of keys) await this.check(key, cx);
      }
      const used = new Set(Object.values(this.git).filter(Boolean).map((g) => JSON.parse(g.repo)).filter(([on]) => !on).map(([, repo]) => repo));
      for (const repo of this.watching) if (!used.has(repo)) this.watching.delete(repo);
      this.refreshing = false;
      cx.notify();
    });
  }

  // One place's git: branch, ahead/behind, its repo.
  async check(key, cx) {
    const [on, cwd] = JSON.parse(key);
    this.checked[key] = Date.now();
    this.unsure.delete(key);
    try {
      // No optional locks: a status that touched the index would wake the watch again.
      // Writes nothing under .git (index lock, fsmonitor cookie): watch() would wake on it.
      const r = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v2", "--branch"], { cwd, on });
      if (r.code !== 0) {
        // Only git's own "no" is remembered as no repo; anything else is asked again.
        if (!/not a git repository/i.test(r.stderr)) this.unsure.add(key);
        this.git[key] = null;
        return;
      }
      // The repo's own .git folder names it; a worktree's top differs from it.
      const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
      const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on });
      const repo = common.stdout.trim();
      const name = repo.endsWith("/.git") ? base(repo.slice(0, -5)) : base(repo).replace(/\.git$/, "");
      const info = { name, branch: null, ahead: 0, behind: 0, repo: JSON.stringify([on, repo]), linked: repo !== `${top.stdout.trim()}/.git` };
      for (const line of r.stdout.split("\n")) {
        if (line.startsWith("# branch.head ")) info.branch = line.slice(14);
        else if (line.startsWith("# branch.ab ")) {
          const [a, b] = line.slice(12).split(" ");
          info.ahead = Math.abs(parseInt(a, 10)) || 0;
          info.behind = Math.abs(parseInt(b, 10)) || 0;
        }
      }
      this.git[key] = info;
      if (!on) this.watch(repo, cx);
    } catch {
      // Couldn't ask (the machine is away): keep what it showed, look again later.
      this.git[key] ??= null;
      this.unsure.add(key);
    }
  }

  watch(repo, cx) {
    if (this.watching.has(repo)) return;
    this.watching.add(repo);
    cx.spawn(async (cx) => {
      try {
        while (this.watching.has(repo)) {
          await watchFolder(repo);
          const mine = JSON.stringify([null, repo]);
          if (this.watching.has(repo)) this.refreshGit(Object.keys(this.git).filter((k) => this.git[k]?.repo === mine), cx);
        }
      } catch { this.watching.delete(repo); }
    });
  }

  menu(w) {
    // A popup is as tall as its items; height is only the most.
    openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: w.id } } });
  }

  // Sets `animal` on each row. A key git hasn't answered for yet (`!known`) may
  // still turn into its repo root, so its animal is used but not stored.
  assignAnimals(list) {
    const stored = (this.projectAnimals ??= JSON.parse(localStorage.getItem(ANIMAL_STORE) ?? "{}"));
    const pass = {};
    const used = Array(ANIMALS.length).fill(0);
    for (const k of new Set(list.map((r) => r.key))) if (stored[k] !== undefined) used[stored[k]]++;
    let dirty = false;
    for (const r of list) {
      let n = stored[r.key] ?? pass[r.key];
      if (n === undefined) {
        const pref = hashOf(r.key) % ANIMALS.length;
        n = pref;
        for (let o = 1; o < ANIMALS.length; o++) {
          const c = (pref + o) % ANIMALS.length;
          if (used[c] < used[n]) n = c;
        }
        used[n]++;
        pass[r.key] = n;
        if (r.known) { stored[r.key] = n; dirty = true; }
      }
      r.animal = n;
    }
    if (dirty) localStorage.setItem(ANIMAL_STORE, JSON.stringify(stored));
  }

  // Spaces in order, each worktree space moved under its main checkout's.
  ordered() {
    const sp = spaces(), ps = panes();
    const ready = (w) => this.shown.has(w.id) || where(w, ps) in this.git || Date.now() - (this.born[w.id] ??= Date.now()) > 1500;
    for (const w of sp) if (!this.shown.has(w.id) && ready(w)) this.shown.add(w.id);
    const list = sp.map((w, i) => {
      const k = where(w, ps), g = this.git[k] ?? null;
      return { w, i, g, key: colorKey(k, g), known: k in this.git };
    }).filter((r) => this.shown.has(r.w.id));
    this.assignAnimals(list);
    const mains = new Set(list.filter((r) => r.g && !r.g.linked).map((r) => r.g.repo));
    const nested = (r) => r.g?.linked && mains.has(r.g.repo);
    const out = [];
    const placed = new Set(); // repos whose worktrees are listed (under the first of its spaces)
    for (const r of list) {
      if (nested(r)) continue;
      out.push({ ...r, tree: null });
      if (!r.g || r.g.linked || placed.has(r.g.repo)) continue;
      placed.add(r.g.repo);
      const kids = list.filter((k) => nested(k) && k.g.repo === r.g.repo);
      kids.forEach((k, n) => out.push({ ...k, tree: n === kids.length - 1 ? "└─" : "├─" }));
    }
    return out;
  }

  // The rows, under a header per machine once one isn't this computer.
  grouped(t, collapsed) {
    const rows = this.ordered();
    const draw = (r) => (collapsed ? this.compact(r, t) : this.row(r, t));
    const remote = [...new Set([...rows.map(r => r.w.machine).filter(Boolean), ...this.machines.map(m => m.name)])].sort();
    const loading = m => {
      const layout = machines().find(k => k.name === m)?.layout;
      return layout === "loading" || (!layout && this.machines.some(k => k.name === m && k.state === "connected"))
        || spaces().some(s => (s.machine ?? null) === m && !this.shown.has(s.id));
    };
    const loadingRow = m => div().id(`machine-loading-${m ?? "local"}`).h(32).flex_none().px(12).flex().items_center().child(label(t, collapsed ? "…" : "Loading…"));
    if (!remote.length) return loading(null) && !rows.length ? [loadingRow(null)] : rows.map(draw);
    const machineNames = [null, ...remote];
    return machineNames.flatMap((m) => {
      const mine = rows.filter((r) => (r.w.machine ?? null) === m);
      const machine = this.machines.find(k => k.name === m);
      const connected = !m || machine?.state === "connected";
      const folded = this.folded.has(m);
      const head = h_flex().id(`machine-${m ?? "local"}`).h(32).flex_none().px(collapsed ? 4 : 12).gap(8).items_center().text_color(t.muted)
        .rounded_full().cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => {
          folded ? this.folded.delete(m) : this.folded.add(m);
          localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
          cx.notify();
        })
        .child(svg(`mods/lisa-spaces/${m ? "server" : "monitor"}.svg`).size(13).flex_none())
        .when(!collapsed, el => el.child(div().flex_1().min_w(0).truncate().child(label(t, m ?? "This computer")))
          .when(!connected, el => el.child(div().flex_none().child(label(t, (machine?.state ?? "asleep").replace(/_/g, " ")))))
          .when(connected, el => el.child(roundButton(t, `machine-add-${m ?? "local"}`, svg("mods/lisa-spaces/plus.svg").size(12),
            (_e, cx) => { cx.stop_propagation(); run("space.new", m ? { machine: m } : {}); })))
          .child(dot(t, connected ? 4 : 6))
          .child(svg(`mods/lisa-spaces/chevron-${folded ? "right" : "down"}.svg`).size(12).flex_none()));
      const empty = h_flex().id(`machine-new-${m ?? "local"}`).h(36).flex_none().px(12).gap(8).items_center().rounded_full()
        .border_3().border_color("#00000000").text_size(12).text_color(t.muted).hover(s => s.bg(t.hover).border_color(t.border).text_color(t.foreground))
        .on_click(() => run("space.new", m ? { machine: m } : {}))
        .child(svg("mods/lisa-spaces/plus.svg").size(12)).when(!collapsed, el => el.child("New space there"));
      return [head, ...(folded ? [] : mine.length ? mine.map(draw) : [loading(m) ? loadingRow(m) : empty])];
    });
  }

  // Only what's unusual, after the name: "herdr \u00b7 spike \u21912 \u21931". The repo or
  // branch goes when the name already says it (a worktree is named after its branch),
  // and master/main go: nearly every space is on one.
  gitTail(g, tree, name, t, color) {
    const raw = g.branch ?? "detached";
    const same = (a) => a.toLowerCase() === name.toLowerCase();
    const branch = same(raw) || raw === "master" || raw === "main" ? "" : raw;
    const repo = tree || same(g.name) ? "" : g.name;
    const where = [repo, branch].filter(Boolean).join(" \u00b7 ");
    return h_flex()
      .flex_1()
      .min_w(0)
      .gap(5)
      .justify_end()
      .items_center()
      .font_family(MONO)
      .font_bold()
      .text_size(11)
      .opacity(0.85)
      .text_color(color)
      .when(Boolean(where), (el) => el.child(div().min_w(0).truncate().child(where.toUpperCase())))
      .when(g.ahead > 0, (el) => el.child(div().flex_none().child(`\u2191${g.ahead}`)))
      .when(g.behind > 0, (el) => el.child(div().flex_none().child(`\u2193${g.behind}`)));
  }

  row({ w, i, g, tree, animal }, t) {
    const on = w.active;
    const n = statusFill(w.status);
    const ink = onFill(t, n);
    const mark = statusMark(t, w.status);
    return lift(t, lisaRow(t, `space-${w.id}`, w.status)
      .relative()
      .flex()
      .flex_col()
      .px(8)
      .h(rowHeight({ tree }))
      .flex_none()
      .justify_center()
      .when(this.pressed === i && this.over !== i, (el) => el.opacity(0.5))
      .when(this.pressed !== null && this.over === i && this.pressed !== i, (el) => el.child(
        div().absolute().left(12).right(12).h(4).rounded_full().bg(accentText(t))
          .when(this.pressed < i, line => line.bottom(0))
          .when(this.pressed > i, line => line.top(0)),
      ))
      .on_mouse_down("left", () => {
        this.pressed = i;
        this.over = i;
      })
      .on_mouse_move((_e, cx) => {
        const source = spaces()[this.pressed];
        const over = source && (source.machine ?? null) === (w.machine ?? null) ? i : null;
        if (this.pressed !== null && this.over !== over) {
          this.over = over;
          cx.notify();
        }
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed;
        const over = this.over;
        this.pressed = null;
        this.over = null;
        if (from !== null && over === i && from !== i) run("space.move", { id: spaces()[from].id, index: i + 1 });
        else if (from === i) run("space.select", { id: w.id });
        cx.notify();
      })
      .on_mouse_down("right", () => this.menu(w))
      .child(
        h_flex()
          .gap(8)
          .items_center()
          .when(Boolean(tree), el => el.pl(24).child(svg("mods/lisa-spaces/branch.svg").size(12).text_color(ink)))
          .when(!tree, el => el.child(avatar(animal, ink)))
          .child(div().flex_shrink(0).max_w(150).truncate().font_medium().child(w.name))
          .child(g ? this.gitTail(g, tree, w.name, t, ink) : div().flex_1())
          .when(Boolean(mark), el => el.child(mark)),
      ), on).flex_none();
  }

  compact({ w, animal }, t) {
    return lift(t, lisaRow(t, `space-${w.id}`, w.status)
      .flex()
      .h(36)
      .flex_none()
      .justify_center()
      .items_center()
      .on_click(() => run("space.select", { id: w.id }))
      .child(avatar(animal, onFill(t, statusFill(w.status)), 26)), w.active).flex_none();
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    return v_flex().size_full().min_h(0).bg(t.chrome).text_size(13)
      .child(h_flex().h(40).flex_none().pl(collapsed ? 4 : 16).pr(8).items_center().justify_between()
        .when(collapsed, el => el.justify_center())
        .when(!collapsed, el => el.child(label(t, "Spaces")))
        .child(roundButton(t, "space-new", svg("mods/lisa-spaces/plus.svg").size(14), () => run("space.new"))))
      .child(v_flex().flex_1().min_h(0).px(8).pb(16).gap(4).overflow_y_scrollbar().mode("always")
        .on_mouse_up("left", (_e, cx) => { this.pressed = null; cx.notify(); })
        .children(this.grouped(t, collapsed)));
  }
}
