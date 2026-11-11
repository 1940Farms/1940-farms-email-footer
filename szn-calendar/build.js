// Builds the public SZN team calendar from the private SZN Content Calendar artifact.
// Usage: node build.js <dir with index.html, data.js, report.js, logo_white.png> <out dir>
// Team version: last 3 days, today and the next 5 days; no month view, no refresh button; report section kept.
const fs = require("fs"), path = require("path");
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node build.js <src> <out>"); process.exit(1); }
const load = f => { const w = {}; new Function("window", fs.readFileSync(path.join(src, f), "utf8"))(w); return w; };
const D = load("data.js").SZN_DATA, R = load("report.js").SZN_REPORT;

// Toronto "today", then a slightly wider window than shown so the page still works later in the day.
const todayTO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const add = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const lo = add(todayTO, -4), hi = add(todayTO, 6);
const needed = new Set([...(R.reels || []), ...(R.boosted || [])].map(r => r && r.id).filter(Boolean));
// X (Twitter) isn't tracked: drop X posts, and any item that only went to X.
const items = D.items.filter(i => (i.day >= lo && i.day <= hi) || needed.has(i.id))
  .map(i => ({ ...i, posts: (i.posts || []).filter(p => p.platform !== "x") }))
  .filter(i => i.posts.length);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "data.js"), "window.SZN_DATA = " + JSON.stringify({ ...D, items, team: { built: new Date().toISOString(), today: todayTO } }) + ";\n");
fs.copyFileSync(path.join(src, "report.js"), path.join(out, "report.js"));
fs.copyFileSync(path.join(src, "logo_white.png"), path.join(out, "logo_white.png"));

let h = fs.readFileSync(path.join(src, "index.html"), "utf8");
const must = (a, b) => { if (!h.includes(a)) throw new Error("Calendar page changed; can't find: " + a.slice(0, 80)); h = h.replace(a, b); };
// Title and header line
must('const PLATS = { ig: "Instagram", fb: "Facebook", tt: "TikTok", yt: "YouTube", x: "X" };', 'const PLATS = { ig: "Instagram", fb: "Facebook", tt: "TikTok", yt: "YouTube" };');
must('const SHORT = { ig: "IG", fb: "FB", tt: "TT", yt: "YT", x: "X" };', 'const SHORT = { ig: "IG", fb: "FB", tt: "TT", yt: "YT" };');
// YouTube long-form videos get their own tag on the thumbnail (the calendar itself has it since Nov 11; added here only if missing).
if (!h.includes(">LONG FORM</span>")) {
  must(`<span class="th" \${bg(it)}>\${it.kind === "reel" ? '<span class="orig" title="Original recipe reel">ORIGINAL RECIPE</span>' : ""}</span>`,
    `<span class="th" \${bg(it)}>\${it.kind === "reel" ? '<span class="orig" title="Original recipe reel">ORIGINAL RECIPE</span>' : it.kind === "longform" ? '<span class="orig" title="YouTube long-form video">LONG FORM</span>' : ""}</span>`);
  must('original recipe reel (not a repost or compilation)</span>', 'original recipe reel (not a repost or compilation)</span>\n    <span><span class="orig" style="position:static">LONG FORM</span> YouTube long-form video</span>');
}
// Ignore platforms saved in a browser that the page no longer shows (e.g. X), so "Select all" reads right.
must("if (saved.plats) state.plats = new Set(saved.plats);", "if (saved.plats) state.plats = new Set(saved.plats.filter(k => k in PLATS));");
h = h.replace(/<title>[^<]*<\/title>/, "<title>SZN Team Calendar</title>");
if (!/^<!doctype/i.test(h)) h = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + h + "</body></html>";
h = h.replace(/<meta name="claude:[^>]*>/g, "");
must('<div class="sub" id="sub">', '<div class="sub" id="sub" data-team>');
// Hide the month view, the view switch, the arrows and the refresh button.
must("</style>", `
/* Team version */
.group:has(#vWeek), #refreshBtn, #lastRef, .navbtn, .todaybtn { display: none !important; }
.wkview.team .dow, .wkview.team .grid { grid-template-columns: repeat(9, minmax(0, 1fr)); }
.wkview.team .day.past-team { background: color-mix(in srgb, var(--past) 55%, var(--panel)); }
.teamnote { color: var(--muted); font-size: 12.5px; font-weight: 600; }
@media (max-width: 760px) { .wkview.team .grid { grid-template-columns: minmax(0, 1fr); } }
</style>`);
must("function render() {", "function render() { state.view = \"week\";");
must("function renderWeek() {", `function renderWeek() {
    // Team view: 3 days back, today, 5 days ahead.
    const days = [...Array(9)].map((_, i) => { const d = new Date(today); d.setDate(d.getDate() + i - 3); return d; });
    const a = days[0], b = days[8];
    document.getElementById("main").innerHTML = \`
      <div class="navbar"><h2>\${MONTHS[a.getMonth()].slice(0, 3)} \${a.getDate()} – \${MONTHS[b.getMonth()].slice(0, 3)} \${b.getDate()}</h2></div>
      <div class="cal wkview team"><div class="dow">\${days.map(d => \`<div>\${DOW[d.getDay()]} \${MONTHS[d.getMonth()].slice(0, 3)} \${d.getDate()}</div>\`).join("")}</div>
        <div class="grid">\${days.map(d => dayCell(d, false)).join("")}</div></div>\`;
  }
  function renderWeekFull() {`);
// The header line under the title
const builtAt = new Date().toLocaleString("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(/, (\d{1,2}:)/, " at $1");
// Next morning rebuild (7:30 AM Toronto): later today if built before 7:30, otherwise tomorrow.
const nowHM = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const nextDay = nowHM < "07:30" ? todayTO : add(todayTO, 1);
const nextLabel = new Date(nextDay + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
// When the numbers themselves were last pulled (Buffer and Meta), beside when this page was built.
const dataAt = String(D.generated || "").replace(/^(\w{3} \d+), \d{4} at /, "$1 at ");
h = h.replace(/(<div class="sub" id="sub" data-team>)[^<]*/, "$1Last updated " + builtAt + (dataAt ? " · Data as of " + dataAt : "") + " · Next update " + nextLabel + " around 7:30 AM");
fs.writeFileSync(path.join(out, "index.html"), h);
console.log(JSON.stringify({ today: todayTO, items: items.length, dataKB: Math.round(fs.statSync(path.join(out, "data.js")).size / 1024), generated: D.generated }));
