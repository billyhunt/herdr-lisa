#!/usr/bin/env bash
# Install the Lisa look into Herdr desktop and oh-my-pi on this machine.
# Safe to re-run: it overwrites only the lisa-* files it owns.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
herdr="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
omp_themes="${PI_CODING_AGENT_DIR:-$HOME/.omp/agent}/themes"

if [ ! -d "$herdr" ]; then
  echo "No Herdr home at $herdr. Open Herdr once, then run this again." >&2
  exit 1
fi

echo "Herdr: $herdr"
mkdir -p "$herdr"/{layouts,themes,mods,lisa-kit,fonts,backgrounds}
cp "$repo"/herdr/layouts/*.json "$herdr/layouts/"
cp "$repo"/herdr/themes/*.json "$herdr/themes/"
cp "$repo"/herdr/lisa-kit/lisa.js "$herdr/lisa-kit/"
cp "$repo"/herdr/fonts/* "$herdr/fonts/"
cp "$repo"/herdr/backgrounds/* "$herdr/backgrounds/"
for mod in "$repo"/herdr/mods/lisa-*; do
  mkdir -p "$herdr/mods/$(basename "$mod")"
  cp "$mod"/* "$herdr/mods/$(basename "$mod")/"
done

echo "oh-my-pi themes: $omp_themes"
mkdir -p "$omp_themes"
cp "$repo"/omp/themes/*.json "$omp_themes/"
if command -v omp >/dev/null 2>&1; then
  omp config set theme.light lisa-day >/dev/null
  omp config set theme.dark lisa-dusk >/dev/null
  echo "oh-my-pi: theme.light = lisa-day, theme.dark = lisa-dusk"
else
  echo "omp not on PATH: set theme.light = lisa-day and theme.dark = lisa-dusk in omp's settings."
fi

if command -v herdr-app >/dev/null 2>&1 && herdr-app status >/dev/null 2>&1; then
  herdr-app do layout.switch --name lisa >/dev/null
  echo "Herdr: switched to the lisa layout (Ctrl-Shift-L cycles to lisa-airbrush)."
else
  echo "Herdr isn't running: open it and pick the lisa layout (Ctrl-Shift-L)."
fi
echo "Fonts load when Herdr starts; restart it if the text looks off."
