/* Home Design Studio — app state, interaction, and rendering. */

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const STORAGE_KEY = "homeDesignStudio.v1";

const PALETTES = {
  Classic: { wallColor: "#f2ead7", roofColor: "#7c4a35", trimColor: "#ffffff", doorColor: "#8c2f2f" },
  Coastal: { wallColor: "#bcd8dd", roofColor: "#4a6d7c", trimColor: "#ffffff", doorColor: "#1f4e5f" },
  Modern: { wallColor: "#d8d4cc", roofColor: "#3a3a3f", trimColor: "#33333a", doorColor: "#c9772f" },
  Meadow: { wallColor: "#e0e8d0", roofColor: "#5d7a4e", trimColor: "#fffdf5", doorColor: "#7a4b2a" },
};

let mode = "design"; // "design" | "scene"
let sceneId = "lakeside";
let scenePos = {}; // sceneId -> house x as a fraction of canvas width
let design = defaultDesign();
let houseName = "";
let selected = null; // { type: "window", index } | { type: "door" }
let drag = null;
let viewTransform = { tx: 0, ty: 0, s: 1 };

/* ---------- Design model ---------- */

function defaultDesign() {
  const d = {
    stories: 2,
    width: 320,
    roof: "gable",
    wallColor: "#f2ead7",
    roofColor: "#7c4a35",
    trimColor: "#ffffff",
    doorColor: "#8c2f2f",
    garage: false,
    porch: true,
    chimney: true,
    door: { x: 0, style: "panel" },
    windows: [],
  };
  d.windows = generateWindows(d);
  return d;
}

function generateWindows(d) {
  const wins = [];
  const ww = 44;
  const wh = 54;
  const perStory = Math.max(2, Math.floor(d.width / 110));
  for (let s = 0; s < d.stories; s++) {
    const isGround = s === d.stories - 1;
    const y = s * STORY_H + 30;
    for (let i = 0; i < perStory; i++) {
      const x = -d.width / 2 + ((i + 0.5) * d.width) / perStory;
      if (isGround && Math.abs(x - d.door.x) < 75) continue;
      wins.push({ x, y, w: ww, h: wh });
    }
  }
  return wins;
}

function clampDesign() {
  const m = houseMetrics(design);
  const halfW = design.width / 2;
  design.door.x = clamp(design.door.x, -halfW + 32, halfW - 32);
  for (const win of design.windows) {
    win.x = clamp(win.x, -halfW + win.w / 2 + 6, halfW - win.w / 2 - 6);
    win.y = clamp(win.y, 8, m.wallH - win.h - 12);
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* ---------- Rendering ---------- */

function render() {
  ctx.clearRect(0, 0, W, H);
  if (mode === "design") renderDesign();
  else renderScene();
}

function renderDesign() {
  // Studio backdrop
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#eef3f6");
  sky.addColorStop(1, "#dde7e2");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const groundY = H * 0.84;
  ctx.fillStyle = "#cfdccc";
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(W, groundY);
  ctx.stroke();

  const m = houseMetrics(design);
  const s = Math.min((W * 0.62) / m.totalW, (H * 0.66) / m.totalH, 1.6);
  const centerOffset = (m.left + m.right) / 2;
  viewTransform = { tx: W / 2 - centerOffset * s, ty: groundY, s };

  ctx.save();
  ctx.translate(viewTransform.tx, viewTransform.ty);
  ctx.scale(s, s);
  drawHouseShadow(ctx, design);
  drawHouse(ctx, design);
  drawSelection();
  ctx.restore();
}

function renderScene() {
  const scene = SCENES.find((sc) => sc.id === sceneId);
  scene.draw(ctx, W, H);

  const s = scene.houseScale;
  const frac = scenePos[sceneId] ?? 0.5;
  const hx = frac * W;
  const gy = scene.ground * H;
  viewTransform = { tx: hx, ty: gy, s };

  // Reflection first, so the house never overlaps its own mirror image
  if (scene.water) {
    const waterY = scene.water * H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, waterY, W, H - waterY);
    ctx.clip();
    ctx.globalAlpha = 0.26;
    ctx.translate(hx, 2 * waterY - gy);
    ctx.scale(s, -s * 0.92);
    drawHouse(ctx, design, { night: !!scene.night });
    ctx.restore();
  }

  ctx.save();
  ctx.translate(hx, gy);
  ctx.scale(s, s);
  drawHouseShadow(ctx, design);
  drawHouse(ctx, design, { night: !!scene.night });
  ctx.restore();

  if (houseName.trim()) {
    ctx.font = "600 18px 'Avenir Next', 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(14, H - 42, ctx.measureText(houseName).width + 24, 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(houseName, 26, H - 21);
  }
}

function drawSelection() {
  if (!selected) return;
  const m = houseMetrics(design);
  let r = null;
  if (selected.type === "window") {
    const win = design.windows[selected.index];
    if (!win) return;
    r = { x: win.x - win.w / 2 - 6, y: -m.wallH + win.y - 6, w: win.w + 12, h: win.h + 12 };
  } else if (selected.type === "door") {
    r = { x: design.door.x - 27, y: -96, w: 54, h: 96 };
  }
  ctx.save();
  ctx.strokeStyle = "#2f6f4f";
  ctx.lineWidth = 2.5 / viewTransform.s;
  ctx.setLineDash([7 / viewTransform.s, 5 / viewTransform.s]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/* ---------- Pointer interaction ---------- */

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * W) / rect.width,
    y: ((e.clientY - rect.top) * H) / rect.height,
  };
}

