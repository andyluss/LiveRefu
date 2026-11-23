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
  return okZone && okDefinition && okRule;
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
  el.ruleSelect.addEventListener("change", () => {
    currentRuleKey = el.ruleSelect.value;
    el.rule.value = currentRuleKey ? JSON.stringify(packData.files[currentRuleKey], null, 2) : "";
  });
}

function pickZone() {
  const zones = filesUnder("world/zones/").filter((k) => packData.files[k]?.id);
  const start = manifest?.entry?.start_zone;
  return zones.find((k) => packData.files[k].id === start) ?? zones[0] ?? null;
}

function bindButtons() {
  document.getElementById("save-placement").addEventListener("click", savePlacement);
  document.getElementById("save-definition").addEventListener("click", saveDefinition);
  document.getElementById("save-rule").addEventListener("click", saveRule);
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
    bindButtons();
    bindFields();
    bindCanvas();
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
