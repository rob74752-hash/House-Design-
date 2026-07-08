/*
 * Exterior elevation renderer. Draws the house with an oblique depth
 * projection (a visible side wall and roof plane), textured materials,
 * and detailed windows/doors, so the elevation reads like a real home
 * rather than a flat cartoon.
 *
 * Origin: bottom-center of the facade; y is negative going up.
 */

const STORY_H = 112;
const DEPTH_X = 46; // oblique depth vector
const DEPTH_Y = -22;

function houseMetrics(d) {
  const wallH = d.stories * STORY_H;
  const roofH = d.roof === "flat" ? 16 : 64 + d.width * 0.06;
  const garageW = d.garage ? 118 : 0;
  return {
    wallH,
    roofH,
    garageW,
    garageH: 100,
    left: -d.width / 2 - 20,
    right: d.width / 2 + garageW + DEPTH_X + 4,
    totalW: d.width + garageW + DEPTH_X + 40,
    totalH: wallH + roofH + Math.abs(DEPTH_Y) + (d.chimney ? 30 : 6),
  };
}

/* ---------- Material patterns (cached offscreen tiles) ---------- */

const _patternCache = new Map();

function materialPattern(ctx, material, color) {
  const key = material + color;
  if (_patternCache.has(key)) return _patternCache.get(key);

  const tile = document.createElement("canvas");
  const tc = tile.getContext("2d");

  if (material === "brick") {
    tile.width = 52;
    tile.height = 32;
    tc.fillStyle = shade(color, 34); // mortar
    tc.fillRect(0, 0, 52, 32);
    const brick = (x, y, w) => {
      tc.fillStyle = shade(color, Math.floor((Math.sin(x * 7 + y * 13) * 0.5 + 0.5) * 18) - 9);
      tc.fillRect(x + 1, y + 1, w - 2, 14);
    };
    brick(0, 0, 26); brick(26, 0, 26);
    brick(-13, 16, 26); brick(13, 16, 26); brick(39, 16, 26);
  } else if (material === "siding") {
    tile.width = 8;
    tile.height = 13;
    tc.fillStyle = color;
    tc.fillRect(0, 0, 8, 13);
    tc.fillStyle = shade(color, -26);
    tc.fillRect(0, 11, 8, 2);
    tc.fillStyle = shade(color, 14);
    tc.fillRect(0, 0, 8, 1.5);
  } else if (material === "board") {
    tile.width = 22;
    tile.height = 8;
    tc.fillStyle = color;
    tc.fillRect(0, 0, 22, 8);
    tc.fillStyle = shade(color, -22);
    tc.fillRect(0, 0, 3, 8);
    tc.fillStyle = shade(color, 10);
    tc.fillRect(3, 0, 1.5, 8);
  } else {
    // stucco
    tile.width = 40;
    tile.height = 40;
    tc.fillStyle = color;
    tc.fillRect(0, 0, 40, 40);
    let s = 7;
    for (let i = 0; i < 90; i++) {
      s = (s * 16807) % 2147483647;
      const x = (s % 40), y = ((s >> 5) % 40);
      tc.fillStyle = i % 2 ? shade(color, -12) : shade(color, 12);
      tc.globalAlpha = 0.35;
      tc.fillRect(x, y, 1.6, 1.6);
    }
    tc.globalAlpha = 1;
  }

  const pat = ctx.createPattern(tile, "repeat");
  _patternCache.set(key, pat);
  return pat;
}

