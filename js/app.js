/* Home Design Studio — app wiring: tabs, tools, controls, rendering. */

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const CANVAS_W = canvas.width;
const CANVAS_H = canvas.height;

let state = loadState() || starterHome();
let mode = "plan"; // plan | exterior | scene

/* Exterior-view interaction state */
let extSel = null; // {type:'window',index} | {type:'door'}
let extDrag = null;
let extT = { tx: 0, ty: 0, s: 1 };

const EXT_PALETTES = {
  Farmhouse: { wallColor: "#f0ece0", roofColor: "#4c4a48", trimColor: "#fbfaf6", doorColor: "#2e3a2f", material: "board" },
  Colonial: { wallColor: "#e8e2d2", roofColor: "#5c5650", trimColor: "#faf8f2", doorColor: "#48505e", material: "siding" },
  Brick: { wallColor: "#9e5d47", roofColor: "#3f3b39", trimColor: "#f2ede2", doorColor: "#1f2c38", material: "brick" },
  Coastal: { wallColor: "#c3d7da", roofColor: "#57646d", trimColor: "#fbfbf8", doorColor: "#24485a", material: "siding" },
  Desert: { wallColor: "#e3cdaa", roofColor: "#8a5d40", trimColor: "#f6efe2", doorColor: "#6d4530", material: "stucco" },
};

/* ---------- Rendering ---------- */

function renderAll() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (mode === "plan") renderFloorplan(ctx);
  else if (mode === "exterior") renderExterior();
  else renderScene();
}

