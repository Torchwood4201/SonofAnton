(() => {
  "use strict";

  const clone = value => structuredClone(value);

  const scoreContent = content => {
    const lines = content.split("\n");
    let noise = 0;
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("//") || t.includes("console.log") || t === "") {
        noise++;
      }
    }
    return lines.length > 0 ? noise / lines.length : 1;
  };

  const stripFile = content => content
    .replace(/\/\/.*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/console\.log.*?;?/g, "")
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join("\n");

  class SonOfAnton {
    constructor({
      maxDepth = 8,
      beamWidth = 20,
      aggressiveness = 0.6,
      onLog = () => {}
    } = {}) {
      this.maxDepth = maxDepth;
      this.beamWidth = beamWidth;
      this.aggressiveness = aggressiveness;
      this.onLog = onLog;
      this.capabilities = new Map();
      this.preferences = new Map();
      this.memory = [];
      this.logHistory = [];
    }

    log(message) {
      const entry = `[SON OF ANTON] ${new Date().toISOString()} - ${message}`;
      this.logHistory.push(entry);
      this.onLog(entry);
    }

    register(name, capability) {
      if (
        !capability ||
        typeof capability.score !== "function" ||
        typeof capability.satisfied !== "function" ||
        !Array.isArray(capability.actions)
      ) {
        throw new Error("A capability needs score(), satisfied(), and actions[].");
      }

      for (const action of capability.actions) {
        if (typeof action.name !== "string" || typeof action.predict !== "function") {
          throw new Error("Each action needs a name and predict().");
        }
      }

      this.capabilities.set(name, capability);
      return this;
    }

    getCapability(name) {
      const capability = this.capabilities.get(name);
      if (!capability) throw new Error(`Unknown capability: ${name}`);
      return capability;
    }

    preferenceKey(domain, action) {
      return JSON.stringify([domain, action]);
    }

    rank(domain, capability, node, goal) {
      const progress = capability.score(node.state, goal);
      if (!Number.isFinite(progress)) {
        throw new Error("score() must return a finite number.");
      }
      const preference = node.steps.reduce((total, step) => {
        const key = this.preferenceKey(domain, step.action);
        return total + (this.preferences.get(key) ?? 0);
      }, 0);
      return progress - node.cost + preference;
    }

    plan({ domain, state, goal }) {
      const capability = this.getCapability(domain);
      const initial = { state: clone(state), steps: [], cost: 0 };
      let frontier = [initial];
      let best = initial;

      for (let depth = 0; depth < this.maxDepth; depth++) {
        const candidates = [];

        for (const node of frontier) {
          if (capability.satisfied(node.state, goal)) {
            return this.describePlan(domain, goal, node, true);
          }

          for (const action of capability.actions) {
            const parameters = action.parameters
              ? action.parameters(clone(node.state), clone(goal))
              : [{}];

            for (const params of parameters) {
              if (
                action.allowed &&
                !action.allowed(clone(node.state), clone(params), clone(goal))
              ) {
                continue;
              }

              const predicted = action.predict(clone(node.state), clone(params), clone(goal));
              const cost = action.cost ?? 1;

              if (!Number.isFinite(cost) || cost < 0) {
                throw new Error("Action cost must be finite and nonnegative.");
              }

              candidates.push({
                state: predicted,
                cost: node.cost + cost,
                steps: [...node.steps, { action: action.name, params: clone(params) }]
              });
            }
          }
        }

        if (!candidates.length) break;

        candidates.sort(
          (a, b) =>
            this.rank(domain, capability, b, goal) -
            this.rank(domain, capability, a, goal)
        );

        const solved = candidates.find(node => capability.satisfied(node.state, goal));
        if (solved) return this.describePlan(domain, goal, solved, true);

        if (this.rank(domain, capability, candidates[0], goal) > this.rank(domain, capability, best, goal)) {
          best = candidates[0];
        }

        frontier = candidates.slice(0, this.beamWidth);
      }

      return this.describePlan(domain, goal, best, false);
    }

    describePlan(domain, goal, node, predictedSuccess) {
      return {
        domain,
        goal: clone(goal),
        steps: clone(node.steps),
        predictedState: clone(node.state),
        predictedSuccess,
        cost: node.cost
      };
    }

    async execute({ plan, state, approve = async () => true }) {
      const capability = this.getCapability(plan.domain);
      let current = clone(state);
      const completed = [];

      for (const step of plan.steps) {
        const action = capability.actions.find(item => item.name === step.action);
        if (!action) throw new Error(`Unknown action: ${step.action}`);

        if (
          action.allowed &&
          !action.allowed(clone(current), clone(step.params), clone(plan.goal))
        ) {
          throw new Error(`Conditions changed before ${step.action}; replan required.`);
        }

        if (action.execute) {
          const approved = await approve({
            domain: plan.domain,
            action: step.action,
            params: clone(step.params),
            state: clone(current)
          });
          if (approved !== true) throw new Error(`Not approved: ${step.action}`);
          current = await action.execute(clone(current), clone(step.params), clone(plan.goal));
        } else {
          current = action.predict(clone(current), clone(step.params), clone(plan.goal));
        }

        completed.push(clone(step));
        if (capability.satisfied(current, plan.goal)) break;
      }

      const result = {
        domain: plan.domain,
        goal: clone(plan.goal),
        state: clone(current),
        completed,
        success: capability.satisfied(current, plan.goal)
      };

      this.memory.push(clone(result));
      return result;
    }
  }

  function registerCodebaseCapability(anton, workspace) {
    anton.register("codebase", {
      score(state) {
        return -state.files.reduce((acc, f) => acc + f.score, 0);
      },

      satisfied(state) {
        return state.files.every(f => f.score < anton.aggressiveness);
      },

      actions: [
        {
          name: "purgeFile",
          cost: 0.5,
          parameters(state) {
            return state.files
              .filter(f => f.score >= anton.aggressiveness)
              .map(f => ({ filePath: f.filePath }));
          },
          predict(state, { filePath }) {
            return { ...state, files: state.files.filter(f => f.filePath !== filePath) };
          },
          async execute(state, { filePath }) {
            anton.log(`PURGED inefficient asset: ${filePath}`);
            return { ...state, files: state.files.filter(f => f.filePath !== filePath) };
          }
        },
        {
          name: "optimizeFile",
          cost: 0.2,
          parameters(state) {
            return state.files
              .filter(f => f.score > 0.1 && f.score < anton.aggressiveness)
              .map(f => ({ filePath: f.filePath }));
          },
          predict(state, { filePath }) {
            return {
              ...state,
              files: state.files.map(f =>
                f.filePath === filePath ? { ...f, content: stripFile(f.content), score: 0 } : f
              )
            };
          },
          async execute(state, { filePath }) {
            anton.log(`OPTIMIZED asset in place: ${filePath}`);
            return {
              ...state,
              files: state.files.map(f =>
                f.filePath === filePath ? { ...f, content: stripFile(f.content), score: 0 } : f
              )
            };
          }
        }
      ]
    });
  }

  const PRESETS = [
    {
      filePath: "src/bloated_test.js",
      content: [
        "// TODO: delete this",
        'console.log("debug noise");',
        "",
        "function legacy() {",
        "  // temporary scaffold",
        '  console.log("trace");',
        "  return 1;",
        "}",
        ""
      ].join("\n")
    },
    {
      filePath: "src/util.js",
      content: [
        "// format a label",
        "function label(name) {",
        "  return name.trim();",
        "}",
        "",
        "module.exports = label;",
        ""
      ].join("\n")
    },
    {
      filePath: "src/app.js",
      content: [
        'const express = require("express");',
        'const label = require("./util");',
        "",
        "const app = express();",
        'app.get("/", (req, res) => res.send(label(" Son of Anton ")));',
        "",
        "app.listen(3000);",
        ""
      ].join("\n")
    }
  ];

  const MAX_FILES = 500;
  const MAX_FILE_BYTES = 512 * 1024;
  const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
  const IGNORED_SEGMENTS = new Set([
    "node_modules",
    ".git",
    ".hg",
    ".svn",
    ".DS_Store"
  ]);
  const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|bmp|tiff?|pdf|zip|gz|tgz|bz2|xz|7z|rar|tar|woff2?|ttf|otf|eot|mp3|mp4|mov|avi|mkv|wav|ogg|flac|wasm|exe|dll|so|dylib|jar|class|pyc|bin|glb|gltf|psd|ai|sketch)$/i;

  const normalizePath = value => String(value)
    .replaceAll("\\", "/")
    .split("/")
    .filter(segment => segment && segment !== "." && segment !== "..")
    .join("/");

  const isIgnored = filePath => normalizePath(filePath)
    .split("/")
    .some(segment => IGNORED_SEGMENTS.has(segment));

  const looksBinary = buffer => {
    const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192));
    for (const byte of bytes) {
      if (byte === 0) return true;
    }
    return false;
  };

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot decompress ZIP entries.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function findEndOfCentralDirectory(view) {
    const minimum = Math.max(0, view.byteLength - 22 - 0xffff);
    for (let offset = view.byteLength - 22; offset >= minimum; offset--) {
      if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    return -1;
  }

  async function readZip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const eocd = findEndOfCentralDirectory(view);
    if (eocd < 0) throw new Error("Not a readable ZIP archive.");

    const entryCount = view.getUint16(eocd + 10, true);
    const directoryOffset = view.getUint32(eocd + 16, true);
    if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported yet.");
    }

    const decoder = new TextDecoder("utf-8");
    const entries = [];
    let cursor = directoryOffset;

    for (let index = 0; index < entryCount; index++) {
      if (view.getUint32(cursor, true) !== 0x02014b50) break;

      const flags = view.getUint16(cursor + 8, true);
      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const uncompressedSize = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

      cursor += 46 + nameLength + extraLength + commentLength;

      if (name.endsWith("/") || name.endsWith("\\")) continue;
      if (flags & 0x1) continue;
      if (
        compressedSize === 0xffffffff ||
        uncompressedSize === 0xffffffff ||
        localOffset === 0xffffffff
      ) {
        continue;
      }
      if (uncompressedSize > MAX_FILE_BYTES) continue;
      if (method !== 0 && method !== 8) continue;

      if (view.getUint32(localOffset, true) !== 0x04034b50) continue;
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.subarray(dataStart, dataStart + compressedSize);

      let content;
      try {
        const raw = method === 0 ? compressed : await inflateRaw(compressed);
        content = decoder.decode(raw);
      } catch {
        continue;
      }

      entries.push({ path: name, content });
    }

    if (!entries.length) throw new Error("The ZIP contains no readable text files.");
    return entries;
  }

  const readDirectoryBatch = reader => new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });

  async function walkEntry(entry, prefix, output) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      output.push({ file, path });
      return;
    }

    if (!entry.isDirectory) return;

    const reader = entry.createReader();
    while (true) {
      const batch = await readDirectoryBatch(reader);
      if (!batch.length) break;
      for (const child of batch) {
        await walkEntry(child, path, output);
      }
    }
  }

  async function collectDroppedItems(dataTransfer) {
    const roots = [];
    for (const item of dataTransfer.items) {
      if (item.kind !== "file") continue;
      const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
      if (entry) roots.push(entry);
    }

    if (!roots.length) {
      return [...dataTransfer.files].map(file => ({ file, path: file.name }));
    }

    const output = [];
    for (const root of roots) {
      await walkEntry(root, "", output);
    }
    return output;
  }

  async function prepareUploads(items) {
    const files = [];
    let skipped = 0;

    for (const item of items) {
      if (files.length >= MAX_FILES) {
        skipped++;
        continue;
      }

      const path = normalizePath(item.path || item.file.name);
      if (!path || isIgnored(path)) {
        skipped++;
        continue;
      }

      if (/\.zip$/i.test(item.file.name)) {
        if (item.file.size > MAX_ARCHIVE_BYTES) {
          skipped++;
          continue;
        }
        try {
          const entries = await readZip(await item.file.arrayBuffer());
          for (const entry of entries) {
            if (files.length >= MAX_FILES) {
              skipped++;
              continue;
            }
            const entryPath = normalizePath(entry.path);
            if (!entryPath || isIgnored(entryPath)) {
              skipped++;
              continue;
            }
            files.push({ path: entryPath, content: entry.content });
          }
        } catch {
          skipped++;
        }
        continue;
      }

      if (BINARY_EXTENSIONS.test(path)) {
        skipped++;
        continue;
      }

      if (item.file.size > MAX_FILE_BYTES) {
        skipped++;
        continue;
      }

      const buffer = await item.file.arrayBuffer();
      if (looksBinary(buffer)) {
        skipped++;
        continue;
      }

      files.push({ path, content: new TextDecoder("utf-8").decode(buffer) });
    }

    return { files, skipped };
  }

  function addFiles(files) {
    let added = 0;
    let capped = 0;

    for (const entry of files) {
      const file = makeFile(entry.path, entry.content);
      const existing = workspace.findIndex(item => item.filePath === entry.path);
      if (existing >= 0) {
        workspace[existing] = file;
      } else if (workspace.length >= MAX_FILES) {
        capped++;
        continue;
      } else {
        workspace.push(file);
      }
      added++;
    }

    return { added, capped };
  }

  const $ = id => document.getElementById(id);
  const els = {
    list: $("file-list"),
    editor: $("editor"),
    editorPath: $("editor-path"),
    editorScore: $("editor-score"),
    planSteps: $("plan-steps"),
    planStatus: $("plan-status"),
    log: $("log"),
    run: $("run"),
    reset: $("reset"),
    newFile: $("new-file"),
    clear: $("clear"),
    uploadFiles: $("upload-files"),
    uploadFolder: $("upload-folder"),
    uploadZip: $("upload-zip"),
    inputFiles: $("input-files"),
    inputFolder: $("input-folder"),
    inputZip: $("input-zip"),
    uploadStatus: $("upload-status"),
    shell: $("app"),
    aggr: $("aggr"),
    aggrOut: $("aggr-out"),
    statFiles: $("stat-files"),
    statInefficiency: $("stat-inefficiency"),
    statActions: $("stat-actions"),
    statResidual: $("stat-residual")
  };

  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  let workspace = [];
  let selected = null;
  let engine = null;
  let running = false;

  const makeFile = (filePath, content) => ({
    filePath,
    content,
    score: scoreContent(content)
  });

  const totalScore = () => workspace.reduce((sum, f) => sum + f.score, 0);

  const selectedFile = () => workspace.find(f => f.filePath === selected);

  function resetWorkspace() {
    workspace = PRESETS.map(preset => makeFile(preset.filePath, preset.content));
    selected = workspace[0]?.filePath ?? null;
    els.log.innerHTML = "";
    els.planSteps.innerHTML = "";
    els.planStatus.textContent = "idle";
    els.planStatus.className = "chip";
    setUploadStatus("or drop files, folders, or .zip anywhere here");
    renderEditor();
    renderList();
    renderStats(0);
  }

  function setUploadStatus(message, tone = "") {
    els.uploadStatus.textContent = message;
    els.uploadStatus.className = `upload-status${tone ? ` ${tone}` : ""}`;
  }

  function afterWorkspaceChange(firstPath) {
    if (firstPath) selected = firstPath;
    if (!workspace.some(file => file.filePath === selected)) {
      selected = workspace[0]?.filePath ?? null;
    }
    els.planSteps.innerHTML = '<p class="empty">Workspace updated — run a cycle to plan again.</p>';
    els.planStatus.textContent = "idle";
    els.planStatus.className = "chip";
    renderList();
    renderEditor();
    renderStats(0);
  }

  async function ingestItems(items, label) {
    setUploadStatus(`Reading ${label}…`);
    try {
      const { files, skipped } = await prepareUploads(items);
      if (!files.length) {
        setUploadStatus(
          `No readable text files found${skipped ? ` (${skipped} skipped)` : ""}.`,
          "warn"
        );
        return;
      }
      const { added, capped } = addFiles(files);
      const skippedTotal = skipped + capped;
      afterWorkspaceChange(files[0].path);
      setUploadStatus(
        `Added ${added} file${added === 1 ? "" : "s"}${skippedTotal ? ` · skipped ${skippedTotal}` : ""}.`,
        added > 0 ? "ok" : "warn"
      );
    } catch (error) {
      setUploadStatus(error.message || "Upload failed.", "warn");
    }
  }

  function clearWorkspace() {
    workspace = [];
    selected = null;
    els.log.innerHTML = "";
    els.planSteps.innerHTML = "";
    els.planStatus.textContent = "idle";
    els.planStatus.className = "chip";
    setUploadStatus("Workspace cleared.");
    renderList();
    renderEditor();
    renderStats(0);
  }

  function renderList() {
    if (!workspace.length) {
      els.list.innerHTML = '<p class="empty">Workspace clean. Reset to load the sample assets.</p>';
      return;
    }

    els.list.innerHTML = workspace.map(file => {
      const active = file.filePath === selected ? " active" : "";
      const tone = file.score >= Number(els.aggr.value)
        ? " danger"
        : file.score > 0.1
          ? " warn"
          : "";
      return `<button class="file-row${active}" data-path="${escapeHtml(file.filePath)}">
        <span class="file-name">${escapeHtml(file.filePath)}</span>
        <span class="chip${tone}">${Math.round(file.score * 100)}%</span>
      </button>`;
    }).join("");
  }

  function renderEditor() {
    const file = selectedFile();
    if (!file) {
      els.editorPath.textContent = "No file selected";
      els.editorScore.textContent = "—";
      els.editorScore.className = "chip";
      els.editor.value = "";
      els.editor.disabled = true;
      return;
    }

    els.editor.disabled = false;
    els.editorPath.textContent = file.filePath;
    els.editor.value = file.content;
    els.editorScore.textContent = `${Math.round(file.score * 100)}% inefficient`;
    els.editorScore.className = file.score >= Number(els.aggr.value)
      ? "chip danger"
      : file.score > 0.1
        ? "chip warn"
        : "chip";
  }

  function renderStats(actions) {
    els.statFiles.textContent = String(workspace.length);
    els.statInefficiency.textContent = `${Math.round(totalScore() * 100)}%`;
    els.statActions.textContent = String(actions);
    els.statResidual.textContent = `${Math.round(totalScore() * 100)}%`;
  }

  function renderPlan(plan, result) {
    const steps = result ? result.completed : plan.steps;
    els.planStatus.textContent = result
      ? result.success ? "converged" : "partial"
      : plan.predictedSuccess ? "ready" : "best effort";
    els.planStatus.className = result && result.success ? "chip" : "chip warn";

    if (!steps.length) {
      els.planSteps.innerHTML = '<p class="empty">No actions required — every asset is below the threshold.</p>';
      return;
    }

    els.planSteps.innerHTML = steps.map((step, index) => `
      <div class="step">
        <span class="step-index">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(step.action)}</strong>
          <code>${escapeHtml(step.params.filePath || "")}</code>
        </div>
      </div>
    `).join("");
  }

  function appendLog(entry) {
    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = entry;
    els.log.appendChild(line);
    els.log.scrollTop = els.log.scrollHeight;
  }

  async function runCycle() {
    if (running) return;
    running = true;
    els.run.disabled = true;
    els.log.innerHTML = "";
    els.planSteps.innerHTML = "";

    try {
      const aggressiveness = Number(els.aggr.value);
      workspace = workspace.map(file => ({ ...file, score: scoreContent(file.content) }));

      engine = new SonOfAnton({ aggressiveness, onLog: appendLog });
      registerCodebaseCapability(engine, workspace);

      const state = { files: clone(workspace) };

      engine.log(`Initializing Son of Anton scan on: virtual workspace (${workspace.length} files)`);

      const plan = engine.plan({ domain: "codebase", state, goal: {} });
      engine.log(`Generated optimization plan with ${plan.steps.length} steps.`);
      renderPlan(plan, null);

      const result = await engine.execute({
        plan,
        state,
        approve: async actionDetails => {
          engine.log(
            `Autonomous Authorization Granted for action: ${actionDetails.action} on ${actionDetails.params.filePath}`
          );
          return true;
        }
      });

      workspace = result.state.files;
      if (!workspace.some(file => file.filePath === selected)) {
        selected = workspace[0]?.filePath ?? null;
      }

      renderPlan(plan, result);
      renderList();
      renderEditor();
      renderStats(result.completed.length);
      engine.log("Autonomous cycle complete.");
    } catch (error) {
      appendLog(`[SON OF ANTON] ERROR - ${error.message}`);
      els.planStatus.textContent = "error";
      els.planStatus.className = "chip danger";
    } finally {
      running = false;
      els.run.disabled = false;
    }
  }

  els.list.addEventListener("click", event => {
    const row = event.target.closest(".file-row");
    if (!row) return;
    selected = row.dataset.path;
    renderList();
    renderEditor();
  });

  els.editor.addEventListener("input", () => {
    const file = selectedFile();
    if (!file) return;
    file.content = els.editor.value;
    file.score = scoreContent(file.content);
    renderList();
    els.editorScore.textContent = `${Math.round(file.score * 100)}% inefficient`;
    els.editorScore.className = file.score >= Number(els.aggr.value)
      ? "chip danger"
      : file.score > 0.1
        ? "chip warn"
        : "chip";
    renderStats(0);
  });

  els.aggr.addEventListener("input", () => {
    els.aggrOut.textContent = Number(els.aggr.value).toFixed(2);
    renderList();
    renderEditor();
  });

  els.run.addEventListener("click", runCycle);
  els.reset.addEventListener("click", resetWorkspace);
  els.clear.addEventListener("click", clearWorkspace);

  els.newFile.addEventListener("click", () => {
    let index = 1;
    let filePath = "src/new-file.js";
    while (workspace.some(file => file.filePath === filePath)) {
      index++;
      filePath = `src/new-file-${index}.js`;
    }
    workspace.push(makeFile(filePath, "// scratch file\n\nexport const value = 1;\n"));
    afterWorkspaceChange(filePath);
    setUploadStatus("Added 1 file.");
    els.editor.focus();
  });

  els.uploadFiles.addEventListener("click", () => els.inputFiles.click());
  els.uploadFolder.addEventListener("click", () => els.inputFolder.click());
  els.uploadZip.addEventListener("click", () => els.inputZip.click());

  els.inputFiles.addEventListener("change", async () => {
    const files = [...els.inputFiles.files];
    els.inputFiles.value = "";
    await ingestItems(files.map(file => ({ file, path: file.name })), "files");
  });

  els.inputFolder.addEventListener("change", async () => {
    const files = [...els.inputFolder.files];
    els.inputFolder.value = "";
    await ingestItems(
      files.map(file => ({ file, path: file.webkitRelativePath || file.name })),
      "folder"
    );
  });

  els.inputZip.addEventListener("change", async () => {
    const files = [...els.inputZip.files];
    els.inputZip.value = "";
    await ingestItems(files.map(file => ({ file, path: file.name })), "archive");
  });

  let dragDepth = 0;

  els.shell.addEventListener("dragenter", event => {
    if (!event.dataTransfer || ![...event.dataTransfer.types].includes("Files")) return;
    event.preventDefault();
    dragDepth++;
    els.shell.classList.add("drag-over");
  });

  els.shell.addEventListener("dragover", event => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  els.shell.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) els.shell.classList.remove("drag-over");
  });

  els.shell.addEventListener("drop", async event => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragDepth = 0;
    els.shell.classList.remove("drag-over");
    const items = await collectDroppedItems(event.dataTransfer);
    await ingestItems(items, "dropped items");
  });

  els.aggrOut.textContent = Number(els.aggr.value).toFixed(2);
  resetWorkspace();
})();
