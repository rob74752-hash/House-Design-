/*
 * Floor-plan editor: draw rooms and interior walls, place doors/windows
 * that snap to walls, and furnish with the catalog. All geometry is in
 * feet; fp.view maps feet -> canvas pixels.
 */

const fp = {
  view: { ox: 80, oy: 45, scale: 18 },
  tool: "select", // select | room | wall | door | window | erase
  pending: null, // furniture kind awaiting placement
  sel: null, // { type: room|wall|opening|furniture, id }
  drag: null,
  ghost: null,
};

const FLOOR_FILL = "#f6f1e6";
const WALL_COLOR = "#403f47";
const PAPER = "#fbfaf6";
const ACCENT = "#2f6f4f";

function fpFloor() {
  return state.floors[state.activeFloor];
}

function fpToFt(p) {
  return { x: (p.x - fp.view.ox) / fp.view.scale, y: (p.y - fp.view.oy) / fp.view.scale };
}

function fpFind(type, id) {
  const f = fpFloor();
  const list = { room: f.rooms, wall: f.walls, opening: f.openings, furniture: f.furniture }[type];
  return list.find((it) => it.id === id) || null;
}

function fpSelected() {
  return fp.sel ? fpFind(fp.sel.type, fp.sel.id) : null;
}

/* ---------- Wall geometry ---------- */

function wallSegments(floor) {
  const segs = [];
  for (const r of floor.rooms) {
    segs.push({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y, horiz: true });
    segs.push({ x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h, horiz: true });
    segs.push({ x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h, horiz: false });
    segs.push({ x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h, horiz: false });
  }
  for (const w of floor.walls) {
    segs.push({ ...w, horiz: w.y1 === w.y2 });
  }
  return segs;
}

/* Snap a point to the nearest wall line (within tol ft). */
function snapToWall(pt, halfLen, tol = 1.0) {
  let best = null;
  for (const s of wallSegments(fpFloor())) {
    let d, x, y;
    if (s.horiz) {
      if (pt.x < Math.min(s.x1, s.x2) - 0.3 || pt.x > Math.max(s.x1, s.x2) + 0.3) continue;
      d = Math.abs(pt.y - s.y1);
      x = clamp(pt.x, Math.min(s.x1, s.x2) + halfLen, Math.max(s.x1, s.x2) - halfLen);
      y = s.y1;
    } else {
      if (pt.y < Math.min(s.y1, s.y2) - 0.3 || pt.y > Math.max(s.y1, s.y2) + 0.3) continue;
      d = Math.abs(pt.x - s.x1);
      x = s.x1;
      y = clamp(pt.y, Math.min(s.y1, s.y2) + halfLen, Math.max(s.y1, s.y2) - halfLen);
    }
    if (d < tol && (!best || d < best.d)) best = { d, x: snapHalf(x), y: snapHalf(y), horiz: s.horiz };
  }
  return best;
}

/* ---------- Hit testing (ft coords) ---------- */

function fpHitTest(pt) {
  const f = fpFloor();
  for (let i = f.furniture.length - 1; i >= 0; i--) {
    const it = f.furniture[i];
    const fpz = furFootprint(it);
    if (Math.abs(pt.x - it.x) <= fpz.w / 2 + 0.15 && Math.abs(pt.y - it.y) <= fpz.d / 2 + 0.15) {
      return { type: "furniture", id: it.id };
    }
  }
  for (const op of f.openings) {
    const along = op.horiz ? Math.abs(pt.x - op.x) : Math.abs(pt.y - op.y);
    const across = op.horiz ? Math.abs(pt.y - op.y) : Math.abs(pt.x - op.x);
    if (along <= op.w / 2 + 0.2 && across <= 0.8) return { type: "opening", id: op.id };
  }
  for (const w of f.walls) {
    const horiz = w.y1 === w.y2;
    const along = horiz
      ? pt.x >= Math.min(w.x1, w.x2) - 0.3 && pt.x <= Math.max(w.x1, w.x2) + 0.3
      : pt.y >= Math.min(w.y1, w.y2) - 0.3 && pt.y <= Math.max(w.y1, w.y2) + 0.3;
    const across = horiz ? Math.abs(pt.y - w.y1) : Math.abs(pt.x - w.x1);
    if (along && across <= 0.45) return { type: "wall", id: w.id };
  }
  // Room borders first, then interiors (so furniture inside stays reachable)
  for (const r of f.rooms) {
    const nearX = Math.abs(pt.x - r.x) <= 0.45 || Math.abs(pt.x - r.x - r.w) <= 0.45;
    const nearY = Math.abs(pt.y - r.y) <= 0.45 || Math.abs(pt.y - r.y - r.h) <= 0.45;
    const insideX = pt.x >= r.x - 0.45 && pt.x <= r.x + r.w + 0.45;
    const insideY = pt.y >= r.y - 0.45 && pt.y <= r.y + r.h + 0.45;
    if (((nearX && insideY) || (nearY && insideX))) return { type: "room", id: r.id };
  }
  for (const r of f.rooms) {
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
      return { type: "room", id: r.id };
    }
  }
  return null;
}

