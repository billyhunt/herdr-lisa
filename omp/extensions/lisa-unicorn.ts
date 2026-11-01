// A fat Lisa unicorn above the prompt when oh-my-pi opens; it leaves when you
// send your first message. Colours are theme tokens, so it follows lisa-day and
// lisa-dusk (and any other theme).
import { theme, type ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const ART = [
	"                              *",
	"                             /",
	"                            /",
	"                  ~~~  .--./.",
	"                 ~~~~ /       `-.",
	"                ~~~~ |    o      `.",
	"                ~~~~ |        .--'",
	"               ~~~~  |       /",
	"    ~~~    .--------'        |",
	"  ~~~~~  .'                   \\",
	"   ~~~  |                      |",
	"        |                      |",
	"         \\   .-.        .-.   /",
	"          '-'| |'------'| |'-'",
	"             '-'        '-'",
];
const WIDTH = Math.max(...ART.map(l => l.length));
const HORN_ROWS = 3; // rows 0..2 are the horn; its sparkle is the "*"

// Mane and tail run through the spectrum, one colour per row, top to bottom.
const RAINBOW = ["error", "warning", "thinkingHigh", "success", "statusLinePath", "syntaxKeyword"] as const;

type Paint = (color: string, text: string) => string;

function paintRow(row: string, r: number, fg: Paint): string {
	let out = "";
	let run = "";
	let runColor = "";
	const flush = () => {
		if (run) out += fg(runColor, run);
		run = "";
	};
	for (const ch of row) {
		const color =
			ch === "*" ? "accent"
			: ch === "~" ? RAINBOW[r % RAINBOW.length]
			: r < HORN_ROWS || (r === HORN_ROWS && ch === "/") ? "mdHeading"
			: "text";
		if (ch === " ") {
			flush();
			out += ch;
			continue;
		}
		if (color !== runColor) flush();
		runColor = color;
		run += ch;
	}
	flush();
	return out;
}

export default function lisaUnicorn(pi: ExtensionAPI) {
	const KEY = "lisa-unicorn";
	let shown = false;

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		// `theme` is omp's live binding: read it at render time, because omp may
		// switch light/dark after startup once the terminal reports its background.
		ctx.ui.setWidget(KEY, () => ({
			render(width: number) {
				if (width < WIDTH + 2) return [];
				const fg: Paint = (color, text) => theme.fg(color as never, text);
				const pad = " ".repeat(Math.floor((width - WIDTH) / 2)); // centred under omp's logo
				return ["", ...ART.map((row, r) => pad + paintRow(row, r, fg)), ""];
			},
			invalidate() {},
		}));
		shown = true;
	});

	pi.on("input", async (_event, ctx) => {
		if (!shown) return;
		shown = false;
		ctx.ui.setWidget(KEY, undefined);
	});
}
