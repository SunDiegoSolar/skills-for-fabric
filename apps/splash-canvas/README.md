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

## Halloween ideas

Click **Ideas** (or `I`). Twenty spooky mapping starters load a shape + look. **Riff this** or type a spark and **Riff from this** grows a new idea from an old one. Details: [ARTIFACTS.md](./ARTIFACTS.md).

## How to map (same idea as MadMapper / HeavyM)

1. Click a **shape** on the left (Quad is the usual start).
2. Click **Drop media** or drop a photo/video on the window.
3. Open **Place** and drag the gold corners onto the real surface. White points warp the whole output.
4. **Present** for fullscreen.

Premade shapes: Quad, Screen 16:9, Triangle, Circle, Grid wall, Cube, Corner, Cylinder, Arch.

| Need | How |
|------|-----|
| Hide a face | Hide face, or paint a Mask |
| Omit black | Look → Omit black / Only black |
| Motion | Direction + speed on this face |
| Duplicate / delete | Duplicate, Delete, or keys `D` / Delete |
| Fill the projector | Fill output |
| Undo | Ctrl/Cmd+Z · Redo Shift+Z |
| Halloween ideas | **Ideas** / `I` · Use · Riff this · type a spark |

Keys: `1` Look · `2` Place · `3` Mask · `4` Present · `O` hide face · `Esc` hide chrome.

Drop `splash.json` + `*.obj` from Blender’s Splash addon or from `splash-master` if you already have a project.
