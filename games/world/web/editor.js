const canvas = document.getElementById("layout");
const ctx = canvas.getContext("2d");
const el = {
  list: document.getElementById("placement-list"),
  id: document.getElementById("field-id"),
  x: document.getElementById("field-x"),
  z: document.getElementById("field-z"),
  yaw: document.getElementById("field-yaw"),
  persistent: document.getElementById("field-persistent"),
  definitionPath: document.getElementById("definition-path"),
  definition: document.getElementById("definition-json"),
  ruleSelect: document.getElementById("rule-select"),
  rule: document.getElementById("rule-json"),
  dirty: document.getElementById("dirty"),
  log: document.getElementById("log"),
  undo: document.getElementById("undo"),
  redo: document.getElementById("redo"),
  dataForm: document.getElementById("data-form"),
  schemaForm: document.getElementById("schema-form"),
  dialogueSelect: document.getElementById("dialogue-select"),
  dialogueCanvas: document.getElementById("dialogue-canvas"),
  nodeId: document.getElementById("node-id"),
  nodeSpeaker: document.getElementById("node-speaker"),
  nodeNext: document.getElementById("node-next"),
  nodeEnd: document.getElementById("node-end"),
  nodeText: document.getElementById("node-text"),
  nodeChoices: document.getElementById("node-choices"),
};

let packData = null;
let manifest = null;
let world = null;
let zoneKey = null;
let zone = null;
let selected = 0;
let currentRuleKey = null;
let dragging = false;
let dragOffset = null;
let dirty = new Set();
let lines = [];
let undoStack = [];
let redoStack = [];
let currentDialogueKey = null;
let selectedNode = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

function log(text) {
  lines.push(String(text));
  if (lines.length > 40) lines.shift();
  el.log.textContent = lines.join("\n");
}

function markDirty(path) {
  dirty.add(path);
  el.dirty.textContent = `有未保存改动（${dirty.size}）`;
  el.dirty.classList.add("changed");
}

function markClean(path) {
  dirty.delete(path);
  if (dirty.size === 0) {
    el.dirty.textContent = "已保存";
    el.dirty.classList.remove("changed");
  } else {
    el.dirty.textContent = `有未保存改动（${dirty.size}）`;
  }
}

function cloneFiles() {
  return structuredClone(packData.files);
}

