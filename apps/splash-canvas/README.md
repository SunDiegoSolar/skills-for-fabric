# Splash Canvas

Local mapping studio for the Splash (`splash-master`) graph: **faces, warp grid, black omit, and directional animation**. No API key.

It reads the same JSON / OBJ / Blender-export files Splash uses. How those files connect is in [ENGINE.md](./ENGINE.md).

This app does **not** copy Splash’s GPLv3 C++ engine. It speaks the same graph (mesh → object → warp → window) in the browser.

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
| Grid of faces | Starter `samples/grid_wall.obj` (8×6 UV wall) plus a generated UV test pattern |
| Pin media on a face | Click a face, set **Pin to → Selected face only**, drop a photo or video |
| Pinch a section | Two-finger pinch scales that face’s dest quad |
| Move a section onto a surface | **Warp** tab: white points are Splash `patchControl` (Bernstein bezier). Gold corners are the selected face dest, inverse-warped so they stay on the image |
| Omit black / no color there | **Omit black** / **Only black**, omit a whole face, or paint a mask |
| Vice versa | Invert painted mask, invert omitted faces, or “Only black” |
| Splash filter | Black level 0–255 (`color * (1-bl) + bl`), swap red/blue (`invertChannels`), flip U / flop V |
| Animation left/right/up/down | Select a face → Animation U/V, or copy motion to every face |
| Undo / export | Ctrl/Cmd+Z, **Export JSON** (Splash-style graph) |
| Folder ingest | **Open folder** or drop `splash.json` + matching `*.obj` + media |
| Log in | Click **Log in** — the panel opens. Local session on this machine; with `./start.sh` the same form can use a server cookie. Optional `SPLASH_USER` / `SPLASH_PASSWORD`, or `SPLASH_REQUIRE_LOGIN=1`. Dedicated page: http://127.0.0.1:8765/login.html |

Keys: `1` geometry · `2` warp · `3` mask · `4` / `F` present · `O` omit face · `Esc` hide chrome · Ctrl/Cmd+Z undo.

Drop `splash.json` + `*.obj` from Blender’s Splash addon or from `splash-master`.