function shinglePattern(ctx, color) {
  const key = "shingle" + color;
  if (_patternCache.has(key)) return _patternCache.get(key);
  const tile = document.createElement("canvas");
  tile.width = 36;
  tile.height = 22;
  const tc = tile.getContext("2d");
  tc.fillStyle = color;
  tc.fillRect(0, 0, 36, 22);
  tc.strokeStyle = shade(color, -30);
  tc.lineWidth = 1.4;
  tc.beginPath();
  tc.moveTo(0, 10.5); tc.lineTo(36, 10.5);
  tc.moveTo(0, 21.5); tc.lineTo(36, 21.5);
  tc.moveTo(9, 0); tc.lineTo(9, 10);
  tc.moveTo(27, 0); tc.lineTo(27, 10);
  tc.moveTo(0, 11); tc.lineTo(0, 21);
  tc.moveTo(18, 11); tc.lineTo(18, 21);
  tc.stroke();
  tc.fillStyle = "rgba(255,255,255,0.05)";
  tc.fillRect(0, 0, 36, 2);
  tc.fillRect(0, 11, 36, 2);
  const pat = ctx.createPattern(tile, "repeat");
  _patternCache.set(key, pat);
  return pat;
}

/* ---------- Main renderer ---------- */

function drawHouse(ctx, d, opts = {}) {
  const m = houseMetrics(d);
  const w = d.width;
  const edge = shade(d.wallColor, -70);

  ctx.lineJoin = "round";

  // Side wall (oblique depth), attached at the facade's right edge
  const sideBase = d.garage ? null : sideQuad(w / 2, m.wallH);
  if (sideBase) {
    fillQuad(ctx, sideBase, shade(d.wallColor, -48), edge);
  }

  // Gable end on the side (for gable roofs)
  if (d.roof === "gable" && !d.garage) {
    ctx.fillStyle = shade(d.wallColor, -58);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2, -m.wallH);
    ctx.lineTo(w / 2 + DEPTH_X, -m.wallH + DEPTH_Y);
    ctx.lineTo(w / 2 + DEPTH_X / 2, -m.wallH - m.roofH + DEPTH_Y / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Facade
  ctx.fillStyle = materialPattern(ctx, d.material, d.wallColor);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-w / 2, -m.wallH, w, m.wallH);
  ctx.fill();
  ctx.stroke();

  // Foundation
  ctx.fillStyle = "#9d968c";
  ctx.fillRect(-w / 2 - 3, -10, w + 6, 10);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(-w / 2 - 3, -10, w + 6, 2.5);

  // Story trim bands
  ctx.fillStyle = d.trimColor;
  for (let s = 1; s < d.stories; s++) {
    ctx.fillRect(-w / 2, -s * STORY_H - 3, w, 5);
  }

  // Corner boards
  ctx.fillStyle = shade(d.trimColor, -12);
  ctx.fillRect(-w / 2 - 1, -m.wallH, 7, m.wallH);
  ctx.fillRect(w / 2 - 6, -m.wallH, 7, m.wallH);

  if (d.garage) drawGarage(ctx, d, m, edge);
  if (d.chimney) drawChimney(ctx, d, m);

  drawRoof(ctx, d, m);

  // Soft shadow cast by the eave onto the wall
  if (d.roof !== "flat") {
    const g = ctx.createLinearGradient(0, -m.wallH, 0, -m.wallH + 22);
    g.addColorStop(0, "rgba(20, 18, 14, 0.28)");
    g.addColorStop(1, "rgba(20, 18, 14, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -m.wallH, w, 22);
  }

  for (const win of d.windows) drawFacadeWindow(ctx, d, m, win, opts);

  drawEntry(ctx, d, opts);

  // Contact shading at grade
  const ao = ctx.createLinearGradient(0, -8, 0, 2);
  ao.addColorStop(0, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = ao;
  ctx.fillRect(m.left + 8, -8, m.totalW - 40, 10);
}

function sideQuad(x, wallH) {
  return [
    [x, 0],
    [x, -wallH],
    [x + DEPTH_X, -wallH + DEPTH_Y],
    [x + DEPTH_X, DEPTH_Y],
  ];
}

function fillQuad(ctx, pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/* ---------- Roof ---------- */

function drawRoof(ctx, d, m) {
  const w = d.width;
  const ov = 18;
  const eaveY = -m.wallH;
  const ridgeY = -m.wallH - m.roofH + DEPTH_Y / 2;
  const roofEdge = shade(d.roofColor, -55);
  const shingles = shinglePattern(ctx, d.roofColor);

  if (d.roof === "flat") {
    // Roof deck (top plane)
    fillQuad(ctx, [
      [-w / 2 - 8, eaveY - 14],
      [w / 2 + 8, eaveY - 14],
      [w / 2 + 8 + DEPTH_X, eaveY - 14 + DEPTH_Y],
      [-w / 2 - 8 + DEPTH_X, eaveY - 14 + DEPTH_Y],
    ], shade(d.roofColor, -18), roofEdge);
    // Parapet fascia
    ctx.fillStyle = d.roofColor;
    ctx.strokeStyle = roofEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2 - 8, eaveY - 14, w + 16, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(d.roofColor, 22);
    ctx.fillRect(-w / 2 - 8, eaveY - 14, w + 16, 3);
    return;
  }

  const hipInset = d.roof === "hip" ? w * 0.22 : 0;
  const slope = [
    [-w / 2 - ov, eaveY],
    [w / 2 + ov, eaveY],
    [w / 2 + ov + DEPTH_X / 2 - hipInset, ridgeY],
    [-w / 2 - ov + DEPTH_X / 2 + hipInset, ridgeY],
  ];

  if (d.roof === "hip") {
    // Right hip face
    fillQuad(ctx, [
      [w / 2 + ov, eaveY],
      [w / 2 + ov + DEPTH_X, eaveY + DEPTH_Y],
      [w / 2 + ov + DEPTH_X / 2 - hipInset, ridgeY],
    ], shade(d.roofColor, -38), roofEdge);
  }

  // Front slope with shingle texture
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(slope[0][0], slope[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(slope[i][0], slope[i][1]);
  ctx.closePath();
  ctx.fillStyle = shingles;
  ctx.fill();
  // Depth shading across the slope
  const g = ctx.createLinearGradient(0, ridgeY, 0, eaveY);
  g.addColorStop(0, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = roofEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Ridge cap
  ctx.strokeStyle = shade(d.roofColor, -40);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(slope[3][0], slope[3][1]);
  ctx.lineTo(slope[2][0], slope[2][1]);
  ctx.stroke();

  // Fascia + gutter along the front eave
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(-w / 2 - ov, eaveY - 2, w + ov * 2, 7);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(-w / 2 - ov, eaveY + 3, w + ov * 2, 2);
}

function drawChimney(ctx, d, m) {
  const cx = -d.width * 0.26 + DEPTH_X * 0.25;
  const topY = -(m.wallH + m.roofH + 22);
  const baseY = d.roof === "flat" ? -(m.wallH + 8) : -(m.wallH + m.roofH * 0.4);
  const brickPat = materialPattern(ctx, "brick", "#8d5544");
  ctx.fillStyle = brickPat;
  ctx.strokeStyle = "#4e2f26";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(cx - 13, topY, 26, baseY - topY);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6f6a63";
  ctx.fillRect(cx - 16, topY - 6, 32, 7);
  ctx.fillStyle = "#3f3b37";
  ctx.fillRect(cx - 8, topY - 12, 16, 7);
}

/* ---------- Openings ---------- */

function drawFacadeWindow(ctx, d, m, win, opts) {
  const x = win.x - win.w / 2;
  const y = -m.wallH + win.y;
  const trimDk = shade(d.trimColor, -35);

  // Shutters
  if (d.shutters) {
    const sw = Math.min(15, win.w * 0.32);
    for (const sx of [x - sw - 5, x + win.w + 5]) {
      ctx.fillStyle = shade(d.doorColor, -8);
      ctx.strokeStyle = shade(d.doorColor, -50);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.rect(sx, y - 3, sw, win.h + 6);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = shade(d.doorColor, -30);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let ly = y + 4; ly < y + win.h - 2; ly += 6) {
        ctx.moveTo(sx + 2, ly);
        ctx.lineTo(sx + sw - 2, ly);
      }
      ctx.stroke();
    }
  }

  // Trim casing
  ctx.fillStyle = d.trimColor;
  ctx.strokeStyle = trimDk;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(x - 5, y - 6, win.w + 10, win.h + 10);
  ctx.fill();
  ctx.stroke();

  // Glass
  if (opts.night) {
    ctx.save();
    ctx.shadowColor = "rgba(255, 208, 112, 0.85)";
    ctx.shadowBlur = 20;
    const g = ctx.createLinearGradient(x, y, x, y + win.h);
    g.addColorStop(0, "#ffe3a1");
    g.addColorStop(1, "#f4b95c");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, win.w, win.h);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + win.h);
    g.addColorStop(0, "#cfdde8");
    g.addColorStop(0.55, "#9fb4c2");
    g.addColorStop(1, "#7e95a5");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, win.w, win.h);
    // Sky reflection streak
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, win.w, win.h);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.moveTo(x - 6, y + win.h * 0.7);
    ctx.lineTo(x + win.w * 0.5, y - 6);
    ctx.lineTo(x + win.w * 0.78, y - 6);
    ctx.lineTo(x + win.w * 0.16, y + win.h + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Muntins (2 x 3 panes)
  ctx.strokeStyle = opts.night ? "rgba(122, 84, 32, 0.6)" : d.trimColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + win.w / 2, y);
  ctx.lineTo(x + win.w / 2, y + win.h);
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(x, y + (win.h * i) / 3);
    ctx.lineTo(x + win.w, y + (win.h * i) / 3);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, win.w, win.h);

  // Sill + shadow
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(x - 8, y + win.h + 4, win.w + 16, 6);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - 8, y + win.h + 10, win.w + 16, 2);
}