function toHouse(p) {
  return {
    x: (p.x - viewTransform.tx) / viewTransform.s,
    y: (p.y - viewTransform.ty) / viewTransform.s,
  };
}

function hitTest(hp) {
  const m = houseMetrics(design);
  // Windows on top (checked in reverse draw order)
  for (let i = design.windows.length - 1; i >= 0; i--) {
    const win = design.windows[i];
    const top = -m.wallH + win.y;
    if (Math.abs(hp.x - win.x) <= win.w / 2 + 5 && hp.y >= top - 5 && hp.y <= top + win.h + 5) {
      return { type: "window", index: i };
    }
  }
  const door = design.door;
  if (Math.abs(hp.x - door.x) <= 26 && hp.y >= -94 && hp.y <= 0) {
    return { type: "door" };
  }
  return null;
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);

  if (mode === "scene") {
    drag = { type: "house" };
    scenePos[sceneId] = clamp(p.x / W, 0.14, 0.86);
    render();
    scheduleSave();
    return;
  }

  const hp = toHouse(p);
  const hit = hitTest(hp);
  selected = hit;
  if (hit) {
    if (hit.type === "window") {
      const win = design.windows[hit.index];
      drag = { ...hit, offX: hp.x - win.x, offY: hp.y - (-houseMetrics(design).wallH + win.y) };
    } else {
      drag = { ...hit, offX: hp.x - design.door.x };
    }
  } else {
    drag = null;
  }
  render();
});

canvas.addEventListener("pointermove", (e) => {
  const p = canvasPoint(e);

  if (!drag) {
    if (mode === "design") {
      canvas.style.cursor = hitTest(toHouse(p)) ? "grab" : "default";
    } else {
      canvas.style.cursor = "grab";
    }
    return;
  }

  canvas.style.cursor = "grabbing";
  if (drag.type === "house") {
    scenePos[sceneId] = clamp(p.x / W, 0.14, 0.86);
  } else if (drag.type === "window") {
    const hp = toHouse(p);
    const win = design.windows[drag.index];
    const m = houseMetrics(design);
    win.x = hp.x - drag.offX;
    win.y = hp.y - drag.offY + m.wallH;
    clampDesign();
  } else if (drag.type === "door") {
    const hp = toHouse(p);
    design.door.x = hp.x - drag.offX;
    clampDesign();
  }
  render();
  scheduleSave();
});

canvas.addEventListener("pointerup", () => {
  drag = null;
  canvas.style.cursor = mode === "scene" ? "grab" : "default";
});

canvas.addEventListener("dblclick", (e) => {
  if (mode !== "design") return;
  const hit = hitTest(toHouse(canvasPoint(e)));
  if (hit && hit.type === "door") {
    design.door.style = design.door.style === "arched" ? "panel" : "arched";
    render();
    scheduleSave();
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && mode === "design" &&
      selected && selected.type === "window" &&
      document.activeElement.tagName !== "INPUT") {
    design.windows.splice(selected.index, 1);
    selected = null;
    render();
    scheduleSave();
  }
});

/* ---------- Controls ---------- */

const el = (id) => document.getElementById(id);
const hintEl = el("hint");

function setHint() {
  hintEl.textContent =
    mode === "design"
      ? "Drag windows and the door to move them · double-click the door to arch it · Delete removes a selected window"
      : "Drag anywhere to place your home in the scene";
}

function bindSeg(id, get, set) {
  const seg = el(id);
  seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    set(btn.dataset.val);
    syncSeg(id, get());
    render();
    scheduleSave();
  });
}

function syncSeg(id, val) {
  for (const b of el(id).querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.val === String(val));
  }
}

bindSeg("segStories", () => design.stories, (v) => {
  design.stories = Number(v);
  design.windows = generateWindows(design);
  selected = null;
});

bindSeg("segRoof", () => design.roof, (v) => {
  design.roof = v;
});

el("inWidth").addEventListener("input", (e) => {
  const prev = design.width;
  design.width = Number(e.target.value);
  // Scale window/door x positions with the facade so layouts keep their shape
  const k = design.width / prev;
  for (const win of design.windows) win.x *= k;
  design.door.x *= k;
  clampDesign();
  render();
  scheduleSave();
});

const COLOR_INPUTS = [
  ["cWall", "wallColor"],
  ["cRoof", "roofColor"],
  ["cTrim", "trimColor"],
  ["cDoor", "doorColor"],
];
for (const [id, key] of COLOR_INPUTS) {
  el(id).addEventListener("input", (e) => {
    design[key] = e.target.value;
    render();
    scheduleSave();
  });
}