function roomCornerAt(room, pt) {
  const corners = [
    ["nw", room.x, room.y], ["ne", room.x + room.w, room.y],
    ["sw", room.x, room.y + room.h], ["se", room.x + room.w, room.y + room.h],
  ];
  for (const [name, cx, cy] of corners) {
    if (Math.abs(pt.x - cx) < 0.8 && Math.abs(pt.y - cy) < 0.8) return name;
  }
  return null;
}

/* ---------- Pointer handling (called from app.js) ---------- */

function fpPointerDown(p) {
  const pt = fpToFt(p);
  const f = fpFloor();

  if (fp.pending) {
    const def = FURNITURE_BY_KIND[fp.pending];
    const item = { id: uid(), kind: fp.pending, x: snapHalf(pt.x), y: snapHalf(pt.y), rot: 0 };
    f.furniture.push(item);
    fp.sel = { type: "furniture", id: item.id };
    fp.pending = null;
    fp.tool = "select";
    onPlanChanged(`${def.name} placed — drag to position`);
    return;
  }

  switch (fp.tool) {
    case "room":
    case "wall":
      fp.drag = { kind: fp.tool, x0: snapHalf(pt.x), y0: snapHalf(pt.y) };
      fp.ghost = null;
      return;

    case "door":
    case "window": {
      const w = fp.tool === "door" ? 3 : 4.5;
      const snap = snapToWall(pt, w / 2, 1.4);
      if (snap) {
        const op = { id: uid(), type: fp.tool, x: snap.x, y: snap.y, horiz: snap.horiz, w };
        f.openings.push(op);
        fp.sel = { type: "opening", id: op.id };
        fp.drag = { kind: "opening", id: op.id };
        onPlanChanged();
      } else {
        setStatus("Tap on a wall to place it");
      }
      return;
    }

    case "erase": {
      const hit = fpHitTest(pt);
      if (hit) {
        fpDelete(hit);
        onPlanChanged("Removed");
      }
      return;
    }

    default: { // select
      const selRoom = fp.sel && fp.sel.type === "room" ? fpSelected() : null;
      if (selRoom) {
        const corner = roomCornerAt(selRoom, pt);
        if (corner) {
          fp.drag = { kind: "resize", id: selRoom.id, corner };
          return;
        }
      }
      const hit = fpHitTest(pt);
      fp.sel = hit;
      if (!hit) {
        fp.drag = { kind: "pan", startX: p.x, startY: p.y, ox0: fp.view.ox, oy0: fp.view.oy };
      } else if (hit.type === "furniture") {
        const it = fpFind("furniture", hit.id);
        fp.drag = { kind: "furniture", id: hit.id, dx: pt.x - it.x, dy: pt.y - it.y };
      } else if (hit.type === "opening") {
        fp.drag = { kind: "opening", id: hit.id };
      } else if (hit.type === "room") {
        const r = fpFind("room", hit.id);
        fp.drag = {
          kind: "room", id: hit.id, dx: pt.x - r.x, dy: pt.y - r.y,
          inside: f.furniture.filter((it) =>
            it.x > r.x && it.x < r.x + r.w && it.y > r.y && it.y < r.y + r.h
          ).map((it) => ({ id: it.id, rx: it.x - r.x, ry: it.y - r.y })),
        };
      } else {
        fp.drag = { kind: "none" };
      }
      renderAll();
    }
  }
}

