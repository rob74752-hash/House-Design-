/*
 * Location scenes. Each scene paints a full-canvas backdrop and tells the
 * app where the ground line sits (`ground`, as a fraction of canvas height)
 * and how large the house should render (`houseScale`). Scenes with `night`
 * make the house windows glow; a scene with `water` gets a mirrored house
 * reflection clipped to the water area.
 */

function vGrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [pos, color] of stops) g.addColorStop(pos, color);
  return g;
}

/* Deterministic PRNG so scenes look identical on every redraw. */
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pine(ctx, x, groundY, size, color, snowy = false) {
  ctx.fillStyle = "#5d4433";
  ctx.fillRect(x - size * 0.05, groundY - size * 0.18, size * 0.1, size * 0.18);
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const w = size * (0.55 - i * 0.13);
    const top = groundY - size * (0.45 + i * 0.28);
    const bottom = groundY - size * (0.12 + i * 0.28);
    ctx.beginPath();
    ctx.moveTo(x - w, bottom);
    ctx.lineTo(x, top);
    ctx.lineTo(x + w, bottom);
    ctx.closePath();
    ctx.fill();
    if (snowy) {
      ctx.fillStyle = "rgba(240, 246, 252, 0.85)";
      ctx.beginPath();
      ctx.moveTo(x - w * 0.55, bottom - (bottom - top) * 0.35);
      ctx.lineTo(x, top);
      ctx.lineTo(x + w * 0.55, bottom - (bottom - top) * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
    }
  }
}

function roundTree(ctx, x, groundY, size, leaf) {
  ctx.fillStyle = "#6b4a33";
  ctx.fillRect(x - size * 0.06, groundY - size * 0.5, size * 0.12, size * 0.5);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, groundY - size * 0.72, size * 0.34, 0, Math.PI * 2);
  ctx.arc(x - size * 0.22, groundY - size * 0.55, size * 0.26, 0, Math.PI * 2);
  ctx.arc(x + size * 0.22, groundY - size * 0.55, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
}

function palm(ctx, x, groundY, size, lean) {
  ctx.strokeStyle = "#8a6242";
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.quadraticCurveTo(x + lean * size * 0.3, groundY - size * 0.6, x + lean * size * 0.5, groundY - size);
  ctx.stroke();
  const tx = x + lean * size * 0.5;
  const ty = groundY - size;
  ctx.strokeStyle = "#3d8b4f";
  ctx.lineWidth = size * 0.05;
  for (let a = 0; a < 6; a++) {
    const ang = -Math.PI * 0.15 - (a / 5) * Math.PI * 0.7;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(ang) * size * 0.35,
      ty + Math.sin(ang) * size * 0.2,
      tx + Math.cos(ang) * size * 0.55,
      ty + Math.sin(ang) * size * 0.45 + size * 0.1
    );
    ctx.stroke();
  }
}

function cloud(ctx, x, y, s, alpha = 0.9) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.arc(x + s * 0.9, y + s * 0.15, s * 0.75, 0, Math.PI * 2);
  ctx.arc(x - s * 0.9, y + s * 0.2, s * 0.65, 0, Math.PI * 2);
  ctx.fill();
}

function sun(ctx, x, y, r, color = "#ffdf7e") {
  const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.4);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255, 223, 126, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

