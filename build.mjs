import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const output = join(root, 'dist')
const escape = value => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const slug = value => value
  .replace(/<[^>]*>/g, '')
  .replace(/[`*_]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

function inline(text) {
  const codes = []
  let value = escape(text)
  value = value.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code)
    return `\u0000${codes.length - 1}\u0000`
  })
  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2" loading="lazy">')
  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return value.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`)
}

const blockStart = line => /^\s*$/.test(line)
  || /^\s*```/.test(line)
  || /^#{1,6}\s+/.test(line)
  || /^\s*([-*+]|\d+\.)\s+/.test(line)
  || /^\s*(-{3,}|\*{3,})\s*$/.test(line)
  || /^\s*>\s?/.test(line)

function markdown(source) {
  const lines = source.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
  const blocks = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (/^\s*$/.test(line)) {
      index++
      continue
    }
    const fence = line.match(/^\s*```\s*([\w-]*)/)
    if (fence) {
      const language = fence[1]
      const code = []
      index++
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++])
      index++
      blocks.push(`<pre class="code-block${language ? ` language-${escape(language)}` : ''}"><code>${escape(code.join('\n'))}</code></pre>`)
      continue
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6)
      const label = heading[2].trim()
      blocks.push(`<h${level} id="${slug(label)}">${inline(label)}</h${level}>`)
      index++
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push('<hr>')
      index++
      continue
    }
    const unordered = line.match(/^\s*[-*+]\s+(.*)$/)
    if (unordered) {
      const items = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*+]\s+(.*)$/)
        if (!item) break
        items.push(`<li>${inline(item[1])}</li>`)
        index++
      }
      blocks.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ordered) {
      const items = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+\.\s+(.*)$/)
        if (!item) break
        items.push(`<li>${inline(item[1])}</li>`)
        index++
      }
      blocks.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    const quote = line.match(/^\s*>\s?(.*)$/)
    if (quote) {
      const parts = []
      while (index < lines.length) {
        const part = lines[index].match(/^\s*>\s?(.*)$/)
        if (!part) break
        parts.push(part[1])
        index++
      }
      blocks.push(`<blockquote>${inline(parts.join(' '))}</blockquote>`)
      continue
    }
    const paragraph = [line.trim()]
    index++
    while (index < lines.length && !blockStart(lines[index])) paragraph.push(lines[index++].trim())
    blocks.push(`<p>${inline(paragraph.join(' '))}</p>`)
  }
  return blocks.join('\n')
}

