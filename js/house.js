/*
 * House rendering.
 *
 * All drawing happens in "house units" with the origin at the bottom-center
 * of the facade. Positive y points down (canvas convention), so the walls
 * extend into negative y. Callers translate/scale the context to position
 * the house, which lets the same renderer serve both the design view and
 * the location scenes.
 */

const STORY_H = 110;

function houseMetrics(d) {
  const wallH = d.stories * STORY_H;
  const roofH = d.roof === "flat" ? 16 : 72;
  const garageW = d.garage ? 112 : 0;
  return {
    wallH,
    roofH,
    garageW,
    garageH: 94,
    left: -d.width / 2 - 16,
    right: d.width / 2 + garageW + 16,
    totalW: d.width + garageW + 32,
    totalH: wallH + roofH + (d.chimney ? 34 : 0),
  };
}

/* Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function drawHouse(ctx, d, opts = {}) {
  const m = houseMetrics(d);
  const w = d.width;
  const wallEdge = shade(d.wallColor, -45);

  if (d.garage) drawGarage(ctx, d, m, wallEdge);

  // Main walls
  ctx.fillStyle = d.wallColor;
  ctx.strokeStyle = wallEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-w / 2, -m.wallH, w, m.wallH);
  ctx.fill();
  ctx.stroke();

  // Foundation strip
  ctx.fillStyle = shade(d.wallColor, -70);
  ctx.fillRect(-w / 2, -9, w, 9);

  // Band between stories
  if (d.stories === 2) {
    ctx.fillStyle = d.trimColor;
    ctx.fillRect(-w / 2, -STORY_H - 3, w, 6);
  }

  if (d.chimney) drawChimney(ctx, d, m);
  drawRoof(ctx, d, m);

  for (const win of d.windows) drawWindow(ctx, d, m, win, opts);

  drawDoor(ctx, d, opts);
  if (d.porch) drawPorch(ctx, d);
}

function drawRoof(ctx, d, m) {
  const w = d.width;
  const ov = 16; // eave overhang
  ctx.fillStyle = d.roofColor;
  ctx.strokeStyle = shade(d.roofColor, -45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (d.roof === "gable") {
    ctx.moveTo(-w / 2 - ov, -m.wallH);
    ctx.lineTo(0, -m.wallH - m.roofH);
    ctx.lineTo(w / 2 + ov, -m.wallH);
  } else if (d.roof === "hip") {
    ctx.moveTo(-w / 2 - ov, -m.wallH);
    ctx.lineTo(-w / 4, -m.wallH - m.roofH);
    ctx.lineTo(w / 4, -m.wallH - m.roofH);
    ctx.lineTo(w / 2 + ov, -m.wallH);
  } else {
    ctx.rect(-w / 2 - 8, -m.wallH - m.roofH, w + 16, m.roofH);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fascia board along the eave
  if (d.roof !== "flat") {
    ctx.fillStyle = shade(d.roofColor, -30);
    ctx.fillRect(-w / 2 - ov, -m.wallH - 3, w + ov * 2, 6);
  }
}

function drawChimney(ctx, d, m) {
  const cx = d.width * 0.28;
  const pitched = d.roof !== "flat";
  const top = -(m.wallH + m.roofH + (pitched ? 8 : 26));
  const brick = "#9c5744";
  // The shaft runs down behind the roof, which is drawn afterwards.
  ctx.fillStyle = brick;
  ctx.fillRect(cx - 12, top, 24, -top - m.wallH + 20);
  ctx.strokeStyle = shade("#9c5744", -50);
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 12, top, 24, -top - m.wallH + 20);
  // Cap
  ctx.fillStyle = shade("#9c5744", -60);
  ctx.fillRect(cx - 15, top - 7, 30, 7);
}

function drawWindow(ctx, d, m, win, opts) {
  const x = win.x - win.w / 2;
  const y = -m.wallH + win.y;

  // Frame
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(x - 4, y - 4, win.w + 8, win.h + 8);

  // Glass
  if (opts.night) {
    ctx.save();
    ctx.shadowColor = "rgba(255, 214, 120, 0.9)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#ffd98a";
    ctx.fillRect(x, y, win.w, win.h);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(x, y, x + win.w, y + win.h);
    g.addColorStop(0, "#e6f4fb");
    g.addColorStop(1, "#a9cfe0");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, win.w, win.h);
  }

  // Mullions
  ctx.strokeStyle = opts.night ? "rgba(120,80,20,0.55)" : shade(d.trimColor, -35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + win.w / 2, y);
  ctx.lineTo(x + win.w / 2, y + win.h);
  ctx.moveTo(x, y + win.h / 2);
  ctx.lineTo(x + win.w, y + win.h / 2);
  ctx.stroke();

  // Sill
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(x - 7, y + win.h + 4, win.w + 14, 5);
}

function drawDoor(ctx, d, opts) {
  const dw = 42;
  const dh = 86;
  const x = d.door.x;

  // Frame
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(x - dw / 2 - 4, -dh - 8, dw + 8, dh + 8);

  // Leaf
  ctx.fillStyle = d.doorColor;
  ctx.beginPath();
  if (d.door.style === "arched") {
    ctx.moveTo(x - dw / 2, 0);
    ctx.lineTo(x - dw / 2, -dh + 18);
    ctx.quadraticCurveTo(x, -dh - 12, x + dw / 2, -dh + 18);
    ctx.lineTo(x + dw / 2, 0);
  } else {
    ctx.rect(x - dw / 2, -dh, dw, dh);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(d.doorColor, -50);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inset panels
  ctx.strokeStyle = shade(d.doorColor, -35);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - dw / 2 + 7, -dh + 26, dw - 14, 24);
  ctx.strokeRect(x - dw / 2 + 7, -dh + 56, dw - 14, 22);

  // Knob
  ctx.fillStyle = opts.night ? "#ffd98a" : "#e8c15a";
  ctx.beginPath();
  ctx.arc(x + dw / 2 - 9, -dh * 0.46, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPorch(ctx, d) {
  const x = d.door.x;
  const pw = 96;
  // Posts
  ctx.fillStyle = d.trimColor;
  ctx.strokeStyle = shade(d.trimColor, -40);
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - pw / 2 + 4, -102, 7, 102);
  ctx.strokeRect(x - pw / 2 + 4, -102, 7, 102);
  ctx.fillRect(x + pw / 2 - 11, -102, 7, 102);
  ctx.strokeRect(x + pw / 2 - 11, -102, 7, 102);
  // Canopy
  ctx.fillStyle = d.roofColor;
  ctx.strokeStyle = shade(d.roofColor, -45);
  ctx.beginPath();
  ctx.moveTo(x - pw / 2 - 8, -102);
  ctx.lineTo(x + pw / 2 + 8, -102);
  ctx.lineTo(x + pw / 2 + 2, -116);
  ctx.lineTo(x - pw / 2 - 2, -116);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawGarage(ctx, d, m, wallEdge) {
  const gx = d.width / 2;
  const gw = m.garageW;
  const gh = m.garageH;

  ctx.fillStyle = shade(d.wallColor, -12);
  ctx.strokeStyle = wallEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(gx, -gh, gw, gh);
  ctx.fill();
  ctx.stroke();

  // Roof cap
  ctx.fillStyle = d.roofColor;
  ctx.fillRect(gx - 3, -gh - 11, gw + 10, 12);

  // Roll-up door
  ctx.fillStyle = d.trimColor;
  ctx.fillRect(gx + 12, -74, gw - 24, 74);
  ctx.strokeStyle = shade(d.trimColor, -45);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(gx + 12, -74, gw - 24, 74);
  ctx.beginPath();
  for (let y = -60; y < 0; y += 14) {
    ctx.moveTo(gx + 12, y);
    ctx.lineTo(gx + gw - 12, y);
  }
  ctx.stroke();
}

/* Soft contact shadow drawn under the house in scene views. */
function drawHouseShadow(ctx, d) {
  const m = houseMetrics(d);
  ctx.save();
  ctx.fillStyle = "rgba(20, 25, 20, 0.18)";
  ctx.beginPath();
  ctx.ellipse((m.left + m.right) / 2, 6, m.totalW / 2, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
