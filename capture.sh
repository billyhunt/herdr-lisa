#!/usr/bin/env bash
# Copy this machine's live Lisa files back into the repo, to commit changes
# made in Herdr or omp. The reverse of install.sh.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
herdr="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
omp_themes="${PI_CODING_AGENT_DIR:-$HOME/.omp/agent}/themes"

cp "$herdr"/layouts/lisa*.json "$repo/herdr/layouts/"
cp "$herdr"/themes/lisa-*.json "$repo/herdr/themes/"
cp "$herdr/lisa-kit/lisa.js" "$repo/herdr/lisa-kit/"
cp "$herdr"/backgrounds/lisa-*.png "$repo/herdr/backgrounds/"
for mod in "$herdr"/mods/lisa-*; do
  dest="$repo/herdr/mods/$(basename "$mod")"
  mkdir -p "$dest"
  for f in "$mod"/*; do
    case "$(basename "$f")" in
      gpui-kit.d.ts | jsconfig.json) ;; # editor typings Herdr writes; not part of the look
      *) cp "$f" "$dest/" ;;
    esac
  done
done
cp "$omp_themes"/lisa-*.json "$repo/omp/themes/"
git -C "$repo" status --short
