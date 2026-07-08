# 🏠 Home Design Studio

Mock up a real home in the browser: draw the floor plan room by room,
furnish every space, style the exterior with real materials, and then
see your home in different locations — by a lake, in the mountains, on
the beach, in a forest, on a city street, or under a snowy night sky.

No build step, no dependencies — plain HTML, CSS, and JavaScript on a canvas.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## 📐 Floor Plan mode

A real plan editor with measurements in feet:

- **Rooms** — drag to draw rooms with proper wall thickness; resize with
  corner handles, move them (furniture inside comes along), and double-tap
  to rename. Every room shows its dimensions and square footage, and the
  sidebar totals the whole home.
- **Walls, doors, windows** — draw interior partition walls; doors (with
  swing arcs) and windows snap onto any wall and slide along it.
- **Furniture** — a catalog of 25+ pieces across Living, Kitchen, Bedroom,
  Bathroom, and Utility: beds, sofas, dining sets, counters, island, stove,
  fridge, tub, shower, vanity, stairs, and more — all drawn like real
  architectural plan symbols. Tap to place, drag to move, rotate, duplicate.
- **Floors** — up to three floors, each with its own plan.
- **Zoom / pan / fit** — navigate large plans comfortably.

It opens with a furnished ~1,700 ft² two-story example home you can edit
or clear and start fresh.

## 🏡 Exterior mode

A detailed front elevation with pseudo-3D depth:

- Materials with real texture: lap siding, brick, stucco, board & batten
- 1–3 stories, adjustable width, gable / hip / flat roofs with shingles
- Divided-lite windows with trim, sills, and optional shutters — drag them
  anywhere on the facade
- Porch with columns, paneled or arched front door, wall lantern, garage
  with paneled roll-up door, brick chimney
- Color pickers plus five curated exterior styles (Farmhouse, Colonial,
  Brick, Coastal, Desert)

## 🌍 Locations mode

Drag your home into any of six scenes:

| Scene | Details |
| --- | --- |
| 🏞️ Lakeside | Your home reflects in the water |
| 🏔️ Mountains | Snow-capped peaks and a wildflower meadow |
| 🌲 Forest | A clearing in the pines with a footpath |
| 🏖️ Beach | Palms, surf, and a beach umbrella |
| 🌆 City | Dusk skyline — your windows glow warm |
| ❄️ Snowy Night | Moonlight, falling snow, and lit windows |

## Extras

- Everything auto-saves to your browser (localStorage)
- Name your home — it appears on a plaque in location views
- **⬇ PNG** downloads a snapshot of the current view