function renderExterior() {
  // Front-yard backdrop
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.9);
  sky.addColorStop(0, "#b5d6e8");
  sky.addColorStop(1, "#eef3ee");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const groundY = CANVAS_H * 0.87;
  const lawn = ctx.createLinearGradient(0, groundY, 0, CANVAS_H);
  lawn.addColorStop(0, "#9dbb7e");
  lawn.addColorStop(1, "#7ba25f");
  ctx.fillStyle = lawn;
  ctx.fillRect(0, groundY, CANVAS_W, CANVAS_H - groundY);

  const d = state.exterior;
  const m = houseMetrics(d);
  const s = Math.min((CANVAS_W * 0.68) / m.totalW, (CANVAS_H * 0.68) / m.totalH, 1.5);
  const centerOffset = (m.left + m.right) / 2;
  extT = { tx: CANVAS_W / 2 - centerOffset * s, ty: groundY, s };

  // Front path from the door
  const doorPx = extT.tx + d.door.x * s;
  ctx.fillStyle = "#cfc5b2";
  ctx.beginPath();
  ctx.moveTo(doorPx - 26 * s, groundY);
  ctx.quadraticCurveTo(doorPx - 40, CANVAS_H * 0.94, doorPx - 70, CANVAS_H);
  ctx.lineTo(doorPx + 70, CANVAS_H);
  ctx.quadraticCurveTo(doorPx + 40, CANVAS_H * 0.94, doorPx + 26 * s, groundY);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.translate(extT.tx, extT.ty);
  ctx.scale(s, s);
  drawHouseShadow(ctx, d);
  drawHouse(ctx, d);
  drawExtSelection();
  ctx.restore();

  // Foundation bushes
  ctx.fillStyle = "#5e8a4e";
  for (const bx of [extT.tx + m.left * s + 30, extT.tx + m.right * s - 60]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(bx + i * 22, groundY - 4, 15 - (i % 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderScene() {
  const scene = SCENES.find((sc) => sc.id === state.sceneId);
  const d = state.exterior;
  const m = houseMetrics(d);
  scene.draw(ctx, CANVAS_W, CANVAS_H);

  const s = Math.min(scene.houseScale, (CANVAS_H * 0.6) / m.totalH);
  const frac = state.scenePos[state.sceneId] ?? 0.5;
  const hx = frac * CANVAS_W;
  const gy = scene.ground * CANVAS_H;

  if (scene.water) {
    const waterY = scene.water * CANVAS_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, waterY, CANVAS_W, CANVAS_H - waterY);
    ctx.clip();
    ctx.globalAlpha = 0.25;
    ctx.translate(hx, 2 * waterY - gy);
    ctx.scale(s, -s * 0.92);
    drawHouse(ctx, d, { night: !!scene.night });
    ctx.restore();
  }

  ctx.save();
  ctx.translate(hx, gy);
  ctx.scale(s, s);
  drawHouseShadow(ctx, d);
  drawHouse(ctx, d, { night: !!scene.night });
  ctx.restore();

  if (state.name.trim()) {
    ctx.font = "600 18px 'Avenir Next', 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(14, CANVAS_H - 42, ctx.measureText(state.name).width + 24, 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(state.name, 26, CANVAS_H - 21);
  }
}

function drawExtSelection() {
  if (!extSel) return;
  const d = state.exterior;
  const m = houseMetrics(d);
  let r = null;
  if (extSel.type === "window") {
    const win = d.windows[extSel.index];
    if (!win) return;
    r = { x: win.x - win.w / 2 - 8, y: -m.wallH + win.y - 9, w: win.w + 16, h: win.h + 18 };
  } else {
    r = { x: d.door.x - 30, y: -104, w: 60, h: 104 };
  }
  ctx.strokeStyle = "#2f6f4f";
  ctx.lineWidth = 2.5 / extT.s;
  ctx.setLineDash([7 / extT.s, 5 / extT.s]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
}

/* ---------- Exterior interactions ---------- */

function extToHouse(p) {
  return { x: (p.x - extT.tx) / extT.s, y: (p.y - extT.ty) / extT.s };
}

function extHitTest(hp) {
  const d = state.exterior;
  const m = houseMetrics(d);
  for (let i = d.windows.length - 1; i >= 0; i--) {
    const win = d.windows[i];
    const top = -m.wallH + win.y;
    if (Math.abs(hp.x - win.x) <= win.w / 2 + 8 && hp.y >= top - 8 && hp.y <= top + win.h + 8) {
      return { type: "window", index: i };
    }
  }
  if (Math.abs(hp.x - d.door.x) <= 28 && hp.y >= -100 && hp.y <= 0) return { type: "door" };
  return null;
}

function clampExterior() {
  const d = state.exterior;
  const m = houseMetrics(d);
  const halfW = d.width / 2;
  d.door.x = clamp(d.door.x, -halfW + 36, halfW - 36);
  for (const win of d.windows) {
    win.x = clamp(win.x, -halfW + win.w / 2 + 12, halfW - win.w / 2 - 12);
    win.y = clamp(win.y, 10, m.wallH - win.h - 16);
  }
}

/* ---------- Pointer routing ---------- */

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * CANVAS_W) / rect.width,
    y: ((e.clientY - rect.top) * CANVAS_H) / rect.height,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);

  if (mode === "plan") {
    fpPointerDown(p);
    renderAll();
    updateAreaStat();
    return;
  }

  if (mode === "scene") {
    state.scenePos[state.sceneId] = clamp(p.x / CANVAS_W, 0.14, 0.86);
    extDrag = { type: "house" };
    renderAll();
    scheduleSave();
    return;
  }

  const hp = extToHouse(p);
  const hit = extHitTest(hp);
  extSel = hit;
  if (hit && hit.type === "window") {
    const win = state.exterior.windows[hit.index];
    const m = houseMetrics(state.exterior);
    extDrag = { ...hit, offX: hp.x - win.x, offY: hp.y - (-m.wallH + win.y) };
  } else if (hit && hit.type === "door") {
    extDrag = { ...hit, offX: hp.x - state.exterior.door.x };
  } else {
    extDrag = null;
  }
  renderAll();
});

canvas.addEventListener("pointermove", (e) => {
  const p = canvasPoint(e);

  if (mode === "plan") {
    fpPointerMove(p);
    return;
  }

  if (!extDrag) return;

  if (extDrag.type === "house") {
    state.scenePos[state.sceneId] = clamp(p.x / CANVAS_W, 0.14, 0.86);
  } else if (extDrag.type === "window") {
    const hp = extToHouse(p);
    const win = state.exterior.windows[extDrag.index];
    const m = houseMetrics(state.exterior);
    win.x = hp.x - extDrag.offX;
    win.y = hp.y - extDrag.offY + m.wallH;
    clampExterior();
  } else if (extDrag.type === "door") {
    const hp = extToHouse(p);
    state.exterior.door.x = hp.x - extDrag.offX;
    clampExterior();
  }
  renderAll();
  scheduleSave();
});

canvas.addEventListener("pointerup", () => {
  if (mode === "plan") {
    fpPointerUp();
    updateAreaStat();
    return;
  }
  extDrag = null;
});

