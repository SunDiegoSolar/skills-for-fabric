# Splash Canvas

A local fullscreen display you can run in a browser. Put a dynamic background on the whole screen, then add clock, text, photos, weather, and notes on top. **No API key is required.**

The original folder at `/Users/javierthephotoguy/Downloads/splash-master` was not available in this cloud workspace, so this is a standalone app built for that intent: a finished, local canvas rather than a hosted service.

## Run it on your Mac

From this folder:

```bash
chmod +x start.sh
./start.sh
```

Then open [http://127.0.0.1:8765](http://127.0.0.1:8765). Press **F** for fullscreen, **E** to switch between edit and present, **?** for the in-app guide.

You can also run:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

## What you can do

**Backgrounds**

- Animated aurora, dusk, or noir (works fully offline)
- Drop your own photos on the screen for a local slideshow
- Drop a video for a looping muted background
- Optional random photos from Lorem Picsum (internet, still no API key)
- Dim overlay and slow pan/zoom (Ken Burns) on photos

**Things you can add**

- Clock (12/24 hour, optional seconds)
- Date
- Text (kicker, title, or body)
- Image (from files on this machine)
- Weather via [Open-Meteo](https://open-meteo.com/) (no key; default city is San Diego)
- Quote
- Note

In **Edit** mode, drag widgets, resize from the gold corner, and use the inspector for color, size, and alignment. **Present** mode hides the chrome after a couple of seconds of idle mouse.

**Save / share**

- Layout is stored in this browser (including photos in IndexedDB)
- Export / import JSON for the layout (photos stay on this computer)

## Keyboard

| Key | Action |
|-----|--------|
| `F` | Fullscreen |
| `E` | Edit / Present |
| `?` | Help |
| `Esc` | Present mode, or leave fullscreen |
| `Delete` | Remove selected widget |

## Notes

- Weather and random online photos need internet. Everything else works offline with local files.
- This app lives under `apps/splash-canvas/` and is separate from the Microsoft Fabric skills in the rest of this repository.