function pushUndo() {
  if (!packData) return;
  undoStack.push(cloneFiles());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function updateUndoButtons() {
  el.undo.disabled = undoStack.length === 0;
  el.redo.disabled = redoStack.length === 0;
}

function restoreFiles(files) {
  packData.files = files;
  manifest = files["pack.json"];
  world = files[manifest.entry.world];
  zone = files[zoneKey];
  if (!zone) {
    zoneKey = pickZone();
    zone = files[zoneKey];
  }
  if (selected >= (zone?.placements?.length ?? 0)) selected = 0;
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(cloneFiles());
  restoreFiles(undoStack.pop());
  refreshAll();
  log("撤销");
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(cloneFiles());
  restoreFiles(redoStack.pop());
  refreshAll();
  log("重做");
}

function refreshAll() {
  renderList();
  syncInspector();
  setupRules();
  setupDialogues();
  draw();
  updateUndoButtons();
}

function filesUnder(prefix) {
  return Object.keys(packData.files).filter((k) => k.startsWith(prefix)).sort();
}

function placementLabel(placement, index) {
  const kind = placement.actor ? "actor" : placement.prop ? "prop" : placement.item ? "item" : "?";
  const id = placement.actor ?? placement.prop ?? placement.item ?? "?";
  return `${index}. ${id} · ${kind} · ${placement.persistent_id}`;
}

function currentPlacement() {
  return zone?.placements?.[selected] ?? null;
}

function findDefinitionPath(kind, id) {
  const prefix = kind === "actor" ? "world/actors/"
    : kind === "prop" ? "world/props/"
    : "world/items/";
  const found = Object.keys(packData.files)
    .find((key) => key.startsWith(prefix) && packData.files[key]?.id === id);
  return found ?? `${prefix}${id}.json`;
}

function definitionPathFor(placement) {
  if (!placement) return null;
  if (placement.actor) return findDefinitionPath("actor", placement.actor);
  if (placement.prop) return findDefinitionPath("prop", placement.prop);
  if (placement.item) return findDefinitionPath("item", placement.item);
  return null;
}

function syncInspector() {
  const placement = currentPlacement();
  if (!placement) {
    el.id.value = "";
    el.definition.value = "";
    el.definitionPath.textContent = "未选中实体";
    return;
  }
  el.id.value = placement.actor ?? placement.prop ?? placement.item ?? "";
  el.x.value = String(placement.at[0]);
  el.z.value = String(placement.at[2]);
  el.yaw.value = String(placement.yaw ?? 0);
  el.persistent.value = placement.persistent_id;

  const path = definitionPathFor(placement);
  el.definitionPath.textContent = path ?? "找不到定义";
  const definition = path ? packData.files[path] : null;
  el.definition.value = definition ? JSON.stringify(definition, null, 2) : "";
  renderDataForm();
}

function formField(labelText, value, onInput, options = {}) {
  const label = document.createElement("label");
  label.textContent = labelText;
  let input;
  if (options.select) {
    input = document.createElement("select");
    for (const option of options.select) {
      const node = document.createElement("option");
      node.value = option;
      node.textContent = option;
      input.append(node);
    }
    input.value = String(value ?? "");
  } else {
    input = document.createElement("input");
    input.type = options.type ?? "text";
    if (options.step) input.step = options.step;
    input.value = String(value ?? "");
  }
  input.addEventListener("focus", pushUndo);
  input.addEventListener("input", () => onInput(input.value));
  input.addEventListener("change", () => onInput(input.value));
  label.append(input);
  return label;
}

function schemaLabel(path) {
  return path.replace(/\./g, " · ").replace(/\[\d+\]/g, "[]");
}

function schemaInput(path, value, parent, key, onChange) {
  const label = document.createElement("label");
  label.className = "schema-field";
  label.dataset.path = path;
  label.append(document.createTextNode(schemaLabel(path)));
  if (value !== null && typeof value === "object") {
    if (Array.isArray(value)) {
      const input = document.createElement("textarea");
      input.rows = Math.min(6, Math.max(2, JSON.stringify(value).length / 60 + 1));
      input.value = JSON.stringify(value, null, 2);
      input.spellcheck = false;
      input.addEventListener("focus", pushUndo);
      input.addEventListener("change", () => {
        try {
          const parsed = JSON.parse(input.value);
          if (!Array.isArray(parsed)) throw new Error("必须是数组");
          input.classList.remove("invalid");
          onChange(parsed);
        } catch (error) {
          input.classList.add("invalid");
          log(`Schema ${path}: ${error.message}`);
        }
      });
      label.append(input);
      return label;
    }
    const fieldset = document.createElement("fieldset");
    fieldset.className = "schema-group";
    const legend = document.createElement("legend");
    legend.textContent = schemaLabel(path);
    fieldset.append(legend);
    for (const [childKey, child] of Object.entries(value)) {
      fieldset.append(schemaInput(`${path}.${childKey}`, child, value, childKey, (next) => {
        value[childKey] = next;
        onChange(value);
      }));
    }
    return fieldset;
  }
  let input;
  if (typeof value === "boolean") {
    input = document.createElement("select");
    for (const option of ["true", "false"]) {
      const node = document.createElement("option");
      node.value = option; node.textContent = option; input.append(node);
    }
    input.value = String(value);
  } else {
    input = document.createElement("input");
    input.type = typeof value === "number" ? "number" : "text";
    if (typeof value === "number") input.step = "any";
    input.value = value === null || value === undefined ? "" : String(value);
    if (path === "id") input.readOnly = true;
  }
  input.addEventListener("focus", pushUndo);
  const apply = () => {
    let next = input.value;
    if (typeof value === "number") next = Number(next);
    if (typeof value === "boolean") next = next === "true";
    if (value === null && next === "") next = null;
    parent[key] = next;
    onChange(parent);
  };
  input.addEventListener("change", apply);
  label.append(input);
  return label;
}

function renderSchemaForm(def, path) {
  if (!el.schemaForm) return;
  el.schemaForm.replaceChildren();
  const update = () => { markDirty(path); el.definition.value = JSON.stringify(def, null, 2); };
  for (const [key, value] of Object.entries(def)) {
    el.schemaForm.append(schemaInput(key, value, def, key, update));
  }
  if (Object.keys(def).length === 0) {
    el.schemaForm.innerHTML = '<p class="muted">定义为空</p>';
  }
}

function renderDataForm() {
  el.dataForm.replaceChildren();
  const placement = currentPlacement();
  const path = definitionPathFor(placement);
  const def = path ? packData.files[path] : null;
  if (!def) {
    el.dataForm.innerHTML = '<p class="muted">未选中实体</p>';
    if (el.schemaForm) el.schemaForm.innerHTML = '<p class="muted">未选中实体</p>';
    return;
  }
  const isActor = path.includes("/actors/");
  const isProp = path.includes("/props/");
  const update = () => {
    markDirty(path);
    el.definition.value = JSON.stringify(def, null, 2);
  };
  el.dataForm.append(formField("Name", def.name, (value) => { def.name = value; update(); }));
  el.dataForm.append(formField("Tags", (def.tags ?? []).join(", "), (value) => {
    def.tags = value.split(",").map((s) => s.trim()).filter(Boolean);
    update();
  }));
  const assetIds = Object.keys(packData.files["assets/assets.index.json"] ?? {});
  el.dataForm.append(formField("Visual", def.visual ?? "", (value) => {
    def.visual = value || undefined;
    update();
  }, { select: ["", ...assetIds] }));
  if (isActor) {
    el.dataForm.append(formField("Health", def.stats?.health ?? 100, (value) => {
      def.stats = { ...(def.stats ?? {}), health: Number(value) || 0 };
      update();
    }, { type: "number" }));
    el.dataForm.append(formField("Speed", def.stats?.speed ?? 0, (value) => {
      def.stats = { ...(def.stats ?? {}), speed: Number(value) || 0 };
      update();
    }, { type: "number", step: "0.1" }));
    el.dataForm.append(formField("Dialogue", def.dialogue ?? "", (value) => {
      def.dialogue = value || undefined;
      update();
    }));
    el.dataForm.append(formField("Schedule", def.brain?.schedule ?? "", (value) => {
      def.brain = { ...(def.brain ?? { profile: "schedule" }), schedule: value || undefined };
      update();
    }));
  } else if (isProp) {
    el.dataForm.append(formField("Locked by", def.locked_by ?? "", (value) => {
      def.locked_by = value || undefined;
      update();
    }));
    el.dataForm.append(formField("Verbs", (def.interactable?.verbs ?? []).join(", "), (value) => {
      def.interactable = { ...(def.interactable ?? {}), verbs: value.split(",").map((s) => s.trim()).filter(Boolean) };
      update();
    }));
  } else {
    el.dataForm.append(formField("Stack", def.stack ?? 1, (value) => {
      def.stack = Number(value) || 1;
      update();
    }, { type: "number" }));
  }
}

function renderList() {
  const placements = zone?.placements ?? [];
  el.list.replaceChildren(...placements.map((placement, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `placement-item ${index === selected ? "selected" : ""}`;
    button.innerHTML = `<span>${esc(placementLabel(placement, index))}</span><span class="tag">${esc(kindLabel(placement))}</span>`;
    button.addEventListener("click", () => {
      selected = index;
      renderList();
      syncInspector();
      draw();
    });
    return button;
  }));
}

function kindLabel(placement) {
  if (placement.actor) return "角色";
  if (placement.prop) return "道具";
  if (placement.item) return "物品";
  return "?";
}

function bounds() {
  const b = zone?.bounds ?? { min: [-20, 0, -20], max: [20, 8, 20] };
  return { minX: b.min[0], maxX: b.max[0], minZ: b.min[2], maxZ: b.max[2] };
}

function mapping() {
  const { minX, maxX, minZ, maxZ } = bounds();
  const pad = 52;
  const scale = Math.min((canvas.width - pad * 2) / (maxX - minX), (canvas.height - pad * 2) / (maxZ - minZ));
  const ox = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
  const oz = (canvas.height - (maxZ - minZ) * scale) / 2 - minZ * scale;
  return {
    scale,
    toScreen: (x, z) => [ox + x * scale, oz + z * scale],
    toWorld: (sx, sy) => [ (sx - ox) / scale, (sy - oz) / scale ],
  };
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function draw() {
  if (!zone) return;
  const { minX, maxX, minZ, maxZ } = bounds();
  const map = mapping();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = css("--canvas");
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = css("--grid");
  ctx.lineWidth = 1;
  for (let x = Math.ceil(minX / 2) * 2; x <= maxX; x += 2) {
    const [sx, z0] = map.toScreen(x, minZ);
    const [, z1] = map.toScreen(x, maxZ);
    ctx.beginPath(); ctx.moveTo(sx, z0); ctx.lineTo(sx, z1); ctx.stroke();
  }
  for (let z = Math.ceil(minZ / 2) * 2; z <= maxZ; z += 2) {
    const [x0, sz] = map.toScreen(minX, z);
    const [x1] = map.toScreen(maxX, z);
    ctx.beginPath(); ctx.moveTo(x0, sz); ctx.lineTo(x1, sz); ctx.stroke();
  }

  const [x0, z0] = map.toScreen(minX, minZ);
  const [x1, z1] = map.toScreen(maxX, maxZ);
  ctx.strokeStyle = css("--line");
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);

  const placements = zone.placements ?? [];
  placements.forEach((placement, index) => {
    const [sx, sz] = map.toScreen(placement.at[0], placement.at[2]);
    const selectedHere = index === selected;
    const accent = css("--accent");
    const accent2 = css("--accent-2");
    const panel = css("--panel");
    if (selectedHere) {
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sz, 22, 0, Math.PI * 2); ctx.stroke();
    }
    if (placement.actor) {
      ctx.fillStyle = accent2;
      ctx.beginPath(); ctx.arc(sx, sz, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = panel; ctx.lineWidth = 2; ctx.stroke();
    } else if (placement.prop) {
      ctx.fillStyle = accent;
      ctx.fillRect(sx - 12, sz - 10, 24, 20);
      ctx.strokeStyle = panel; ctx.lineWidth = 2; ctx.strokeRect(sx - 12, sz - 10, 24, 20);
    } else {
      ctx.fillStyle = accent2;
      ctx.beginPath();
      ctx.moveTo(sx, sz - 8); ctx.lineTo(sx + 8, sz); ctx.lineTo(sx, sz + 8); ctx.lineTo(sx - 8, sz);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = panel; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    const label = placement.actor ?? placement.prop ?? placement.item ?? "?";
    const width = ctx.measureText(label).width;
    ctx.fillStyle = panel; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.roundRect(sx - width / 2 - 5, sz + 16, width + 10, 18, 5); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = css("--ink");
    ctx.fillText(label, sx, sz + 29);
  });

  const start = world?.player?.at;
  if (start) {
    const [sx, sz] = map.toScreen(start[0], start[2]);
    ctx.fillStyle = css("--accent");
    ctx.beginPath(); ctx.arc(sx, sz, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = css("--panel"); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = css("--ink");
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("player 起点", sx, sz - 16);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return [
    (event.clientX - rect.left) * canvas.width / rect.width,
    (event.clientY - rect.top) * canvas.height / rect.height,
  ];
}

function hitPlacement(sx, sy) {
  const map = mapping();
  let best = -1;
  let bestDist = 24;
  (zone.placements ?? []).forEach((placement, index) => {
    const [px, pz] = map.toScreen(placement.at[0], placement.at[2]);
    const dist = Math.hypot(px - sx, pz - sy);
    if (dist < bestDist) { best = index; bestDist = dist; }
  });
  return best;
}

function bindCanvas() {
  canvas.addEventListener("mousedown", (event) => {
    const [sx, sy] = canvasPoint(event);
    const index = hitPlacement(sx, sy);
    if (index < 0) return;
    pushUndo();
    selected = index;
    dragging = true;
    renderList();
    syncInspector();
    draw();
  });
  canvas.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const placement = currentPlacement();
    if (!placement) return;
    const [sx, sy] = canvasPoint(event);
    const map = mapping();
    const [wx, wz] = map.toWorld(sx, sy);
    const { minX, maxX, minZ, maxZ } = bounds();
    const step = event.shiftKey ? 0.1 : 0.5;
    placement.at[0] = Number(clamp(wx, minX, maxX).toFixed(1));
    placement.at[2] = Number(clamp(wz, minZ, maxZ).toFixed(1));
    placement.at[0] = Math.round(placement.at[0] / step) * step;
    placement.at[2] = Math.round(placement.at[2] / step) * step;
    el.x.value = String(placement.at[0]);
    el.z.value = String(placement.at[2]);
    markDirty(zoneKey);
    draw();
  });
  window.addEventListener("mouseup", () => { dragging = false; });
}

function bindFields() {
  const update = () => {
    const placement = currentPlacement();
    if (!placement) return;
    placement.at[0] = Number(el.x.value);
    placement.at[2] = Number(el.z.value);
    placement.yaw = Number(el.yaw.value);
    placement.persistent_id = el.persistent.value;
    markDirty(zoneKey);
    renderList();
    draw();
  };
  [el.x, el.z, el.yaw, el.persistent].forEach((input) => {
    input.addEventListener("focus", pushUndo);
    input.addEventListener("change", update);
    input.addEventListener("input", update);
  });
}

async function saveFile(path, value) {
  const response = await fetch("/api/file", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, data: value }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    const first = result.errors?.[0];
    throw new Error(first ? `${first.code} ${first.path}: ${first.message}` : (result.error ?? `HTTP ${response.status}`));
  }
  packData.files[path] = value;
  markClean(path);
  log(`已保存 ${path}`);
}

async function savePlacement() {
  if (!zone) return false;
  try {
    await saveFile(zoneKey, zone);
    return true;
  } catch (error) {
    log(`保存摆放失败：${error}`);
    return false;
  }
}

async function saveDefinition() {
  const placement = currentPlacement();
  const path = definitionPathFor(placement);
  if (!path) return false;
  try {
    const value = JSON.parse(el.definition.value);
    await saveFile(path, value);
    return true;
  } catch (error) {
    log(`保存定义失败：${error}`);
    return false;
  }
}

async function saveRule() {
  if (!currentRuleKey) return false;
  try {
    const value = JSON.parse(el.rule.value);
    await saveFile(currentRuleKey, value);
    return true;
  } catch (error) {
    log(`保存规则失败：${error}`);
    return false;
  }
}

async function saveAll() {
  const okZone = await savePlacement();
  const okDefinition = await saveDefinition();
  const okRule = await saveRule();
  const okDialogue = await saveDialogue();
  return okZone && okDefinition && okRule && okDialogue;
}

async function bakeNav() {
  try {
    const saved = await saveAll();
    if (!saved) { log("烘焙取消：有保存失败"); return; }
    const response = await fetch("/api/bake", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      log(`烘焙失败：${result.error ?? response.status}`);
      return;
    }
    log(result.output.trim());
  } catch (error) {
    log(`烘焙失败：${error}`);
  }
}

async function validate() {
  try {
    const response = await fetch("/api/validate", { method: "POST" });
    const result = await response.json();
    log(`校验：${result.ok ? "通过" : "失败"}`);
    for (const error of result.errors ?? []) log(`  ${error.code} ${error.path}: ${error.message}`);
    for (const warning of result.warnings ?? []) log(`  ! ${warning.code} ${warning.path}: ${warning.message}`);
  } catch (error) {
    log(`校验失败：${error}`);
  }
}

async function buildAndPlay() {
  try {
    const saved = await saveAll();
    if (!saved) { log("构建取消：有保存失败"); return; }
    const response = await fetch("/api/build", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      log(`构建失败：${result.error ?? response.status}`);
      return;
    }
    log(result.output.trim());
    const preview = window.open("./index.html", "refuworld-preview");
    if (!preview) log("预览窗口被浏览器拦截；请点右上角「打开预览」。");
  } catch (error) {
    log(`构建失败：${error}`);
  }
}

function setupRules() {
  const rules = filesUnder("rules/");
  el.ruleSelect.replaceChildren(...rules.map((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key.replace(/^rules\//, "").replace(/\.json$/, "");
    return option;
  }));
  currentRuleKey = rules[0] ?? null;
  if (currentRuleKey) {
    el.ruleSelect.value = currentRuleKey;
    el.rule.value = JSON.stringify(packData.files[currentRuleKey], null, 2);
  } else {
    el.rule.value = "";
  }
  el.ruleSelect.onchange = () => {
    currentRuleKey = el.ruleSelect.value;
    el.rule.value = currentRuleKey ? JSON.stringify(packData.files[currentRuleKey], null, 2) : "";
  };
}

function currentDialogue() {
  return currentDialogueKey ? packData.files[currentDialogueKey] : null;
}

function setupDialogues() {
  const keys = filesUnder("dialogue/");
  el.dialogueSelect.replaceChildren(...keys.map((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key.replace(/^dialogue\//, "").replace(/\.json$/, "");
    return option;
  }));
  if (!keys.includes(currentDialogueKey)) currentDialogueKey = keys[0] ?? null;
  if (currentDialogueKey) el.dialogueSelect.value = currentDialogueKey;
  el.dialogueSelect.onchange = () => {
    currentDialogueKey = el.dialogueSelect.value;
    selectedNode = currentDialogue()?.start ?? null;
    syncNodeFields();
    drawDialogue();
  };
  const dialogue = currentDialogue();
  selectedNode = dialogue?.nodes?.[selectedNode] ? selectedNode : (dialogue?.start ?? null);
  syncNodeFields();
  drawDialogue();
}

function syncNodeFields() {
  const dialogue = currentDialogue();
  const node = dialogue && selectedNode ? dialogue.nodes[selectedNode] : null;
  const disabled = !node;
  [el.nodeSpeaker, el.nodeNext, el.nodeEnd, el.nodeText, el.nodeChoices].forEach((input) => {
    input.disabled = disabled;
  });
  if (!node) {
    el.nodeId.value = "";
    el.nodeSpeaker.value = "";
    el.nodeNext.value = "";
    el.nodeText.value = "";
    el.nodeChoices.value = "";
    return;
  }
  el.nodeId.value = selectedNode;
  el.nodeSpeaker.value = node.speaker ?? "";
  el.nodeNext.value = node.next ?? "";
  el.nodeEnd.value = node.end ? "true" : "false";
  el.nodeText.value = node.text ?? "";
  el.nodeChoices.value = (node.choices ?? []).map((c) => `${c.text} => ${c.next}`).join("\n");
}

function dialogueNodeRects() {
  const dialogue = currentDialogue();
  const rects = [];
  if (!dialogue) return rects;
  const levels = new Map();
  const start = dialogue.start;
  levels.set(start, 0);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    const node = dialogue.nodes[id];
    if (!node) continue;
    const nexts = [];
    if (node.next) nexts.push(node.next);
    for (const choice of node.choices ?? []) nexts.push(choice.next);
    for (const next of nexts) {
      if (!levels.has(next)) {
        levels.set(next, (levels.get(id) ?? 0) + 1);
        queue.push(next);
      }
    }
  }
  let fallback = 0;
  const byLevel = new Map();
  for (const id of Object.keys(dialogue.nodes)) {
    const level = levels.get(id) ?? fallback++;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(id);
  }
  for (const [level, ids] of byLevel) {
    ids.sort();
    ids.forEach((id, index) => {
      rects.push({
        id,
        x: 18 + level * 132,
        y: 22 + index * 62,
        w: 112,
        h: 38,
      });
    });
  }
  return rects;
}

function drawDialogue() {
  const canvas = el.dialogueCanvas;
  const ctx2 = canvas.getContext("2d");
  const dialogue = currentDialogue();
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  ctx2.fillStyle = css("--bg");
  ctx2.fillRect(0, 0, canvas.width, canvas.height);
  if (!dialogue) return;
  const rects = dialogueNodeRects();
  const byId = new Map(rects.map((r) => [r.id, r]));
  ctx2.strokeStyle = css("--line");
  ctx2.fillStyle = css("--muted");
  ctx2.lineWidth = 1.5;
  for (const [id, node] of Object.entries(dialogue.nodes)) {
    const from = byId.get(id);
    if (!from) continue;
    const nexts = [];
    if (node.next) nexts.push(node.next);
    for (const c of node.choices ?? []) nexts.push(c.next);
    for (const next of nexts) {
      const to = byId.get(next);
      if (!to) continue;
      ctx2.beginPath();
      ctx2.moveTo(from.x + from.w, from.y + from.h / 2);
      ctx2.lineTo(to.x, to.y + to.h / 2);
      ctx2.stroke();
    }
  }
  for (const rect of rects) {
    const selectedHere = rect.id === selectedNode;
    ctx2.fillStyle = selectedHere ? css("--accent") : css("--panel");
    ctx2.strokeStyle = selectedHere ? css("--accent") : css("--line");
    ctx2.lineWidth = selectedHere ? 2 : 1;
    ctx2.beginPath();
    ctx2.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = selectedHere ? css("--panel") : css("--ink");
    ctx2.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx2.textAlign = "left";
    ctx2.fillText(rect.id, rect.x + 8, rect.y + 16);
    ctx2.fillStyle = selectedHere ? css("--panel") : css("--muted");
    ctx2.font = "11px ui-sans-serif, system-ui, sans-serif";
    const text = (dialogue.nodes[rect.id]?.text ?? "").replace(/^loc:/, "");
    ctx2.fillText(text.slice(0, 14), rect.x + 8, rect.y + 30);
  }
}

function bindDialogue() {
  el.dialogueCanvas.addEventListener("click", (event) => {
    const rect = el.dialogueCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * el.dialogueCanvas.width / rect.width;
    const y = (event.clientY - rect.top) * el.dialogueCanvas.height / rect.height;
    for (const node of dialogueNodeRects()) {
      if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) {
        selectedNode = node.id;
        syncNodeFields();
        drawDialogue();
        return;
      }
    }
  });
  const update = () => {
    const dialogue = currentDialogue();
    const node = dialogue && selectedNode ? dialogue.nodes[selectedNode] : null;
    if (!node) return;
    node.speaker = el.nodeSpeaker.value || undefined;
    node.next = el.nodeNext.value || undefined;
    node.end = el.nodeEnd.value === "true" || undefined;
    node.text = el.nodeText.value;
    node.choices = el.nodeChoices.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [text, next] = line.split("=>").map((part) => part.trim());
      return text && next ? { text, next } : null;
    }).filter(Boolean);
    markDirty(currentDialogueKey);
    drawDialogue();
  };
  [el.nodeSpeaker, el.nodeNext, el.nodeEnd, el.nodeText, el.nodeChoices].forEach((input) => {
    input.addEventListener("focus", pushUndo);
    input.addEventListener("change", update);
    input.addEventListener("input", update);
  });
  document.getElementById("node-add").addEventListener("click", () => {
    const dialogue = currentDialogue();
    if (!dialogue) return;
    pushUndo();
    let n = 1;
    while (dialogue.nodes[`node.${n}`]) n += 1;
    const id = `node.${n}`;
    dialogue.nodes[id] = { text: "新节点", end: true };
    selectedNode = id;
    markDirty(currentDialogueKey);
    syncNodeFields();
    drawDialogue();
  });
  document.getElementById("node-delete").addEventListener("click", () => {
    const dialogue = currentDialogue();
    if (!dialogue || !selectedNode || selectedNode === dialogue.start) return;
    pushUndo();
    delete dialogue.nodes[selectedNode];
    selectedNode = dialogue.start;
    markDirty(currentDialogueKey);
    syncNodeFields();
    drawDialogue();
  });
  document.getElementById("save-dialogue").addEventListener("click", saveDialogue);
}

