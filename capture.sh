#!/usr/bin/env bash
# Copy this machine's live Lisa files back into the repo, to commit changes
# made in Herdr or oh-my-pi. The reverse of install.sh.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
dest="$repo/lisa"
herdr="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
omp_themes="${PI_CODING_AGENT_DIR:-$HOME/.omp/agent}/themes"
mods=(lisa-spaces lisa-agents lisa-tabs lisa-pane lisa-workspace-chrome lisa-workspace-status)

for f in lisa.json lisa.png lisa-airbrush.json lisa-airbrush.png; do
  cp "$herdr/layouts/$f" "$dest/layouts/"
done
cp "$herdr/themes/lisa-day.json" "$herdr/themes/lisa-dusk.json" "$dest/themes/"
cp "$herdr/backgrounds/lisa-airbrush.png" "$dest/backgrounds/"
cp "$herdr/lisa-kit/lisa.js" "$dest/lisa-kit/"
for mod in "${mods[@]}"; do
  rm -rf "$dest/mods/$mod"
  mkdir -p "$dest/mods/$mod"
  for f in "$herdr/mods/$mod"/*; do
    case "$(basename "$f")" in
      gpui-kit.d.ts | jsconfig.json) ;; # editor typings Herdr writes; not part of the look
      *) cp "$f" "$dest/mods/$mod/" ;;
    esac
  done
  cmp -s "$dest/lisa-kit/lisa.js" "$dest/mods/$mod/lisa.js" ||
    echo "warning: $mod/lisa.js differs from lisa-kit/lisa.js; copy the kit into every mod" >&2
done
cp "$omp_themes/lisa-day.json" "$omp_themes/lisa-dusk.json" "$repo/omp/themes/"
git -C "$repo" status --short