function drawEntry(ctx, d, opts) {
  const x = d.door.x;
  const dw = 44;
  const dh = 92;
  const trimDk = shade(d.trimColor, -35);

  // Stoop
  ctx.fillStyle = "#b3aca1";
  ctx.strokeStyle = "#7e786e";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(x - dw / 2 - 14, -6, dw + 28, 6);
  ctx.fill();
  ctx.stroke();

  // Porch columns + canopy
  if (d.porch) {
    const pw = 104;
    ctx.fillStyle = d.trimColor;
    ctx.strokeStyle = trimDk;
    ctx.lineWidth = 1.4;
    for (const px of [x - pw / 2 + 2, x + pw / 2 - 11]) {
      ctx.beginPath();
      ctx.rect(px, -112, 9, 112);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(px - 2, -112, 13, 5);
      ctx.fillRect(px - 2, -8, 13, 8);
    }
    // Canopy with depth
    fillQuad(ctx, [
      [x - pw / 2 - 10, -112],
      [x + pw / 2 + 10, -112],
      [x + pw / 2 + 10 + DEPTH_X * 0.4, -112 + DEPTH_Y * 0.4 - 6],
      [x - pw / 2 - 10 + DEPTH_X * 0.4, -112 + DEPTH_Y * 0.4 - 6],
    ], shade(d.roofColor, -8), shade(d.roofColor, -50));
    ctx.fillStyle = d.trimColor;
    ctx.fillRect(x - pw / 2 - 10, -114, pw + 20, 6);
  }

  // Door casing
  ctx.fillStyle = d.trimColor;
  ctx.strokeStyle = trimDk;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(x - dw / 2 - 6, -dh - 10, dw + 12, dh + 10);
  ctx.fill();
  ctx.stroke();

  // Door leaf
  const doorGrad = ctx.createLinearGradient(x - dw / 2, 0, x + dw / 2, 0);
  doorGrad.addColorStop(0, shade(d.doorColor, 14));
  doorGrad.addColorStop(1, shade(d.doorColor, -14));
  ctx.fillStyle = doorGrad;
  ctx.strokeStyle = shade(d.doorColor, -55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (d.door.style === "arched") {
    ctx.moveTo(x - dw / 2, 0);
    ctx.lineTo(x - dw / 2, -dh + 20);
    ctx.quadraticCurveTo(x, -dh - 12, x + dw / 2, -dh + 20);
    ctx.lineTo(x + dw / 2, 0);
  } else {
    ctx.rect(x - dw / 2, -dh, dw, dh);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glazed upper lite or panels
  if (opts.night) {
    ctx.fillStyle = "#ffdf9a";
  } else {
    ctx.fillStyle = "#aebfcb";
  }
  ctx.fillRect(x - dw / 2 + 8, -dh + 12, dw - 16, 26);
  ctx.strokeStyle = shade(d.doorColor, -40);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x - dw / 2 + 8, -dh + 12, dw - 16, 26);
  ctx.beginPath();
  ctx.moveTo(x, -dh + 12);
  ctx.lineTo(x, -dh + 38);
  ctx.stroke();
  ctx.strokeRect(x - dw / 2 + 8, -dh + 46, dw - 16, 18);
  ctx.strokeRect(x - dw / 2 + 8, -dh + 70, dw - 16, 18);

  // Hardware
  ctx.fillStyle = "#d9c184";
  ctx.beginPath();
  ctx.arc(x + dw / 2 - 8, -dh * 0.45, 3, 0, Math.PI * 2);
  ctx.fill();

  // Wall lantern by the door (glows at night)
  const lx = x - dw / 2 - 16;
  ctx.fillStyle = "#3a3a3e";
  ctx.fillRect(lx - 3, -dh + 8, 6, 12);
  if (opts.night) {
    const g = ctx.createRadialGradient(lx, -dh + 14, 1, lx, -dh + 14, 22);
    g.addColorStop(0, "rgba(255, 216, 130, 0.95)");
    g.addColorStop(1, "rgba(255, 216, 130, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, -dh + 14, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGarage(ctx, d, m, edge) {
  const gx = d.width / 2;
  const gw = m.garageW;
  const gh = m.garageH;

  // Garage side depth
  fillQuad(ctx, sideQuad(gx + gw, gh).map(([px, py]) => [px, Math.max(py, -gh + DEPTH_Y)]),
    shade(d.wallColor, -48), edge);

  ctx.fillStyle = materialPattern(ctx, d.material, shade(d.wallColor, -6));
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(gx, -gh, gw, gh);
  ctx.fill();
  ctx.stroke();

  // Garage roof cap with depth
  fillQuad(ctx, [
    [gx - 4, -gh - 12],
    [gx + gw + 6, -gh - 12],
    [gx + gw + 6 + DEPTH_X * 0.7, -gh - 12 + DEPTH_Y * 0.7],
    [gx - 4 + DEPTH_X * 0.7, -gh - 12 + DEPTH_Y * 0.7],
  ], shade(d.roofColor, -14), shade(d.roofColor, -50));
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(gx - 4, -gh - 12, gw + 10, 5);

  // Paneled roll-up door
  const doorX = gx + 13;
  const doorW = gw - 26;
  ctx.fillStyle = shade(d.trimColor, -6);
  ctx.strokeStyle = shade(d.trimColor, -45);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(doorX, -78, doorW, 78);
  ctx.fill();
  ctx.stroke();
  for (let y = -78; y < -6; y += 18) {
    ctx.fillStyle = "rgba(0,0,0,0.09)";
    ctx.fillRect(doorX + 2, y + 13, doorW - 4, 3);
    ctx.strokeStyle = shade(d.trimColor, -25);
    ctx.strokeRect(doorX + 5, y + 3, doorW - 10, 10);
  }
  // Top row of lites
  ctx.fillStyle = "#a9bcc8";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(doorX + 6 + (i * (doorW - 12)) / 4, -75, (doorW - 12) / 4 - 4, 8);
  }
}

/* Soft contact shadow drawn under the house in scene views. */
function drawHouseShadow(ctx, d) {
  const m = houseMetrics(d);
  ctx.save();
  ctx.fillStyle = "rgba(20, 25, 20, 0.2)";
  ctx.beginPath();
  ctx.ellipse((m.left + m.right) / 2, 7, m.totalW / 2, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
