/*
 * Furniture catalog with top-down (plan view) renderers, drawn the way
 * furniture appears on real architectural floor plans.
 *
 * Each item's draw(ctx, W, D) receives its footprint in PIXELS with the
 * origin at the top-left corner; rotation is applied by the caller.
 * Footprint sizes (w, d) are in feet. rot 0 = "back" toward -y.
 */

const FUR_OUT = "#4c463f"; // outline
const FUR_WOOD = "#dcbf94";
const FUR_WOOD_DK = "#c3a273";
const FUR_FABRIC = "#b9c4cf";
const FUR_FABRIC_DK = "#98a6b4";
const FUR_WHITE = "#fbfbf8";
const FUR_METAL = "#d7d9d6";

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fs(ctx, fill) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = FUR_OUT;
  ctx.stroke();
}

const FURNITURE = [
  // ---------- Living ----------
  {
    kind: "sofa", name: "Sofa", cat: "Living", w: 7, d: 3,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, D * 0.18); fs(ctx, FUR_FABRIC);
      rr(ctx, W * 0.09, D * 0.3, W * 0.82, D * 0.62, D * 0.12); fs(ctx, shade(FUR_FABRIC, 12));
      ctx.beginPath();
      ctx.moveTo(W * 0.36, D * 0.3); ctx.lineTo(W * 0.36, D * 0.92);
      ctx.moveTo(W * 0.64, D * 0.3); ctx.lineTo(W * 0.64, D * 0.92);
      ctx.stroke();
    },
  },
  {
    kind: "armchair", name: "Armchair", cat: "Living", w: 3, d: 3,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, D * 0.2); fs(ctx, FUR_FABRIC);
      rr(ctx, W * 0.18, D * 0.3, W * 0.64, D * 0.6, D * 0.12); fs(ctx, shade(FUR_FABRIC, 12));
    },
  },
  {
    kind: "coffee", name: "Coffee table", cat: "Living", w: 4, d: 2,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, 4); fs(ctx, FUR_WOOD);
      rr(ctx, W * 0.1, D * 0.16, W * 0.8, D * 0.68, 3);
      ctx.strokeStyle = FUR_WOOD_DK; ctx.stroke();
    },
  },
  {
    kind: "rug", name: "Rug 8×10", cat: "Living", w: 8, d: 10,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, 3);
      ctx.fillStyle = "rgba(196, 178, 158, 0.5)"; ctx.fill();
      ctx.strokeStyle = "rgba(140, 122, 100, 0.8)"; ctx.stroke();
      rr(ctx, W * 0.08, D * 0.06, W * 0.84, D * 0.88, 2); ctx.stroke();
    },
  },
  {
    kind: "tv", name: "TV console", cat: "Living", w: 6, d: 1.5,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, D * 0.35, W, D * 0.65); fs(ctx, FUR_WOOD);
      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(W * 0.14, 0, W * 0.72, D * 0.3);
    },
  },
  {
    kind: "bookshelf", name: "Bookshelf", cat: "Living", w: 5, d: 1.25,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WOOD);
      ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo((W * i) / 4, 0); ctx.lineTo((W * i) / 4, D); }
      ctx.stroke();
    },
  },
  {
    kind: "plant", name: "Plant", cat: "Living", w: 1.5, d: 1.5,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.arc(W / 2, D / 2, W * 0.46, 0, Math.PI * 2); fs(ctx, "#cf9469");
      ctx.fillStyle = "#5e8f57";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(W / 2 + Math.cos(a) * W * 0.2, D / 2 + Math.sin(a) * D * 0.2,
          W * 0.22, W * 0.1, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(W / 2, D / 2, W * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "#47703f"; ctx.fill();
    },
  },

  // ---------- Kitchen & Dining ----------
  {
    kind: "counter", name: "Counter", cat: "Kitchen", w: 5, d: 2,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_METAL);
      ctx.strokeStyle = shade(FUR_METAL, -40);
      ctx.strokeRect(1.5, 1.5, W - 3, D - 3);
    },
  },
  {
    kind: "island", name: "Island", cat: "Kitchen", w: 6, d: 3,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, 4); fs(ctx, FUR_METAL);
      rr(ctx, 3, 3, W - 6, D - 6, 3);
      ctx.strokeStyle = shade(FUR_METAL, -40); ctx.stroke();
    },
  },
  {
    kind: "sink", name: "Sink unit", cat: "Kitchen", w: 3, d: 2,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_METAL);
      rr(ctx, W * 0.1, D * 0.2, W * 0.36, D * 0.6, 2); fs(ctx, FUR_WHITE);
      rr(ctx, W * 0.54, D * 0.2, W * 0.36, D * 0.6, 2); fs(ctx, FUR_WHITE);
      ctx.beginPath(); ctx.arc(W / 2, D * 0.16, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = FUR_OUT; ctx.fill();
    },
  },
  {
    kind: "stove", name: "Stove", cat: "Kitchen", w: 2.5, d: 2,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WHITE);
      for (const [fx, fy] of [[0.28, 0.3], [0.72, 0.3], [0.28, 0.72], [0.72, 0.72]]) {
        ctx.beginPath(); ctx.arc(W * fx, D * fy, W * 0.14, 0, Math.PI * 2);
        ctx.strokeStyle = FUR_OUT; ctx.stroke();
      }
    },
  },
  {
    kind: "fridge", name: "Fridge", cat: "Kitchen", w: 3, d: 2.5,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, 2); fs(ctx, FUR_WHITE);
      ctx.beginPath(); ctx.moveTo(W * 0.42, 0); ctx.lineTo(W * 0.42, D); ctx.stroke();
      ctx.fillStyle = FUR_OUT;
      ctx.fillRect(W * 0.34, D * 0.15, 2, D * 0.3);
      ctx.fillRect(W * 0.48, D * 0.15, 2, D * 0.3);
    },
  },
  {
    kind: "dining6", name: "Dining (6)", cat: "Kitchen", w: 7, d: 4.5,
    draw(ctx, W, D) {
      const chair = (x, y) => { rr(ctx, x - W * 0.055, y - D * 0.09, W * 0.11, D * 0.18, 2); fs(ctx, FUR_FABRIC_DK); };
      chair(W * 0.25, D * 0.06); chair(W * 0.55, D * 0.06); chair(W * 0.85, D * 0.06);
      chair(W * 0.25, D * 0.94); chair(W * 0.55, D * 0.94); chair(W * 0.85, D * 0.94);
      rr(ctx, W * 0.08, D * 0.16, W * 0.84, D * 0.68, 3); fs(ctx, FUR_WOOD);
    },
  },
  {
    kind: "roundTable", name: "Round table", cat: "Kitchen", w: 4, d: 4,
    draw(ctx, W, D) {
      const chair = (a) => {
        const x = W / 2 + Math.cos(a) * W * 0.42, y = D / 2 + Math.sin(a) * D * 0.42;
        ctx.beginPath(); ctx.arc(x, y, W * 0.1, 0, Math.PI * 2); fs(ctx, FUR_FABRIC_DK);
      };
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(chair);
      ctx.beginPath(); ctx.arc(W / 2, D / 2, W * 0.32, 0, Math.PI * 2); fs(ctx, FUR_WOOD);
    },
  },

  // ---------- Bedroom ----------
  {
    kind: "bedQ", name: "Queen bed", cat: "Bedroom", w: 5, d: 6.75,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WOOD_DK);
      rr(ctx, W * 0.04, D * 0.04, W * 0.92, D * 0.93, 3); fs(ctx, FUR_WHITE);
      rr(ctx, W * 0.1, D * 0.07, W * 0.36, D * 0.16, 3); fs(ctx, "#eef0ee");
      rr(ctx, W * 0.54, D * 0.07, W * 0.36, D * 0.16, 3); fs(ctx, "#eef0ee");
      rr(ctx, W * 0.04, D * 0.32, W * 0.92, D * 0.65, 3); fs(ctx, "#c9d4dd");
      ctx.beginPath(); ctx.moveTo(W * 0.04, D * 0.42); ctx.lineTo(W * 0.96, D * 0.42); ctx.stroke();
    },
  },
  {
    kind: "bedS", name: "Single bed", cat: "Bedroom", w: 3.25, d: 6.5,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WOOD_DK);
      rr(ctx, W * 0.06, D * 0.04, W * 0.88, D * 0.93, 3); fs(ctx, FUR_WHITE);
      rr(ctx, W * 0.2, D * 0.07, W * 0.6, D * 0.15, 3); fs(ctx, "#eef0ee");
      rr(ctx, W * 0.06, D * 0.32, W * 0.88, D * 0.65, 3); fs(ctx, "#d4ccbe");
      ctx.beginPath(); ctx.moveTo(W * 0.06, D * 0.42); ctx.lineTo(W * 0.94, D * 0.42); ctx.stroke();
    },
  },
  {
    kind: "nightstand", name: "Nightstand", cat: "Bedroom", w: 1.5, d: 1.5,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WOOD);
      ctx.beginPath(); ctx.arc(W / 2, D / 2, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = FUR_OUT; ctx.fill();
    },
  },
  {
    kind: "wardrobe", name: "Wardrobe", cat: "Bedroom", w: 6, d: 2,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WOOD);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, D);
      for (let i = 1; i < 8; i++) { ctx.moveTo((W * i) / 8, D * 0.15); ctx.lineTo((W * i) / 8 + W * 0.04, D * 0.85); }
      ctx.stroke();
    },
  },
  {
    kind: "dresser", name: "Dresser", cat: "Bedroom", w: 5, d: 1.5,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WOOD);
      ctx.beginPath();
      ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, D);
      ctx.moveTo((2 * W) / 3, 0); ctx.lineTo((2 * W) / 3, D);
      ctx.stroke();
    },
  },

  // ---------- Bathroom ----------
  {
    kind: "toilet", name: "Toilet", cat: "Bathroom", w: 1.75, d: 2.5,
    draw(ctx, W, D) {
      rr(ctx, W * 0.06, 0, W * 0.88, D * 0.34, 2); fs(ctx, FUR_WHITE);
      ctx.beginPath();
      ctx.ellipse(W / 2, D * 0.64, W * 0.36, D * 0.32, 0, 0, Math.PI * 2);
      fs(ctx, FUR_WHITE);
    },
  },
  {
    kind: "tub", name: "Bathtub", cat: "Bathroom", w: 5.5, d: 2.5,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, 4); fs(ctx, FUR_WHITE);
      rr(ctx, W * 0.07, D * 0.14, W * 0.86, D * 0.72, D * 0.3); fs(ctx, "#eef2f2");
      ctx.beginPath(); ctx.arc(W * 0.14, D / 2, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = FUR_OUT; ctx.fill();
    },
  },
  {
    kind: "shower", name: "Shower", cat: "Bathroom", w: 3, d: 3,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WHITE);
      ctx.beginPath(); ctx.moveTo(0, D); ctx.lineTo(W, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(W * 0.22, D * 0.22, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = FUR_OUT; ctx.fill();
    },
  },
  {
    kind: "vanity", name: "Vanity sink", cat: "Bathroom", w: 3, d: 1.75,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_METAL);
      ctx.beginPath(); ctx.ellipse(W / 2, D * 0.55, W * 0.24, D * 0.28, 0, 0, Math.PI * 2);
      fs(ctx, FUR_WHITE);
      ctx.beginPath(); ctx.arc(W / 2, D * 0.18, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = FUR_OUT; ctx.fill();
    },
  },

  // ---------- Utility ----------
  {
    kind: "desk", name: "Desk + chair", cat: "Utility", w: 4.5, d: 2,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D * 0.62); fs(ctx, FUR_WOOD);
      rr(ctx, W * 0.38, D * 0.6, W * 0.24, D * 0.4, 3); fs(ctx, FUR_FABRIC_DK);
    },
  },
  {
    kind: "chair", name: "Chair", cat: "Utility", w: 1.5, d: 1.5,
    draw(ctx, W, D) {
      rr(ctx, 0, 0, W, D, 3); fs(ctx, FUR_FABRIC_DK);
      ctx.beginPath(); ctx.rect(W * 0.1, 0, W * 0.8, D * 0.2); fs(ctx, FUR_FABRIC);
    },
  },
  {
    kind: "washer", name: "Washer", cat: "Utility", w: 2.25, d: 2.25,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, FUR_WHITE);
      ctx.beginPath(); ctx.arc(W / 2, D * 0.56, W * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, D * 0.18); ctx.lineTo(W, D * 0.18); ctx.stroke();
    },
  },
  {
    kind: "stairs", name: "Stairs", cat: "Utility", w: 3.5, d: 8,
    draw(ctx, W, D) {
      ctx.beginPath(); ctx.rect(0, 0, W, D); fs(ctx, "#efe9dc");
      ctx.beginPath();
      const treads = 10;
      for (let i = 1; i < treads; i++) { ctx.moveTo(0, (D * i) / treads); ctx.lineTo(W, (D * i) / treads); }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W / 2, D * 0.92); ctx.lineTo(W / 2, D * 0.1);
      ctx.moveTo(W / 2 - 4, D * 0.18); ctx.lineTo(W / 2, D * 0.06);
      ctx.lineTo(W / 2 + 4, D * 0.18);
      ctx.strokeStyle = "#8a8378"; ctx.stroke();
    },
  },
];

const FURNITURE_BY_KIND = Object.fromEntries(FURNITURE.map((f) => [f.kind, f]));
const FURNITURE_CATS = ["Living", "Kitchen", "Bedroom", "Bathroom", "Utility"];

/* Footprint in feet after rotation. */
function furFootprint(item) {
  const def = FURNITURE_BY_KIND[item.kind];
  const rotated = item.rot === 90 || item.rot === 270;
  return { w: rotated ? def.d : def.w, d: rotated ? def.w : def.d };
}

/* Draw one placed furniture item; scale = px per ft. */
function drawFurnitureItem(ctx, item, scale) {
  const def = FURNITURE_BY_KIND[item.kind];
  if (!def) return;
  ctx.save();
  ctx.translate(item.x * scale, item.y * scale);
  ctx.rotate((item.rot * Math.PI) / 180);
  ctx.translate((-def.w / 2) * scale, (-def.d / 2) * scale);
  ctx.lineWidth = Math.max(1, scale * 0.06);
  ctx.lineJoin = "round";
  def.draw(ctx, def.w * scale, def.d * scale);
  ctx.restore();
}
