# Splash Canvas

Local mapping studio for the Splash (`splash-master`) graph: **faces, warp grid, black omit, and directional animation**. No API key.

It reads the same JSON / OBJ / Blender-export files Splash uses. A deep map of how those files connect is in [ENGINE.md](./ENGINE.md).

## Run

```bash
cd apps/splash-canvas
./start.sh
```

Open http://127.0.0.1:8765

Optional: inspect a Splash checkout without the C++ engine:

```bash
python3 python/splash_project.py /Users/javierthephotoguy/Downloads/splash-master
```

## What you can do

| Need | How |
|------|-----|
| Grid of faces | Starter `samples/grid_wall.obj`, or drop any UV-mapped OBJ |
| Pin media on a face | Click a face, drop a photo or video |
| Pinch a section | Two-finger pinch (or drag the gold corners) |
| Move a section onto a surface | **Warp** tab: drag the 4×4 bezier grid (Splash `patchControl`) |
| Omit black / no color there | Mask tab, or **Omit black** / **Only black**, or omit a whole face |
| Vice versa | Invert painted mask, or invert omitted faces, or “Only black” |
| Animation left/right/up/down | Select a face → Animation U/V |

Keys: `1` geometry · `2` warp · `3` mask · `4` present · `O` omit face.

Drop `splash.json` + `*.obj` from Blender’s Splash addon or from `splash-master`.