async function saveDialogue() {
  if (!currentDialogueKey) return false;
  try {
    await saveFile(currentDialogueKey, currentDialogue());
    return true;
  } catch (error) {
    log(`保存对话失败：${error}`);
    return false;
  }
}

function pickZone() {
  const zones = filesUnder("world/zones/").filter((k) => packData.files[k]?.id);
  const start = manifest?.entry?.start_zone;
  return zones.find((k) => packData.files[k].id === start) ?? zones[0] ?? null;
}

function bindButtons() {
  el.definition.addEventListener("focus", pushUndo);
  el.rule.addEventListener("focus", pushUndo);
  document.getElementById("undo").addEventListener("click", undo);
  document.getElementById("redo").addEventListener("click", redo);
  document.getElementById("save-placement").addEventListener("click", savePlacement);
  document.getElementById("save-definition").addEventListener("click", saveDefinition);
  document.getElementById("save-rule").addEventListener("click", saveRule);
  document.getElementById("bake").addEventListener("click", bakeNav);
  document.getElementById("validate").addEventListener("click", validate);
  document.getElementById("build").addEventListener("click", buildAndPlay);
}

async function boot() {
  try {
    const response = await fetch("/api/pack");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    packData = await response.json();
    manifest = packData.files["pack.json"];
    world = packData.files[manifest.entry.world];
    zoneKey = pickZone();
    if (!zoneKey) throw new Error("内容包没有区域");
    zone = packData.files[zoneKey];
    selected = 0;
    setupRules();
    setupDialogues();
    bindButtons();
    bindFields();
    bindCanvas();
    bindDialogue();
    updateUndoButtons();
    renderList();
    syncInspector();
    draw();
    log(`已加载 ${manifest.id} · ${Object.keys(packData.files).length} 个文件`);
    log("编辑 JSON 包；TS 源 src/content/demo.harbor 不会自动同步。");
  } catch (error) {
    log(`加载失败：${error}`);
    el.dirty.textContent = "加载失败";
    el.dirty.classList.add("changed");
  }
}

boot();