function fpPointerMove(p) {
  const pt = fpToFt(p);
  if (!fp.drag) {
    if (fp.tool === "room" || fp.tool === "wall") fp.ghost = null;
    return;
  }
  const d = fp.drag;

  if (d.kind === "pan") {
    fp.view.ox = d.ox0 + (p.x - d.startX);
    fp.view.oy = d.oy0 + (p.y - d.startY);
  } else if (d.kind === "room") {
    const r = fpFind("room", d.id);
    if (r) {
      r.x = snapHalf(pt.x - d.dx);
      r.y = snapHalf(pt.y - d.dy);
      for (const rec of d.inside) {
        const it = fpFind("furniture", rec.id);
        if (it) { it.x = r.x + rec.rx; it.y = r.y + rec.ry; }
      }
    }
  } else if (d.kind === "resize") {
    const r = fpFind("room", d.id);
    if (r) {
      const x2 = r.x + r.w, y2 = r.y + r.h;
      if (d.corner.includes("w")) { r.x = snapHalf(Math.min(pt.x, x2 - 3)); r.w = x2 - r.x; }
      if (d.corner.includes("e")) { r.w = Math.max(3, snapHalf(pt.x) - r.x); }
      if (d.corner.includes("n")) { r.y = snapHalf(Math.min(pt.y, y2 - 3)); r.h = y2 - r.y; }
      if (d.corner.includes("s")) { r.h = Math.max(3, snapHalf(pt.y) - r.y); }
    }
  } else if (d.kind === "furniture") {
    const it = fpFind("furniture", d.id);
    if (it) {
      it.x = snapHalf(pt.x - d.dx);
      it.y = snapHalf(pt.y - d.dy);
    }
  } else if (d.kind === "opening") {
    const op = fpFind("opening", d.id);
    if (op) {
      const snap = snapToWall(pt, op.w / 2, 2.5);
      if (snap) { op.x = snap.x; op.y = snap.y; op.horiz = snap.horiz; }
    }
  }

  if ((fp.tool === "room" || fp.tool === "wall") && d.x0 !== undefined) {
    if (fp.tool === "room") {
      fp.ghost = {
        kind: "room",
        x: Math.min(d.x0, snapHalf(pt.x)), y: Math.min(d.y0, snapHalf(pt.y)),
        w: Math.abs(snapHalf(pt.x) - d.x0), h: Math.abs(snapHalf(pt.y) - d.y0),
      };
    } else {
      // Axis-lock interior walls to the dominant direction
      const dx = Math.abs(pt.x - d.x0), dy = Math.abs(pt.y - d.y0);
      fp.ghost = dx >= dy
        ? { kind: "wall", x1: d.x0, y1: d.y0, x2: snapHalf(pt.x), y2: d.y0 }
        : { kind: "wall", x1: d.x0, y1: d.y0, x2: d.x0, y2: snapHalf(pt.y) };
    }
  }

  renderAll();
  scheduleSave();
}

function fpPointerUp() {
  const f = fpFloor();
  if (fp.ghost) {
    if (fp.ghost.kind === "room" && fp.ghost.w >= 3 && fp.ghost.h >= 3) {
      const room = { id: uid(), ...fp.ghost, label: "Room" };
      delete room.kind;
      f.rooms.push(room);
      fp.sel = { type: "room", id: room.id };
      onPlanChanged("Room added — double-tap to rename");
    } else if (fp.ghost.kind === "wall" &&
               (Math.abs(fp.ghost.x2 - fp.ghost.x1) >= 1.5 || Math.abs(fp.ghost.y2 - fp.ghost.y1) >= 1.5)) {
      const wall = { id: uid(), x1: fp.ghost.x1, y1: fp.ghost.y1, x2: fp.ghost.x2, y2: fp.ghost.y2 };
      f.walls.push(wall);
      fp.sel = { type: "wall", id: wall.id };
      onPlanChanged();
    }
    fp.ghost = null;
  }
  fp.drag = null;
  renderAll();
  scheduleSave();
}

function fpDoubleClick(p) {
  const hit = fpHitTest(fpToFt(p));
  if (hit && hit.type === "room") {
    const r = fpFind("room", hit.id);
    const name = prompt("Room name:", r.label);
    if (name !== null && name.trim()) {
      r.label = name.trim();
      onPlanChanged();
    }
  }
}

/* ---------- Editing actions ---------- */

function fpDelete(sel = fp.sel) {
  if (!sel) return;
  const f = fpFloor();
  const lists = { room: f.rooms, wall: f.walls, opening: f.openings, furniture: f.furniture };
  const list = lists[sel.type];
  const idx = list.findIndex((it) => it.id === sel.id);
  if (idx >= 0) list.splice(idx, 1);
  if (fp.sel && fp.sel.id === sel.id) fp.sel = null;
}