const FEATURES = [
  ["fGarage", "garage"],
  ["fPorch", "porch"],
  ["fChimney", "chimney"],
];
for (const [id, key] of FEATURES) {
  el(id).addEventListener("change", (e) => {
    design[key] = e.target.checked;
    render();
    scheduleSave();
  });
}

el("btnAddWindow").addEventListener("click", () => {
  const m = houseMetrics(design);
  const win = { x: 0, y: Math.min(30, m.wallH - 66), w: 44, h: 54 };
  design.windows.push(win);
  selected = { type: "window", index: design.windows.length - 1 };
  clampDesign();
  render();
  scheduleSave();
});

el("btnRemoveWindow").addEventListener("click", () => {
  if (selected && selected.type === "window") {
    design.windows.splice(selected.index, 1);
    selected = null;
    render();
    scheduleSave();
  } else {
    toast("Select a window first");
  }
});

// Palette preset swatches
const palettesEl = el("palettes");
for (const [name, p] of Object.entries(PALETTES)) {
  const btn = document.createElement("button");
  btn.className = "palette";
  btn.title = name;
  for (const c of [p.wallColor, p.roofColor, p.trimColor, p.doorColor]) {
    const sp = document.createElement("span");
    sp.style.background = c;
    btn.appendChild(sp);
  }
  btn.addEventListener("click", () => {
    Object.assign(design, p);
    syncControls();
    render();
    scheduleSave();
    toast(`${name} palette applied`);
  });
  palettesEl.appendChild(btn);
}

// Scene chips
const sceneGrid = el("sceneGrid");
for (const scene of SCENES) {
  const btn = document.createElement("button");
  btn.className = "scene-chip";
  btn.dataset.scene = scene.id;
  btn.innerHTML = `<span class="emoji">${scene.emoji}</span>${scene.name}`;
  btn.addEventListener("click", () => {
    sceneId = scene.id;
    syncSceneChips();
    render();
    scheduleSave();
  });
  sceneGrid.appendChild(btn);
}

function syncSceneChips() {
  for (const chip of sceneGrid.querySelectorAll(".scene-chip")) {
    chip.classList.toggle("active", chip.dataset.scene === sceneId);
  }
}

// Mode tabs
el("modeTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  mode = btn.dataset.mode;
  for (const t of el("modeTabs").querySelectorAll(".tab")) {
    t.classList.toggle("active", t === btn);
  }
  el("designPanel").hidden = mode !== "design";
  el("scenePanel").hidden = mode !== "scene";
  selected = null;
  setHint();
  render();
});

el("houseName").addEventListener("input", (e) => {
  houseName = e.target.value;
  if (mode === "scene") render();
  scheduleSave();
});

/* ---------- Actions ---------- */

el("btnRandom").addEventListener("click", () => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const palette = pick(Object.values(PALETTES));
  Object.assign(design, palette);
  design.stories = pick([1, 1, 2, 2]);
  design.width = 240 + Math.floor(Math.random() * 46) * 4;
  design.roof = pick(["gable", "gable", "hip", "flat"]);
  design.garage = Math.random() < 0.4;
  design.porch = Math.random() < 0.6;
  design.chimney = Math.random() < 0.6;
  design.door = {
    x: (Math.random() - 0.5) * design.width * 0.5,
    style: pick(["panel", "arched"]),
  };
  design.windows = generateWindows(design);
  selected = null;
  clampDesign();
  syncControls();
  render();
  scheduleSave();
});

el("btnReset").addEventListener("click", () => {
  design = defaultDesign();
  selected = null;
  syncControls();
  render();
  scheduleSave();
  toast("Back to the starter home");
});

el("btnSave").addEventListener("click", () => {
  save();
  toast("Design saved in this browser");
});

el("btnDownload").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = `${houseName.trim() || "my-home"}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
});

/* ---------- Persistence ---------- */

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ design, sceneId, scenePos, houseName })
    );
  } catch {
    /* storage unavailable (private mode etc.) — designs just won't persist */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.design) design = { ...defaultDesign(), ...data.design };
    if (data.sceneId && SCENES.some((sc) => sc.id === data.sceneId)) sceneId = data.sceneId;
    if (data.scenePos) scenePos = data.scenePos;
    if (typeof data.houseName === "string") houseName = data.houseName;
    clampDesign();
  } catch {
    /* corrupted save — start fresh */
  }
}

/* ---------- Toast + sync ---------- */

let toastTimer = null;
function toast(msg) {
  const t = el("toast");
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.textContent = ""), 2200);
}

function syncControls() {
  syncSeg("segStories", design.stories);
  syncSeg("segRoof", design.roof);
  el("inWidth").value = design.width;
  el("cWall").value = design.wallColor;
  el("cRoof").value = design.roofColor;
  el("cTrim").value = design.trimColor;
  el("cDoor").value = design.doorColor;
  el("fGarage").checked = design.garage;
  el("fPorch").checked = design.porch;
  el("fChimney").checked = design.chimney;
  el("houseName").value = houseName;
}

/* ---------- Boot ---------- */

load();
syncControls();
syncSceneChips();
setHint();
render();
