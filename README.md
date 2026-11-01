# herdr-lisa

The [Lisa](https://www.billyhunt.com/design-systems/lisa/) design system for the
[Herdr](https://herdr.dev) desktop app and [oh-my-pi](https://omp.sh), as one
look: neon fills under ink, 3px edges, pills, a spectrum strip, Bungee Shade,
Fredoka and Comic Mono.

## Install

```sh
git clone https://github.com/billyhunt/herdr-lisa.git
cd herdr-lisa
./install.sh
```

Open Herdr at least once first (it creates `~/.config/herdr-app`). The script
copies everything into place, sets oh-my-pi's light and dark themes, and
switches Herdr to the `lisa` layout. Re-run it after pulling to update.

## What you get

| Herdr layout | Look | oh-my-pi theme |
|---|---|---|
| `lisa` | Day: paper page, lilac sidebar and pane headers, white terminal | `lisa-day` |
| `lisa-airbrush` | Dusk: midnight panels, airbrushed sky with sparkles behind the terminal | `lisa-dusk` |

`Ctrl-Shift-L` cycles layouts. oh-my-pi picks its light or dark theme from the
terminal's background, so it follows the layout by itself.

Pills show status everywhere (spaces, agents, folder tabs):

| Status | Pill |
|---|---|
| Working | cyan |
| Needs you | magenta, lemon NEEDS YOU chip |
| Done, not yet seen | lime |
| Idle | soft violet |

A space's circle is its project's colour, picked from its git repo (shared by
worktrees and second checkouts) or folder. The selected item has a hard shadow.

## Layout of this repo

| Path | Goes to |
|---|---|
| `herdr/layouts/` | `~/.config/herdr-app/layouts/` |
| `herdr/themes/` | `~/.config/herdr-app/themes/` (custom tokens: `fill_1`…`fill_7`, `on_fill_<n>`, `accent_text`) |
| `herdr/mods/lisa-*` | `~/.config/herdr-app/mods/`: restyled copies of Herdr's `spaces`, `agents`, `tabs`, `pane`, `workspace-chrome`, `workspace-status` |
| `herdr/lisa-kit/lisa.js` | the shared helper source; each `lisa-*` mod holds an identical copy (Herdr mods can't import across folders) |
| `herdr/fonts/`, `herdr/backgrounds/` | loaded by Herdr from its home |
| `omp/themes/` | `~/.omp/agent/themes/` |

## Changing it

Edit live in `~/.config/herdr-app` (Herdr hot-reloads) or `~/.omp/agent/themes`,
then run `./capture.sh` to copy the changes back here and commit. After editing
`lisa-kit/lisa.js`, copy it into every `mods/lisa-*` folder. Check a mod with
`herdr-app check ~/.config/herdr-app/mods/<mod>`.

The `lisa-*` mods are copies of Herdr 0.1.11's shipped mods, so Herdr updates
don't reach them. To pick up a new Herdr feature in one, clone the new stock mod
(`herdr-app do mod.clone '{"name":"tabs","as":"tabs-new"}'`) and port the Lisa
styling across.

## Licences

Bungee Shade, Fredoka and Space Mono: SIL Open Font License
(`herdr/fonts/OFL-*.txt`). Comic Mono: MIT (`herdr/fonts/LICENSE-comicmono.txt`).