function fpRotateSelected() {
  const it = fpSelected();
  if (fp.sel && fp.sel.type === "furniture" && it) {
    it.rot = (it.rot + 90) % 360;
    onPlanChanged();
  } else {
    setStatus("Select a furniture piece to rotate");
  }
}

function fpDuplicateSelected() {
  const it = fpSelected();
  if (fp.sel && fp.sel.type === "furniture" && it) {
    const copy = { ...it, id: uid(), x: it.x + 1.5, y: it.y + 1.5 };
    fpFloor().furniture.push(copy);
    fp.sel = { type: "furniture", id: copy.id };
    onPlanChanged();
  } else {
    setStatus("Select a furniture piece to duplicate");
  }
}

function fpZoom(factor) {
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
  const s0 = fp.view.scale;
  fp.view.scale = clamp(s0 * factor, 7, 40);
  const k = fp.view.scale / s0;
  fp.view.ox = cx - (cx - fp.view.ox) * k;
  fp.view.oy = cy - (cy - fp.view.oy) * k;
  renderAll();
}

function fpFit() {
  const f = fpFloor();
  const xs = [], ys = [];
  for (const r of f.rooms) { xs.push(r.x, r.x + r.w); ys.push(r.y, r.y + r.h); }
  for (const w of f.walls) { xs.push(w.x1, w.x2); ys.push(w.y1, w.y2); }
  for (const it of f.furniture) { xs.push(it.x); ys.push(it.y); }
  if (!xs.length) { fp.view = { ox: 80, oy: 45, scale: 18 }; renderAll(); return; }
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = clamp(Math.min(
    (CANVAS_W * 0.86) / Math.max(8, maxX - minX),
    (CANVAS_H * 0.86) / Math.max(8, maxY - minY)
  ), 7, 30);
  fp.view.scale = scale;
  fp.view.ox = CANVAS_W / 2 - ((minX + maxX) / 2) * scale;
  fp.view.oy = CANVAS_H / 2 - ((minY + maxY) / 2) * scale;
  renderAll();
}

/* ---------- Rendering ---------- */

function renderFloorplan(ctx) {
  const { ox, oy, scale } = fp.view;
  const f = fpFloor();

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid: minor 1 ft, major 5 ft
  ctx.lineWidth = 1;
  const startX = ox % scale, startY = oy % scale;
  ctx.strokeStyle = "rgba(90, 110, 140, 0.07)";
  ctx.beginPath();
  for (let x = startX; x < CANVAS_W; x += scale) { ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); }
  for (let y = startY; y < CANVAS_H; y += scale) { ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); }
  ctx.stroke();
  ctx.strokeStyle = "rgba(90, 110, 140, 0.16)";
  ctx.beginPath();
  const major = scale * 5;
  for (let x = ox % major; x < CANVAS_W; x += major) { ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); }
  for (let y = oy % major; y < CANVAS_H; y += major) { ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); }
  ctx.stroke();

  ctx.save();
  ctx.translate(ox, oy);

  const wallPx = Math.max(3, WALL_FT * scale);

  // Room floors
  for (let i = 0; i < f.rooms.length; i++) {
    const r = f.rooms[i];
    ctx.fillStyle = i % 2 ? "#f4efe2" : FLOOR_FILL;
    ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
  }

  // Walls
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = wallPx;
  ctx.lineJoin = "miter";
  for (const r of f.rooms) {
    ctx.strokeRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
  }
  ctx.lineCap = "square";
  ctx.beginPath();
  for (const w of f.walls) {
    ctx.moveTo(w.x1 * scale, w.y1 * scale);
    ctx.lineTo(w.x2 * scale, w.y2 * scale);
  }
  ctx.stroke();
  ctx.lineCap = "butt";

  // Openings
  for (const op of f.openings) drawOpening(ctx, op, scale, wallPx);

  // Furniture — rugs first so everything else sits on top of them
  for (const it of f.furniture) if (it.kind === "rug") drawFurnitureItem(ctx, it, scale);
  for (const it of f.furniture) if (it.kind !== "rug") drawFurnitureItem(ctx, it, scale);

  // Labels + dimensions
  for (const r of f.rooms) {
    const cx = (r.x + r.w / 2) * scale, cy = (r.y + r.h / 2) * scale;
    const size = clamp(scale * 0.62, 10, 17);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(60, 55, 48, 0.85)";
    ctx.font = `600 ${size}px 'Avenir Next', 'Segoe UI', sans-serif`;
    ctx.fillText(r.label, cx, cy - size * 0.25);
    ctx.font = `${size * 0.78}px 'Avenir Next', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(60, 55, 48, 0.55)";
    ctx.fillText(`${fmtFt(r.w)} × ${fmtFt(r.h)} · ${Math.round(r.w * r.h)} ft²`, cx, cy + size * 0.85);
  }

  // Ghost preview while drawing
  if (fp.ghost) {
    ctx.strokeStyle = ACCENT;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    if (fp.ghost.kind === "room") {
      ctx.strokeRect(fp.ghost.x * scale, fp.ghost.y * scale, fp.ghost.w * scale, fp.ghost.h * scale);
      ctx.fillStyle = "rgba(47, 111, 79, 0.08)";
      ctx.fillRect(fp.ghost.x * scale, fp.ghost.y * scale, fp.ghost.w * scale, fp.ghost.h * scale);
      if (fp.ghost.w >= 1 && fp.ghost.h >= 1) {
        ctx.fillStyle = ACCENT;
        ctx.font = "12px 'Avenir Next', 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${fmtFt(fp.ghost.w)} × ${fmtFt(fp.ghost.h)}`,
          (fp.ghost.x + fp.ghost.w / 2) * scale, (fp.ghost.y + fp.ghost.h / 2) * scale);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(fp.ghost.x1 * scale, fp.ghost.y1 * scale);
      ctx.lineTo(fp.ghost.x2 * scale, fp.ghost.y2 * scale);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Selection
  drawPlanSelection(ctx, scale);

  ctx.restore();
}