const SCENES = [
  {
    id: "lakeside",
    name: "Lakeside",
    emoji: "🏞️",
    ground: 0.63,
    water: 0.68,
    houseScale: 0.72,
    draw(ctx, w, h) {
      const waterY = this.water * h;
      const bankY = this.ground * h;

      ctx.fillStyle = vGrad(ctx, 0, waterY, [
        [0, "#79c4e4"],
        [0.7, "#cdeaf2"],
        [1, "#f4ecd4"],
      ]);
      ctx.fillRect(0, 0, w, waterY);

      sun(ctx, w * 0.8, h * 0.16, 30);
      cloud(ctx, w * 0.2, h * 0.14, 26, 0.85);
      cloud(ctx, w * 0.55, h * 0.09, 20, 0.7);

      // Far hills
      ctx.fillStyle = "#9dbf95";
      ctx.beginPath();
      ctx.moveTo(0, waterY);
      ctx.quadraticCurveTo(w * 0.22, h * 0.38, w * 0.5, waterY);
      ctx.fill();
      ctx.fillStyle = "#87b07e";
      ctx.beginPath();
      ctx.moveTo(w * 0.4, waterY);
      ctx.quadraticCurveTo(w * 0.75, h * 0.34, w, waterY);
      ctx.lineTo(w, waterY);
      ctx.fill();

      // Grass bank
      ctx.fillStyle = vGrad(ctx, h * 0.5, waterY, [
        [0, "#7fae62"],
        [1, "#5f9448"],
      ]);
      ctx.fillRect(0, h * 0.52, w, waterY - h * 0.52);

      // Shoreline trees
      pine(ctx, w * 0.07, bankY + 8, 120, "#3c7048");
      pine(ctx, w * 0.14, bankY + 10, 90, "#468055");
      pine(ctx, w * 0.9, bankY + 8, 130, "#3c7048");
      roundTree(ctx, w * 0.82, bankY + 8, 110, "#5f9c53");

      // Lake
      ctx.fillStyle = vGrad(ctx, waterY, h, [
        [0, "#8ec7de"],
        [1, "#4a86ad"],
      ]);
      ctx.fillRect(0, waterY, w, h - waterY);

      // Shimmer
      const rnd = seeded(7);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) {
        const y = waterY + 12 + rnd() * (h - waterY - 20);
        const x = rnd() * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 24 + rnd() * 50, y);
        ctx.stroke();
      }

      // Small dock
      ctx.fillStyle = "#8a6a4a";
      ctx.fillRect(w * 0.68, waterY - 4, 110, 8);
      ctx.fillRect(w * 0.7, waterY + 2, 6, 26);
      ctx.fillRect(w * 0.77, waterY + 2, 6, 30);
    },
  },
  {
    id: "mountains",
    name: "Mountains",
    emoji: "🏔️",
    ground: 0.8,
    houseScale: 0.72,
    draw(ctx, w, h) {
      const gy = this.ground * h;
      ctx.fillStyle = vGrad(ctx, 0, gy, [
        [0, "#7db9de"],
        [1, "#e9f4f7"],
      ]);
      ctx.fillRect(0, 0, w, gy);

      cloud(ctx, w * 0.75, h * 0.12, 24);
      cloud(ctx, w * 0.3, h * 0.08, 20, 0.75);

      const peak = (x0, xp, x1, top, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x0, gy);
        ctx.lineTo(xp, top);
        ctx.lineTo(x1, gy);
        ctx.closePath();
        ctx.fill();
        // Snow cap
        const t = 0.3;
        ctx.fillStyle = "#f4f8fb";
        ctx.beginPath();
        ctx.moveTo(xp + (x0 - xp) * t, top + (gy - top) * t);
        ctx.lineTo(xp, top);
        ctx.lineTo(xp + (x1 - xp) * t, top + (gy - top) * t);
        ctx.quadraticCurveTo(xp, top + (gy - top) * (t + 0.12), xp + (x0 - xp) * t, top + (gy - top) * t);
        ctx.fill();
      };
      peak(-w * 0.15, w * 0.18, w * 0.55, h * 0.16, "#7d8fa8");
      peak(w * 0.3, w * 0.62, w * 1.0, h * 0.1, "#68809e");
      peak(w * 0.65, w * 0.92, w * 1.25, h * 0.22, "#8598b0");

      // Tree line
      for (let i = 0; i < 14; i++) {
        pine(ctx, (i / 13) * w, gy + 4, 46 + (i % 3) * 12, i % 2 ? "#33684a" : "#2c5c41");
      }

      // Meadow
      ctx.fillStyle = vGrad(ctx, gy, h, [
        [0, "#79aa58"],
        [1, "#55873c"],
      ]);
      ctx.fillRect(0, gy, w, h - gy);

      const rnd = seeded(21);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = ["#f3f0ce", "#e88fb1", "#f5c04e"][i % 3];
        ctx.beginPath();
        ctx.arc(rnd() * w, gy + 14 + rnd() * (h - gy - 22), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌲",
    ground: 0.82,
    houseScale: 0.7,
    draw(ctx, w, h) {
      const gy = this.ground * h;
      ctx.fillStyle = vGrad(ctx, 0, gy, [
        [0, "#b7d9a4"],
        [1, "#e4eecb"],
      ]);
      ctx.fillRect(0, 0, w, gy);

      // Back canopy
      const rnd = seeded(33);
      ctx.fillStyle = "#5d8f57";
      for (let i = 0; i < 12; i++) {
        const x = (i / 11) * w;
        ctx.beginPath();
        ctx.arc(x, h * 0.22 + rnd() * h * 0.08, 70 + rnd() * 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mid trees
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (w / 9);
        if (x > w * 0.25 && x < w * 0.75) continue; // clearing for the house
        roundTree(ctx, x, gy + 6, 190 + (i % 3) * 40, i % 2 ? "#4d8047" : "#446f3e");
      }
      pine(ctx, w * 0.2, gy + 8, 150, "#38663f");
      pine(ctx, w * 0.86, gy + 8, 170, "#315c39");

      // Ground
      ctx.fillStyle = vGrad(ctx, gy, h, [
        [0, "#6f9a4e"],
        [1, "#4c7038"],
      ]);
      ctx.fillRect(0, gy, w, h - gy);

      // Path
      ctx.fillStyle = "#c8b48a";
      ctx.beginPath();
      ctx.moveTo(w * 0.47, gy);
      ctx.quadraticCurveTo(w * 0.42, h * 0.92, w * 0.3, h);
      ctx.lineTo(w * 0.5, h);
      ctx.quadraticCurveTo(w * 0.53, h * 0.9, w * 0.53, gy);
      ctx.closePath();
      ctx.fill();

      // Bushes
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "#578a44" : "#4a7c3c";
        ctx.beginPath();
        ctx.arc(rnd() * w, gy + 10 + rnd() * 14, 12 + rnd() * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: "beach",
    name: "Beach",
    emoji: "🏖️",
    ground: 0.84,
    houseScale: 0.7,
    draw(ctx, w, h) {
      const gy = this.ground * h;
      const seaTop = h * 0.5;
      const sandTop = h * 0.68;

      ctx.fillStyle = vGrad(ctx, 0, seaTop, [
        [0, "#6cc4ee"],
        [1, "#d8f1fb"],
      ]);
      ctx.fillRect(0, 0, w, seaTop);
      sun(ctx, w * 0.18, h * 0.14, 32, "#ffe9a0");
      cloud(ctx, w * 0.6, h * 0.1, 22, 0.8);

      // Sea
      ctx.fillStyle = vGrad(ctx, seaTop, sandTop, [
        [0, "#2f8fc4"],
        [1, "#5cb6d9"],
      ]);
      ctx.fillRect(0, seaTop, w, sandTop - seaTop);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      const rnd = seeded(11);
      for (let i = 0; i < 12; i++) {
        const y = seaTop + 8 + rnd() * (sandTop - seaTop - 14);
        const x = rnd() * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 20, y - 3, x + 46, y);
        ctx.stroke();
      }

      // Sand with a soft foam edge
      ctx.fillStyle = "#fdf6de";
      ctx.beginPath();
      ctx.moveTo(0, sandTop + 14);
      ctx.quadraticCurveTo(w * 0.5, sandTop - 16, w, sandTop + 10);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = vGrad(ctx, sandTop, h, [
        [0, "rgba(238, 210, 150, 0)"],
        [1, "rgba(228, 195, 130, 0.55)"],
      ]);
      ctx.fillRect(0, sandTop, w, h - sandTop);

      palm(ctx, w * 0.08, gy + 10, 150, 1);
      palm(ctx, w * 0.94, gy + 6, 170, -1);

      // Beach umbrella
      const ux = w * 0.8;
      ctx.strokeStyle = "#9a7a55";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ux, gy + 26);
      ctx.lineTo(ux + 8, gy - 34);
      ctx.stroke();
      ctx.fillStyle = "#e5605c";
      ctx.beginPath();
      ctx.arc(ux + 8, gy - 34, 38, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f6f2e8";
      ctx.beginPath();
      ctx.moveTo(ux - 30, gy - 34);
      ctx.lineTo(ux - 10, gy - 34);
      ctx.lineTo(ux + 8, gy - 72);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "city",
    name: "City",
    emoji: "🌆",
    ground: 0.8,
    night: true,
    houseScale: 0.7,
    draw(ctx, w, h) {
      const gy = this.ground * h;
      ctx.fillStyle = vGrad(ctx, 0, gy, [
        [0, "#232a52"],
        [0.55, "#5c4670"],
        [1, "#e08a5e"],
      ]);
      ctx.fillRect(0, 0, w, gy);

      // Skyline, two depths
      const rnd = seeded(55);
      const skyline = (baseY, minH, maxH, color, litChance) => {
        let x = -20;
        while (x < w) {
          const bw = 40 + rnd() * 70;
          const bh = minH + rnd() * (maxH - minH);
          ctx.fillStyle = color;
          ctx.fillRect(x, baseY - bh, bw, bh);
          ctx.fillStyle = "rgba(255, 214, 120, 0.85)";
          for (let wx = x + 7; wx < x + bw - 8; wx += 13) {
            for (let wy = baseY - bh + 9; wy < baseY - 10; wy += 16) {
              if (rnd() < litChance) ctx.fillRect(wx, wy, 5, 7);
            }
          }
          x += bw + 8 + rnd() * 16;
        }
      };
      skyline(gy, h * 0.22, h * 0.5, "#1b2140", 0.35);
      skyline(gy, h * 0.1, h * 0.24, "#141833", 0.5);

      // Street
      ctx.fillStyle = "#43454f";
      ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = "#5a5d68";
      ctx.fillRect(0, gy, w, 14); // sidewalk curb
      ctx.strokeStyle = "#d9c76a";
      ctx.lineWidth = 4;
      ctx.setLineDash([28, 22]);
      ctx.beginPath();
      ctx.moveTo(0, gy + (h - gy) * 0.6);
      ctx.lineTo(w, gy + (h - gy) * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);

      // Street lamps
      for (const lx of [w * 0.12, w * 0.88]) {
        ctx.strokeStyle = "#20242e";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(lx, gy + 12);
        ctx.lineTo(lx, gy - 90);
        ctx.stroke();
        const g = ctx.createRadialGradient(lx, gy - 96, 2, lx, gy - 96, 34);
        g.addColorStop(0, "rgba(255, 226, 150, 0.95)");
        g.addColorStop(1, "rgba(255, 226, 150, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, gy - 96, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe9b0";
        ctx.beginPath();
        ctx.arc(lx, gy - 96, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: "winter",
    name: "Snowy Night",
    emoji: "❄️",
    ground: 0.82,
    night: true,
    houseScale: 0.72,
    draw(ctx, w, h) {
      const gy = this.ground * h;
      ctx.fillStyle = vGrad(ctx, 0, gy, [
        [0, "#0d1733"],
        [1, "#2c3f68"],
      ]);
      ctx.fillRect(0, 0, w, gy);

      const rnd = seeded(99);
      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 70; i++) {
        ctx.globalAlpha = 0.3 + rnd() * 0.7;
        ctx.fillRect(rnd() * w, rnd() * gy * 0.75, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Moon
      const mg = ctx.createRadialGradient(w * 0.82, h * 0.15, 8, w * 0.82, h * 0.15, 70);
      mg.addColorStop(0, "rgba(235, 240, 255, 0.9)");
      mg.addColorStop(1, "rgba(235, 240, 255, 0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.15, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eef2fb";
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.15, 26, 0, Math.PI * 2);
      ctx.fill();

      // Snow hills
      ctx.fillStyle = "#b9c8de";
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.quadraticCurveTo(w * 0.25, h * 0.6, w * 0.55, gy);
      ctx.quadraticCurveTo(w * 0.8, h * 0.64, w, gy);
      ctx.lineTo(w, gy);
      ctx.fill();

      pine(ctx, w * 0.08, gy + 6, 130, "#1e3c33", true);
      pine(ctx, w * 0.16, gy + 8, 90, "#24463b", true);
      pine(ctx, w * 0.9, gy + 6, 140, "#1e3c33", true);

      // Snow ground
      ctx.fillStyle = vGrad(ctx, gy, h, [
        [0, "#e8eef8"],
        [1, "#c3d0e4"],
      ]);
      ctx.fillRect(0, gy, w, h - gy);

      // Falling snow
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.arc(rnd() * w, rnd() * h, 1.4 + rnd() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
];