canvas.addEventListener("dblclick", (e) => {
  const p = canvasPoint(e);
  if (mode === "plan") {
    fpDoubleClick(p);
    return;
  }
  if (mode === "exterior") {
    const hit = extHitTest(extToHouse(p));
    if (hit && hit.type === "door") {
      state.exterior.door.style = state.exterior.door.style === "arched" ? "panel" : "arched";
      renderAll();
      scheduleSave();
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.key === "Delete" || e.key === "Backspace") {
    if (mode === "plan" && fp.sel) {
      fpDelete();
      onPlanChanged("Removed");
    } else if (mode === "exterior" && extSel && extSel.type === "window") {
      state.exterior.windows.splice(extSel.index, 1);
      extSel = null;
      renderAll();
      scheduleSave();
    }
  } else if (e.key === "r" || e.key === "R") {
    if (mode === "plan") fpRotateSelected();
  }
});

/* ---------- Shared helpers ---------- */

const el = (id) => document.getElementById(id);
const hintEl = el("hint");
let statusTimer = null;

function defaultHint() {
  if (mode === "plan") {
    return {
      select: "Tap to select · drag to move · drag empty space to pan · double-tap a room to rename it",
      room: "Drag on the canvas to draw a room",
      wall: "Drag to draw an interior wall",
      door: "Tap a wall to place a door · drag to slide it",
      window: "Tap a wall to place a window · drag to slide it",
      erase: "Tap anything to remove it",
    }[fp.tool];
  }
  if (mode === "exterior") {
    return "Drag windows and the door to reposition them · double-click the door to arch it";
  }
  return "Drag anywhere to place your home in the scene";
}

function setStatus(msg) {
  clearTimeout(statusTimer);
  hintEl.textContent = msg;
  statusTimer = setTimeout(() => (hintEl.textContent = defaultHint()), 2600);
}

function onPlanChanged(msg) {
  renderAll();
  scheduleSave();
  updateAreaStat();
  if (msg) setStatus(msg);
}

function updateAreaStat() {
  const total = state.floors.reduce((sum, f) => sum + floorArea(f), 0);
  el("areaStat").textContent =
    `This floor: ${floorArea(fpFloor())} ft² · Whole home: ${total} ft²`;
}

let toastTimer = null;
function toast(msg) {
  const t = el("toast");
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.textContent = ""), 2200);
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state), 400);
}

/* ---------- Mode tabs ---------- */

el("modeTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  mode = btn.dataset.mode;
  for (const t of el("modeTabs").querySelectorAll(".tab")) {
    t.classList.toggle("active", t === btn);
  }
  el("planPanel").hidden = mode !== "plan";
  el("extPanel").hidden = mode !== "exterior";
  el("scenePanel").hidden = mode !== "scene";
  extSel = null;
  hintEl.textContent = defaultHint();
  renderAll();
});

/* ---------- Floor plan panel ---------- */

function buildFloorTabs() {
  const segEl = el("segFloors");
  segEl.innerHTML = "";
  state.floors.forEach((f, i) => {
    const b = document.createElement("button");
    b.textContent = f.name;
    b.classList.toggle("active", i === state.activeFloor);
    b.addEventListener("click", () => {
      state.activeFloor = i;
      fp.sel = null;
      buildFloorTabs();
      onPlanChanged();
    });
    segEl.appendChild(b);
  });
}

el("btnAddFloor").addEventListener("click", () => {
  if (state.floors.length >= 3) {
    toast("Up to 3 floors");
    return;
  }
  const names = ["Ground floor", "Upper floor", "Top floor"];
  state.floors.push(emptyFloor(names[state.floors.length] || `Floor ${state.floors.length + 1}`));
  state.activeFloor = state.floors.length - 1;
  buildFloorTabs();
  onPlanChanged("New empty floor — draw rooms with the Room tool");
});

el("btnRemoveFloor").addEventListener("click", () => {
  if (state.floors.length <= 1) {
    toast("A home needs at least one floor");
    return;
  }
  if (!confirm(`Remove "${fpFloor().name}" and everything on it?`)) return;
  state.floors.splice(state.activeFloor, 1);
  state.activeFloor = Math.max(0, state.activeFloor - 1);
  fp.sel = null;
  buildFloorTabs();
  onPlanChanged();
});

el("btnClearFloor").addEventListener("click", () => {
  if (!confirm(`Clear everything on "${fpFloor().name}"?`)) return;
  const f = fpFloor();
  f.rooms = [];
  f.walls = [];
  f.openings = [];
  f.furniture = [];
  fp.sel = null;
  onPlanChanged("Floor cleared");
});