function fmtFt(v) {
  return Number.isInteger(v) ? `${v}′` : `${v.toFixed(1)}′`;
}

function drawOpening(ctx, op, scale, wallPx) {
  const len = op.w * scale;
  ctx.save();
  ctx.translate(op.x * scale, op.y * scale);
  if (!op.horiz) ctx.rotate(Math.PI / 2);

  // Clear the wall
  ctx.fillStyle = PAPER;
  ctx.fillRect(-len / 2, -wallPx / 2 - 1, len, wallPx + 2);

  if (op.type === "window") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-len / 2, -wallPx / 2, len, wallPx);
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-len / 2, -wallPx / 2, len, wallPx);
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();
  } else {
    // Door leaf + swing arc, hinged on the left end
    ctx.strokeStyle = "#8a8378";
    ctx.lineWidth = Math.max(1.5, scale * 0.08);
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(-len / 2, -len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-len / 2, 0, len, -Math.PI / 2, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(138, 131, 120, 0.6)";
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanSelection(ctx, scale) {
  const it = fpSelected();
  if (!it) return;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);

  if (fp.sel.type === "room") {
    ctx.strokeRect(it.x * scale - 4, it.y * scale - 4, it.w * scale + 8, it.h * scale + 8);
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff";
    for (const [cx, cy] of [[it.x, it.y], [it.x + it.w, it.y], [it.x, it.y + it.h], [it.x + it.w, it.y + it.h]]) {
      ctx.beginPath();
      ctx.arc(cx * scale, cy * scale, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (fp.sel.type === "furniture") {
    const fpz = furFootprint(it);
    ctx.strokeRect((it.x - fpz.w / 2) * scale - 4, (it.y - fpz.d / 2) * scale - 4,
      fpz.w * scale + 8, fpz.d * scale + 8);
  } else if (fp.sel.type === "opening") {
    const hw = it.horiz ? it.w / 2 : 0.5, hh = it.horiz ? 0.5 : it.w / 2;
    ctx.strokeRect((it.x - hw) * scale - 3, (it.y - hh) * scale - 3, hw * 2 * scale + 6, hh * 2 * scale + 6);
  } else if (fp.sel.type === "wall") {
    ctx.beginPath();
    ctx.moveTo(it.x1 * scale, it.y1 * scale);
    ctx.lineTo(it.x2 * scale, it.y2 * scale);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(47, 111, 79, 0.45)";
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function floorArea(floor) {
  return Math.round(floor.rooms.reduce((sum, r) => sum + r.w * r.h, 0));
}
