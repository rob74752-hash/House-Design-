# 🏠 Home Design Studio

Design your own home in the browser, then place it in different locations —
by a lake, up in the mountains, on the beach, deep in a forest, on a city
street at dusk, or under a snowy night sky.

No build step, no dependencies — plain HTML, CSS, and JavaScript on a canvas.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

then visit the printed URL.

## Design mode 🎨

- **Structure** — 1 or 2 stories, adjustable width, and gable / hip / flat roofs.
- **Colors** — pick wall, roof, trim, and door colors, or apply a preset palette
  (Classic, Coastal, Modern, Meadow).
- **Features** — toggle a garage, porch, and chimney.
- **Windows & door** — add windows and drag them anywhere on the facade; drag
  the door along the ground floor; double-click the door to make it arched;
  select a window and press Delete to remove it.
- **Randomize** — roll a whole new house when you want inspiration.

## Locations mode 🌍

Pick a scene and drag to place your home in it:

| Scene | Details |
| --- | --- |
| 🏞️ Lakeside | Your home reflects in the water |
| 🏔️ Mountains | Snow-capped peaks and a wildflower meadow |
| 🌲 Forest | A clearing in the pines with a footpath |
| 🏖️ Beach | Palms, surf, and a beach umbrella |
| 🌆 City | Dusk skyline — your windows glow warm |
| ❄️ Snowy Night | Moonlight, falling snow, and lit windows |

## Extras

- Designs auto-save to your browser (localStorage), so your home is still
  there when you come back.
- Name your home — the name appears on a plaque in location views.
- **⬇ PNG** downloads a snapshot of the current view.
