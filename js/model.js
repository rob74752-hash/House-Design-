/*
 * Data model, persistence, and the starter home template.
 *
 * Floor-plan geometry uses FEET. Rooms are rectangles, interior walls are
 * axis-aligned segments, openings (doors/windows) sit centered on a wall
 * line, and furniture is placed by its center point with 90° rotations.
 */

const STORAGE_KEY = "homeDesignStudio.v2";
const WALL_FT = 0.5; // wall thickness

let _uid = 1;
function uid() {
  return _uid++;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function snapHalf(v) {
  return Math.round(v * 2) / 2;
}

/* Lighten (amt > 0) or darken (amt < 0) a #rrggbb / rgb() color. */
function shade(color, amt) {
  let r, g, b;
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    r = n >> 16;
    g = (n >> 8) & 0xff;
    b = n & 0xff;
  } else {
    [r, g, b] = color.match(/\d+/g).map(Number);
  }
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function defaultExterior() {
  return {
    stories: 2,
    width: 340,
    roof: "gable",
    material: "siding",
    shutters: true,
    wallColor: "#e8e2d2",
    roofColor: "#5c5650",
    trimColor: "#faf8f2",
    doorColor: "#48505e",
    garage: false,
    porch: true,
    chimney: true,
    door: { x: 0, style: "panel" },
    windows: [],
  };
}

function emptyFloor(name) {
  return { name, rooms: [], walls: [], openings: [], furniture: [] };
}

function newState() {
  const ext = defaultExterior();
  ext.windows = generateFacadeWindows(ext);
  return {
    name: "",
    activeFloor: 0,
    floors: [emptyFloor("Ground floor")],
    exterior: ext,
    sceneId: "lakeside",
    scenePos: {},
  };
}

/* Evenly spaced facade windows for the exterior elevation view. */
function generateFacadeWindows(ext) {
  const wins = [];
  const ww = 46;
  const wh = 58;
  const perStory = Math.max(2, Math.floor(ext.width / 115));
  for (let s = 0; s < ext.stories; s++) {
    const isGround = s === ext.stories - 1;
    const y = s * STORY_H + 26;
    for (let i = 0; i < perStory; i++) {
      const x = -ext.width / 2 + ((i + 0.5) * ext.width) / perStory;
      if (isGround && Math.abs(x - ext.door.x) < 80) continue;
      wins.push({ x, y, w: ww, h: wh });
    }
  }
  return wins;
}

/* ---------- Starter home: a furnished 2-story, ~1,600 sq ft plan ---------- */

function starterHome() {
  const st = newState();
  const R = (x, y, w, h, label) => ({ id: uid(), x, y, w, h, label });
  const D = (x, y, horiz, w = 3) => ({ id: uid(), type: "door", x, y, horiz, w });
  const W = (x, y, horiz, w = 4.5) => ({ id: uid(), type: "window", x, y, horiz, w });
  const F = (kind, x, y, rot = 0) => ({ id: uid(), kind, x, y, rot });

  const g = emptyFloor("Ground floor");
  g.rooms = [
    R(4, 4, 16, 13, "Living Room"),
    R(20, 4, 12, 13, "Kitchen"),
    R(32, 4, 11, 13, "Dining"),
    R(4, 17, 9, 9, "Entry Hall"),
    R(13, 17, 8, 9, "Bathroom"),
    R(21, 17, 10, 9, "Study"),
    R(31, 17, 12, 9, "Laundry"),
  ];
  g.openings = [
    // Exterior door + windows
    D(8.5, 26, true, 3.5),
    W(9, 4, true), W(15, 4, true), W(24, 4, true), W(29, 4, true),
    W(35, 4, true), W(40, 4, true),
    W(4, 9, false), W(4, 21, false), W(43, 9, false), W(43, 21, false),
    W(17, 26, true), W(26, 26, true), W(37, 26, true),
    // Interior doors
    D(20, 10, false), D(32, 10, false),
    D(10.5, 17, true), D(13, 21, false), D(26, 17, true), D(37, 17, true),
  ];
  g.furniture = [
    F("sofa", 11.5, 6.2), F("armchair", 17.2, 10.5, 270), F("coffee", 11.5, 10.3),
    F("rug", 11.5, 10.5), F("tv", 11.5, 15.8, 180), F("plant", 5.3, 15.5),
    F("bookshelf", 5, 8.5, 90),
    F("fridge", 21.6, 5.3), F("counter", 24.8, 5), F("stove", 27.6, 5),
    F("sink", 30, 5), F("island", 26, 11),
    F("dining6", 37.5, 10.5),
    F("stairs", 6.2, 21.5), F("plant", 11.8, 24.8),
    F("toilet", 14.4, 19.4, 90), F("vanity", 18.8, 18.4), F("tub", 17, 24.6, 0),
    F("desk", 26, 18.8), F("bookshelf", 22.2, 22, 90), F("plant", 29.5, 24.5),
    F("washer", 32.6, 18.6), F("washer", 35.4, 18.6), F("counter", 40, 18.6),
  ];

  const u = emptyFloor("Upper floor");
  u.rooms = [
    R(4, 4, 16, 13, "Primary Bedroom"),
    R(20, 4, 11, 13, "Bedroom 2"),
    R(31, 4, 12, 7, "Bathroom"),
    R(31, 11, 12, 6, "Closet"),
    R(4, 17, 12, 9, "Landing"),
    R(16, 17, 13, 9, "Bedroom 3"),
    R(29, 17, 14, 9, "Office"),
  ];
  u.openings = [
    W(9, 4, true), W(15, 4, true), W(25.5, 4, true), W(35, 4, true), W(40, 4, true),
    W(4, 9, false), W(4, 21, false), W(43, 7, false), W(43, 21, false),
    W(9, 26, true), W(22, 26, true), W(35, 26, true),
    D(10, 17, true), D(24, 17, true), D(33.5, 17, true),
    D(31, 7.5, false), D(31, 13.5, false), D(16, 21, false),
  ];
  u.furniture = [
    F("bedQ", 12, 8.2), F("nightstand", 8.6, 5.3), F("nightstand", 15.4, 5.3),
    F("wardrobe", 5.2, 11, 90), F("dresser", 18.9, 11.5, 90), F("rug", 12, 11, 90),
    F("bedS", 23, 7.6), F("nightstand", 20.9, 5), F("desk", 27, 15.6, 180),
    F("wardrobe", 29.9, 8.5, 90),
    F("tub", 34.2, 5.4), F("toilet", 41.4, 5.6, 270), F("vanity", 38, 9.8, 180),
    F("wardrobe", 34.2, 12.2), F("wardrobe", 39.6, 12.2),
    F("stairs", 6.2, 21.5), F("plant", 14.5, 24.8),
    F("bedS", 19, 20.6, 90), F("wardrobe", 26.8, 25, 180),
    F("desk", 33, 18.8), F("chair", 33, 21.3), F("bookshelf", 41.8, 21, 90),
    F("plant", 30.2, 24.7),
  ];

  st.floors = [g, u];
  return st;
}

/* ---------- Persistence ---------- */

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode etc. — designs just won't persist */
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.floors) || !data.exterior) return null;
    // Re-seed the id counter above anything stored
    for (const f of data.floors) {
      for (const list of [f.rooms, f.walls, f.openings, f.furniture]) {
        for (const it of list || []) _uid = Math.max(_uid, (it.id || 0) + 1);
      }
      f.rooms ||= [];
      f.walls ||= [];
      f.openings ||= [];
      f.furniture ||= [];
    }
    return { ...newState(), ...data };
  } catch {
    return null;
  }
}