el("toolGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  fp.tool = btn.dataset.tool;
  fp.pending = null;
  for (const b of el("toolGrid").querySelectorAll(".tool")) {
    b.classList.toggle("active", b === btn);
  }
  syncCatalogPending();
  hintEl.textContent = defaultHint();
});

el("btnRotate").addEventListener("click", () => { if (mode === "plan") fpRotateSelected(); });
el("btnDuplicate").addEventListener("click", () => { if (mode === "plan") fpDuplicateSelected(); });
el("btnDelete").addEventListener("click", () => {
  if (mode === "plan" && fp.sel) {
    fpDelete();
    onPlanChanged("Removed");
  } else {
    setStatus("Select something first");
  }
});
el("btnZoomIn").addEventListener("click", () => fpZoom(1.25));
el("btnZoomOut").addEventListener("click", () => fpZoom(0.8));
el("btnFit").addEventListener("click", fpFit);

/* Furniture catalog */
let activeCat = FURNITURE_CATS[0];

function buildCatTabs() {
  const tabs = el("catTabs");
  tabs.innerHTML = "";
  for (const cat of FURNITURE_CATS) {
    const b = document.createElement("button");
    b.textContent = cat;
    b.classList.toggle("active", cat === activeCat);
    b.addEventListener("click", () => {
      activeCat = cat;
      buildCatTabs();
      buildCatalog();
    });
    tabs.appendChild(b);
  }
}

function buildCatalog() {
  const wrap = el("catalog");
  wrap.innerHTML = "";
  for (const def of FURNITURE.filter((f) => f.cat === activeCat)) {
    const item = document.createElement("button");
    item.className = "cat-item";
    item.dataset.kind = def.kind;
    const cv = document.createElement("canvas");
    cv.width = 60;
    cv.height = 44;
    const cc = cv.getContext("2d");
    const sc = Math.min(52 / def.w, 36 / def.d) / 1; // px per ft in preview
    cc.save();
    cc.translate((60 - def.w * sc) / 2, (44 - def.d * sc) / 2);
    cc.lineWidth = 1.2;
    cc.lineJoin = "round";
    def.draw(cc, def.w * sc, def.d * sc);
    cc.restore();
    item.appendChild(cv);
    item.appendChild(document.createTextNode(def.name));
    item.addEventListener("click", () => {
      fp.pending = fp.pending === def.kind ? null : def.kind;
      syncCatalogPending();
      if (fp.pending) setStatus(`Tap the plan to place: ${def.name}`);
    });
    wrap.appendChild(item);
  }
}

function syncCatalogPending() {
  for (const it of el("catalog").querySelectorAll(".cat-item")) {
    it.classList.toggle("pending", it.dataset.kind === fp.pending);
  }
}

/* ---------- Exterior panel ---------- */

function bindSeg(id, key, transform = (v) => v, after = () => {}) {
  el(id).addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.exterior[key] = transform(btn.dataset.val);
    after();
    syncSeg(id, state.exterior[key]);
    clampExterior();
    renderAll();
    scheduleSave();
  });
}

function syncSeg(id, val) {
  for (const b of el(id).querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.val === String(val));
  }
}

bindSeg("segStories", "stories", Number, () => {
  state.exterior.windows = generateFacadeWindows(state.exterior);
  extSel = null;
});
bindSeg("segRoof", "roof");
bindSeg("segMaterial", "material");

el("inWidth").addEventListener("input", (e) => {
  const d = state.exterior;
  const prev = d.width;
  d.width = Number(e.target.value);
  const k = d.width / prev;
  for (const win of d.windows) win.x *= k;
  d.door.x *= k;
  clampExterior();
  renderAll();
  scheduleSave();
});

for (const [id, key] of [["cWall", "wallColor"], ["cRoof", "roofColor"], ["cTrim", "trimColor"], ["cDoor", "doorColor"]]) {
  el(id).addEventListener("input", (e) => {
    state.exterior[key] = e.target.value;
    renderAll();
    scheduleSave();
  });
}

for (const [id, key] of [["fGarage", "garage"], ["fPorch", "porch"], ["fChimney", "chimney"], ["fShutters", "shutters"]]) {
  el(id).addEventListener("change", (e) => {
    state.exterior[key] = e.target.checked;
    renderAll();
    scheduleSave();
  });
}