const readme = readFileSync(join(root, 'README.md'), 'utf8')
  .replace(/^#\s*SonOfAnton\s*$/im, '')
const body = markdown(readme)
const clientScript = readFileSync(join(root, 'app.browser.js'), 'utf8')

const styles = `
:root {
  color-scheme: dark;
  --bg: #070b12;
  --panel: rgba(16, 24, 38, 0.72);
  --line: rgba(126, 161, 255, 0.16);
  --text: #dbe6ff;
  --muted: #8ba0c4;
  --accent: #7c6cff;
  --accent-2: #35d6c4;
  --warm: #ffb86b;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(900px 500px at 12% -10%, rgba(124, 108, 255, 0.3), transparent 60%),
    radial-gradient(800px 500px at 90% 0%, rgba(53, 214, 196, 0.16), transparent 55%),
    radial-gradient(700px 600px at 50% 110%, rgba(255, 184, 107, 0.08), transparent 60%),
    linear-gradient(180deg, #070b12 0%, #080d16 60%, #070b12 100%);
}
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  opacity: 0.35;
  background-image: linear-gradient(rgba(126, 161, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(126, 161, 255, 0.06) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 20%, black, transparent 75%);
}
a { color: var(--accent-2); text-decoration: none; }
a:hover { text-decoration: underline; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px clamp(20px, 5vw, 64px);
  border-bottom: 1px solid var(--line);
  background: rgba(7, 11, 18, 0.82);
  backdrop-filter: blur(18px);
}
.brand { display: flex; align-items: center; gap: 12px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #081018;
  font-weight: 900;
  box-shadow: 0 8px 26px rgba(124, 108, 255, 0.35);
}
nav { display: flex; gap: 22px; margin-left: auto; font-size: 0.92rem; }
nav a { color: var(--muted); }
nav a:hover { color: var(--text); text-decoration: none; }
.badge {
  padding: 6px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--accent-2);
  background: rgba(53, 214, 196, 0.08);
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
.hero { padding: clamp(56px, 9vw, 112px) 0 clamp(36px, 5vw, 64px); position: relative; }
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  color: var(--accent-2);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.eyebrow::before { content: ""; width: 26px; height: 1px; background: currentColor; }
h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(2.6rem, 7vw, 5.5rem);
  line-height: 1.02;
  letter-spacing: -0.045em;
}
h1 span {
  background: linear-gradient(100deg, #b4a8ff 0%, #35d6c4 55%, #ffcf9a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.lede { max-width: 660px; margin: 26px 0 0; color: var(--muted); font-size: clamp(1.02rem, 1.6vw, 1.22rem); }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 34px 0 0; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-weight: 650;
  font-size: 0.94rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.btn:hover { transform: translateY(-2px); text-decoration: none; }
.btn.primary { background: linear-gradient(135deg, var(--accent), #9b8cff); color: white; box-shadow: 0 12px 34px rgba(124, 108, 255, 0.32); }
.btn.ghost { border-color: var(--line); color: var(--text); background: rgba(16, 24, 38, 0.6); }
.btn.ghost:hover { border-color: rgba(126, 161, 255, 0.42); }
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 54px 0 0;
}
.stat { padding: 18px 20px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); backdrop-filter: blur(12px); }
.stat dt { color: var(--muted); font-size: 0.74rem; letter-spacing: 0.1em; text-transform: uppercase; }
.stat dd { margin: 7px 0 0; font-size: 1.28rem; font-weight: 700; letter-spacing: -0.01em; }
.content-wrap { padding-bottom: 90px; }
.prose {
  padding: clamp(28px, 5vw, 58px);
  border: 1px solid var(--line);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(16, 24, 38, 0.86), rgba(11, 17, 28, 0.9));
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
}
.prose > :first-child { margin-top: 0; }
.prose h2, .prose h3, .prose h4 { scroll-margin-top: 100px; letter-spacing: -0.02em; line-height: 1.25; }
.prose h2 { margin: 2.2em 0 0.6em; font-size: clamp(1.5rem, 2.6vw, 2rem); }
.prose h3 { margin: 1.9em 0 0.5em; font-size: 1.25rem; color: #c9d7ff; }
.prose h4 { margin: 1.6em 0 0.4em; font-size: 1.05rem; color: #c9d7ff; }
.prose p, .prose li { color: #b7c6e2; }
.prose strong { color: var(--text); }
.prose ul, .prose ol { padding-left: 1.3em; }
.prose li { margin: 0.35em 0; }
.prose hr { margin: 2.2em 0; border: 0; border-top: 1px solid var(--line); }
.prose blockquote { margin: 1.5em 0; padding: 0.4em 1.2em; border-left: 3px solid var(--accent); color: var(--muted); }
.prose :not(pre) > code {
  padding: 0.14em 0.4em;
  border: 1px solid rgba(126, 161, 255, 0.2);
  border-radius: 6px;
  background: rgba(124, 108, 255, 0.12);
  color: #d8d2ff;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.88em;
}
.code-block {
  margin: 1.3em 0;
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #05080e;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}
.code-block code {
  display: block;
  padding: 20px 22px;
  color: #c6d4f0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.82rem;
  line-height: 1.65;
  white-space: pre;
}
.prose img { max-width: 100%; height: auto; vertical-align: middle; }
footer {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 46px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.84rem;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  justify-content: space-between;
}
@media (max-width: 860px) {
  .site-header { gap: 16px; padding: 12px 20px; }
  nav { display: none; }
  .badge { margin-left: auto; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 40px; }
}
@media (max-width: 520px) {
  main { width: min(100% - 28px, 1120px); }
  .brand { font-size: 0.95rem; }
  .badge { display: none; }
  .hero { padding-top: 46px; }
  .actions .btn { flex: 1 1 100%; }
  .stats { gap: 10px; }
  .stat { padding: 14px 15px; }
  .stat dd { font-size: 1.05rem; }
  .prose { padding: 24px 18px; border-radius: 18px; }
  footer { width: calc(100% - 28px); }
}
.app-shell {
  margin: 0 0 clamp(40px, 6vw, 72px);
  padding: clamp(20px, 3.4vw, 34px);
  border: 1px solid var(--line);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(16, 24, 38, 0.9), rgba(9, 14, 23, 0.94));
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.4);
}
.app-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.app-head h2 { margin: 0; font-size: clamp(1.6rem, 3vw, 2.2rem); letter-spacing: -0.03em; line-height: 1.15; }
.app-sub { max-width: 580px; margin: 8px 0 0; color: var(--muted); font-size: 0.95rem; }
.app-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.range {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(7, 11, 18, 0.45);
  color: var(--muted);
  font-size: 0.82rem;
}
.range input { width: 110px; accent-color: var(--accent-2); }
.range output { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
.upload-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; }
.upload-bar .mini { padding: 7px 12px; font-size: 0.76rem; font-weight: 600; letter-spacing: 0.01em; text-transform: none; }
.upload-status { margin-left: 2px; color: var(--muted); font-size: 0.76rem; }
.upload-status.ok { color: var(--accent-2); }
.upload-status.warn { color: var(--warm); }
.app-shell.drag-over { border-color: var(--accent-2); box-shadow: 0 0 0 1px var(--accent-2), 0 30px 90px rgba(0, 0, 0, 0.4); }
.app-grid { display: grid; grid-template-columns: 220px minmax(0, 1.3fr) minmax(260px, 0.9fr); gap: 12px; }
.pane { display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--line); border-radius: 14px; background: rgba(5, 8, 14, 0.72); overflow: hidden; }
.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pane-head .chip { text-transform: none; letter-spacing: 0.03em; }
.mini {
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: rgba(124, 108, 255, 0.12);
  color: var(--text);
  font: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.mini:hover { border-color: rgba(126, 161, 255, 0.42); }
.file-list { display: flex; flex-direction: column; gap: 4px; padding: 8px; overflow: auto; max-height: 480px; }
.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
}
.file-row:hover { background: rgba(124, 108, 255, 0.1); }
.file-row.active { border-color: rgba(126, 161, 255, 0.35); background: rgba(124, 108, 255, 0.16); }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip {
  padding: 2px 7px;
  border: 1px solid rgba(53, 214, 196, 0.25);
  border-radius: 999px;
  background: rgba(53, 214, 196, 0.1);
  color: var(--accent-2);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.chip.warn { color: var(--warm); background: rgba(255, 184, 107, 0.1); border-color: rgba(255, 184, 107, 0.28); }
.chip.danger { color: #ff8b9a; background: rgba(255, 90, 110, 0.12); border-color: rgba(255, 90, 110, 0.32); }
#editor {
  flex: 1;
  min-height: 320px;
  resize: vertical;
  padding: 14px 16px;
  border: 0;
  outline: none;
  background: #05080e;
  color: #c6d4f0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.8rem;
  line-height: 1.65;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}
#editor:disabled { color: var(--muted); }
.editor-path { text-transform: none; letter-spacing: 0.01em; color: var(--text); font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.76rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.steps { display: flex; flex-direction: column; gap: 6px; padding: 10px; overflow: auto; max-height: 200px; }
.step { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(16, 24, 38, 0.55); font-size: 0.78rem; }
.step-index { color: var(--accent-2); font-weight: 700; font-variant-numeric: tabular-nums; }
.step strong { display: block; color: var(--text); font-size: 0.8rem; }
.step code { color: var(--muted); font-size: 0.74rem; word-break: break-all; font-family: "SFMono-Regular", Consolas, monospace; }
.log {
  flex: 1;
  min-height: 180px;
  max-height: 236px;
  overflow: auto;
  padding: 12px;
  border-top: 1px solid var(--line);
  background: #05080e;
  color: #8fa7cc;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.72rem;
  line-height: 1.6;
}
.log-line { white-space: pre-wrap; word-break: break-word; }
.empty { margin: 10px; color: var(--muted); font-size: 0.78rem; line-height: 1.5; }
.app-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 12px 0 0; }
.app-stats div { padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(16, 24, 38, 0.5); }
.app-stats dt { color: var(--muted); font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; }
.app-stats dd { margin: 3px 0 0; font-size: 1.02rem; font-weight: 700; font-variant-numeric: tabular-nums; }
@media (max-width: 980px) {
  .app-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .files { grid-column: 1 / -1; }
  .file-list { flex-direction: row; flex-wrap: wrap; max-height: none; }
  .file-row { width: auto; }
}
@media (max-width: 640px) {
  .app-grid { grid-template-columns: minmax(0, 1fr); }
  .app-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .btn { transition: none; }
}
`

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Son of Anton — Local autonomous optimization</title>
<meta name="description" content="A deterministic, local automation engine that scores code quality, plans refactors, and purges inefficiency without external dependencies.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%237c6cff'/%3E%3Cpath d='M9 23 16 8l7 15h-4l-3-7-3 7z' fill='%23070b12'/%3E%3C/svg%3E">
<style>${styles}</style>
</head>
<body>
<header class="site-header">
  <div class="brand"><span class="brand-mark">A</span> Son of Anton</div>
  <nav aria-label="Primary">
    <a href="#app">Run</a>
    <a href="#overview">Overview</a>
    <a href="#architecture-core-mechanics">Architecture</a>
    <a href="#installation-setup">Install</a>
    <a href="#implementation-code-son-of-anton-cjs">Source</a>
  </nav>
  <span class="badge">Local · Zero API keys</span>
</header>
<main>
  <section class="hero">
    <p class="eyebrow">Deterministic automation engine</p>
    <h1>Build less.<br><span>Optimize everything.</span></h1>
    <p class="lede">A standalone, goal-directed planner that scores local assets, plans refactors, and purges inefficiency — entirely on your machine.</p>
    <div class="actions">
      <a class="btn primary" href="#app">Run the engine</a>
      <a class="btn ghost" href="#implementation-code-son-of-anton-cjs">Read the source</a>
    </div>
    <dl class="stats">
      <div class="stat"><dt>Dependencies</dt><dd>Zero</dd></div>
      <div class="stat"><dt>Search depth</dt><dd>8 levels</dd></div>
      <div class="stat"><dt>Beam width</dt><dd>20 nodes</dd></div>
      <div class="stat"><dt>Runtime</dt><dd>Node.js + browser</dd></div>
    </dl>
  </section>
  <section class="app-shell" id="app">
    <div class="app-head">
      <div>
        <p class="eyebrow">Live engine · sandboxed in your browser</p>
        <h2>Run Son of Anton</h2>
        <p class="app-sub">Edit the virtual workspace, then let the planner score, refactor, and purge. Nothing here touches your real files.</p>
      </div>
      <div class="app-controls">
        <label class="range" for="aggr">Aggressiveness
          <input id="aggr" type="range" min="0.1" max="0.9" step="0.05" value="0.5">
          <output id="aggr-out" for="aggr">0.50</output>
        </label>
        <button class="btn ghost" id="reset" type="button">Reset</button>
        <button class="btn primary" id="run" type="button">Run cycle</button>
      </div>
    </div>
    <div class="upload-bar">
      <button class="mini" id="upload-files" type="button">Upload files</button>
      <button class="mini" id="upload-folder" type="button">Upload folder</button>
      <button class="mini" id="upload-zip" type="button">Upload .zip</button>
      <button class="mini" id="clear" type="button">Clear</button>
      <span class="upload-status" id="upload-status" role="status" aria-live="polite">or drop files, folders, or .zip anywhere here</span>
      <input id="input-files" type="file" multiple hidden>
      <input id="input-folder" type="file" webkitdirectory directory multiple hidden>
      <input id="input-zip" type="file" accept=".zip,application/zip" hidden>
    </div>
    <div class="app-grid">
      <aside class="pane files">
        <div class="pane-head"><span>Workspace</span><button class="mini" id="new-file" type="button">+ File</button></div>
        <div id="file-list" class="file-list"></div>
      </aside>
      <section class="pane">
        <div class="pane-head"><span id="editor-path" class="editor-path">No file selected</span><span id="editor-score" class="chip">—</span></div>
        <textarea id="editor" spellcheck="false" aria-label="File contents"></textarea>
      </section>
      <section class="pane">
        <div class="pane-head"><span>Planner output</span><span id="plan-status" class="chip">idle</span></div>
        <div id="plan-steps" class="steps"></div>
        <div id="log" class="log" aria-live="polite"></div>
      </section>
    </div>
    <dl class="app-stats">
      <div><dt>Assets</dt><dd id="stat-files">0</dd></div>
      <div><dt>Inefficiency</dt><dd id="stat-inefficiency">0%</dd></div>
      <div><dt>Actions</dt><dd id="stat-actions">0</dd></div>
      <div><dt>Residual</dt><dd id="stat-residual">0%</dd></div>
    </dl>
  </section>
  <section class="content-wrap">
    <article class="prose">
${body}
    </article>
  </section>
</main>
<footer>
  <span>Son of Anton · Autonomous optimization, locally.</span>
  <span>Deterministic by design · No cloud calls</span>
</footer>
<script>${clientScript}</script>
</body>
</html>
`

if (existsSync(output)) rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
writeFileSync(join(output, 'index.html'), page)
console.log(`Built ${join(output, 'index.html')} (${Buffer.byteLength(page)} bytes)`)
