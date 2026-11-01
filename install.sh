#!/usr/bin/env bash
# Install the Lisa look into Herdr desktop and oh-my-pi on this machine.
# Safe to re-run after pulling: it overwrites only the Lisa files. The first run
# also sets oh-my-pi's themes and switches Herdr to the lisa layout; later runs
# leave those choices alone.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
src="$repo/lisa"
herdr="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
omp_agent="${PI_CODING_AGENT_DIR:-$HOME/.omp/agent}"
omp_themes="$omp_agent/themes"
mods=(lisa-spaces lisa-agents lisa-tabs lisa-pane lisa-workspace-chrome lisa-workspace-status)

if [ ! -d "$herdr" ]; then
  echo "No Herdr home at $herdr. Open Herdr once, then run this again." >&2
  exit 1
fi
first=true
[ -f "$herdr/layouts/lisa.json" ] && first=false

echo "Herdr: $herdr"
mkdir -p "$herdr"/{layouts,themes,mods,lisa-kit,fonts,backgrounds}
cp "$src"/layouts/* "$herdr/layouts/"
cp "$src"/themes/*.json "$herdr/themes/"
cp "$src"/fonts/* "$herdr/fonts/"
cp "$src"/backgrounds/* "$herdr/backgrounds/"
cp "$src/lisa-kit/lisa.js" "$herdr/lisa-kit/"
for mod in "${mods[@]}"; do
  mkdir -p "$herdr/mods/$mod"
  cp "$src/mods/$mod"/* "$herdr/mods/$mod/"
  cp "$src/lisa-kit/lisa.js" "$herdr/mods/$mod/lisa.js" # one helper, one copy per mod
done

echo "oh-my-pi: $omp_agent (themes, unicorn extension)"
mkdir -p "$omp_themes" "$omp_agent/extensions"
cp "$repo"/omp/themes/*.json "$omp_themes/"
cp "$repo"/omp/extensions/*.ts "$omp_agent/extensions/"

if $first; then
  if command -v omp >/dev/null 2>&1; then
    if omp config set theme.light lisa-day >/dev/null && omp config set theme.dark lisa-dusk >/dev/null; then
      echo "oh-my-pi: theme.light = lisa-day, theme.dark = lisa-dusk"
    else
      echo "oh-my-pi: couldn't set the themes; set theme.light = lisa-day and theme.dark = lisa-dusk yourself." >&2
    fi
  else
    echo "omp not on PATH: set theme.light = lisa-day and theme.dark = lisa-dusk in omp's settings."
  fi
  if command -v herdr-app >/dev/null 2>&1 && herdr-app status >/dev/null 2>&1; then
    herdr-app do layout.switch --name lisa >/dev/null || echo "Herdr: couldn't switch layouts; pick lisa with Cmd/Ctrl-Shift-L." >&2
    echo "Herdr: switched to the lisa layout."
  else
    echo "Herdr isn't running: open it and pick the lisa layout (Cmd/Ctrl-Shift-L cycles layouts)."
  fi
else
  echo "Updated. Your current layout and oh-my-pi themes are unchanged."
fi
echo "Fonts load when Herdr starts; restart it if the text looks off."