el("btnAddWindow").addEventListener("click", () => {
  const d = state.exterior;
  const m = houseMetrics(d);
  d.windows.push({ x: 0, y: Math.min(26, m.wallH - 74), w: 46, h: 58 });
  extSel = { type: "window", index: d.windows.length - 1 };
  clampExterior();
  renderAll();
  scheduleSave();
});

el("btnRemoveWindow").addEventListener("click", () => {
  if (extSel && extSel.type === "window") {
    state.exterior.windows.splice(extSel.index, 1);
    extSel = null;
    renderAll();
    scheduleSave();
  } else {
    toast("Select a window on the house first");
  }
});

el("btnRegenWindows").addEventListener("click", () => {
  state.exterior.windows = generateFacadeWindows(state.exterior);
  extSel = null;
  renderAll();
  scheduleSave();
});

const palettesEl = el("palettes");
for (const [name, p] of Object.entries(EXT_PALETTES)) {
  const btn = document.createElement("button");
  btn.className = "palette";
  btn.title = name;
  for (const c of [p.wallColor, p.roofColor, p.trimColor, p.doorColor]) {
    const sp = document.createElement("span");
    sp.style.background = c;
    btn.appendChild(sp);
  }
  btn.addEventListener("click", () => {
    Object.assign(state.exterior, p);
    syncExtControls();
    renderAll();
    scheduleSave();
    toast(`${name} style applied`);
  });
  palettesEl.appendChild(btn);
}

el("btnRandom").addEventListener("click", () => {
  const d = state.exterior;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  Object.assign(d, pick(Object.values(EXT_PALETTES)));
  d.stories = pick([1, 2, 2, 2, 3]);
  d.width = 260 + Math.floor(Math.random() * 51) * 4;
  d.roof = pick(["gable", "gable", "hip", "flat"]);
  d.garage = Math.random() < 0.4;
  d.porch = Math.random() < 0.65;
  d.chimney = Math.random() < 0.55;
  d.shutters = Math.random() < 0.6;
  d.door = { x: (Math.random() - 0.5) * d.width * 0.5, style: pick(["panel", "arched"]) };
  d.windows = generateFacadeWindows(d);
  extSel = null;
  clampExterior();
  syncExtControls();
  renderAll();
  scheduleSave();
});

/* ---------- Scenes panel ---------- */

const sceneGrid = el("sceneGrid");
for (const scene of SCENES) {
  const btn = document.createElement("button");
  btn.className = "scene-chip";
  btn.dataset.scene = scene.id;
  btn.innerHTML = `<span class="emoji">${scene.emoji}</span>${scene.name}`;
  btn.addEventListener("click", () => {
    state.sceneId = scene.id;
    syncSceneChips();
    renderAll();
    scheduleSave();
  });
  sceneGrid.appendChild(btn);
}

function syncSceneChips() {
  for (const chip of sceneGrid.querySelectorAll(".scene-chip")) {
    chip.classList.toggle("active", chip.dataset.scene === state.sceneId);
  }
}

/* ---------- Global actions ---------- */

el("houseName").addEventListener("input", (e) => {
  state.name = e.target.value;
  if (mode === "scene") renderAll();
  scheduleSave();
});

el("btnSave").addEventListener("click", () => {
  saveState(state);
  toast("Saved in this browser");
});

el("btnDownload").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = `${state.name.trim() || "my-home"}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
});

el("btnReset").addEventListener("click", () => {
  if (!confirm("Reset everything back to the example home?")) return;
  state = starterHome();
  fp.sel = null;
  extSel = null;
  syncAllControls();
  fpFit();
  onPlanChanged("Example home restored");
});

/* ---------- Sync + boot ---------- */

function syncExtControls() {
  const d = state.exterior;
  syncSeg("segStories", d.stories);
  syncSeg("segRoof", d.roof);
  syncSeg("segMaterial", d.material);
  el("inWidth").value = d.width;
  el("cWall").value = d.wallColor;
  el("cRoof").value = d.roofColor;
  el("cTrim").value = d.trimColor;
  el("cDoor").value = d.doorColor;
  el("fGarage").checked = d.garage;
  el("fPorch").checked = d.porch;
  el("fChimney").checked = d.chimney;
  el("fShutters").checked = d.shutters;
}

function syncAllControls() {
  buildFloorTabs();
  buildCatTabs();
  buildCatalog();
  syncExtControls();
  syncSceneChips();
  el("houseName").value = state.name;
  updateAreaStat();
}

syncAllControls();
hintEl.textContent = defaultHint();
fpFit();
