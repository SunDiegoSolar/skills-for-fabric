# Splash Canvas

Local mapping studio for the Splash graph: **click a shape, drop media, place it on a surface**. No account. No API key.

It reads the same JSON / OBJ / Blender-export files Splash uses. How those files connect is in [ENGINE.md](./ENGINE.md).

This app does **not** copy Splash’s GPLv3 C++ engine.

## Run

```bash
cd apps/splash-canvas
./start.sh
```

Open http://127.0.0.1:8765

The studio starts on **The Matrix** — live green code rain on a screen shape. **M** or the Matrix button replays it. **Place** it on a dark wall.

## Motion ideas

Click **Ideas** (or `I`). There are 200+ motion-based mapping ideas: live generators (Matrix, kaleidoscope, fire, tide, Game of Life…), video/moving-art recipes, and Halloween riffs. **Use** loads a shape + look. Kaleido slices fold any photo or video like HeavyM/Resolume shaders. Details: [ARTIFACTS.md](./ARTIFACTS.md).

## How this feels next to MadMapper / HeavyM / Resolume

Those apps already have the imagination: 1,000+ generative effects, kaleidoscopes, clip decks, audio-reactive shaders, ISF materials, MIDI, lasers. Splash Canvas is the small local cousin — no license, no account — that maps a live look onto a house tonight. Matrix is the first world that actually moves on the surface; kaleido slices are the fold; dropped MP4/WebM is the rest of moving art.

## How to map (same idea as MadMapper / HeavyM)

1. Click a **shape** on the left (the studio opens on Screen + Matrix).
2. Click **Drop media** or drop a photo/video on the window — or keep the live look.
3. Open **Place** and drag the gold corners onto the real surface. White points warp the whole output.
4. **Present** for fullscreen.

Premade shapes: Quad, Screen 16:9, Triangle, Circle, Grid wall, Cube, Corner, Cylinder, Arch.

| Need | How |
|------|-----|
| Hide a face | Hide face, or paint a Mask |
| Omit black | Look → Omit black / Only black |
| Live look | Motion → Live look (Matrix, kaleidoscope, fire…) |
| Kaleidoscope | Motion → Kaleido slices + Spin, on any photo/video/live look |
| UV pan | Direction + speed on this face |
| Duplicate / delete | Duplicate, Delete, or keys `D` / Delete |
| Fill the projector | Fill output |
| Undo | Ctrl/Cmd+Z · Redo Shift+Z |
| Ideas | **Ideas** / `I` · **Matrix** / `M` · Use · Riff this · type a spark |

Keys: `1` Look · `2` Place · `3` Mask · `4` Present · `M` Matrix · `I` Ideas · `O` hide face · `Esc` hide chrome.

Drop `splash.json` + `*.obj` from Blender’s Splash addon or from `splash-master` if you already have a project.
