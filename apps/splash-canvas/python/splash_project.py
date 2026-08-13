#!/usr/bin/env python3
"""Read a Splash (splashmapper) project tree and print how the files connect.

Splash is a node graph, not a single screen:
  Image/Video -> Filter (black level, invert) -> Object <- Mesh (OBJ + UVs)
       Object -> Camera -> Warp (bezier patch) -> Window

Blender exports that graph as JSON plus splash_<object>.obj files.
Python addons inside Splash call splash.get_object_list / set_object_attribute.

This script does not need the C++ engine. Point it at splash-master (or any
Splash checkout) and it will list meshes, warps, filters, links, and Blender files.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


COMMENT = re.compile(r"(^|[^:])//.*?$", re.M)


def load_jsonc(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    text = COMMENT.sub(r"\1", text)
    return json.loads(text)


def unwrap(value):
    if isinstance(value, list) and len(value) == 1:
        return unwrap(value[0])
    return value


def iter_scene_objects(config: dict):
    """Yield (scene_name, object_name, object_dict) for both Splash JSON layouts."""
    if "scenes" in config and isinstance(config["scenes"], dict):
        for scene_name, scene in config["scenes"].items():
            objects = scene.get("objects") or {}
            for obj_name, obj in objects.items():
                yield scene_name, obj_name, obj
            links = scene.get("links") or []
            yield scene_name, "__links__", {"type": "links", "links": links}
        return

    for scene in config.get("scenes") or []:
        if not isinstance(scene, dict):
            continue
        name = scene.get("name") or "scene"
        block = config.get(name) or {}
        links = block.get("links") or []
        for obj_name, obj in block.items():
            if obj_name == "links" or not isinstance(obj, dict):
                continue
            yield name, obj_name, obj
        yield name, "__links__", {"type": "links", "links": links}


def summarize(config: dict) -> dict:
    summary = {
        "version": unwrap(config.get("version")),
        "world": config.get("world") or {},
        "objects": [],
        "links": [],
        "meshes": [],
        "images": [],
        "warps": [],
        "filters": [],
        "cameras": [],
        "windows": [],
    }
    for scene, name, obj in iter_scene_objects(config):
        kind = unwrap(obj.get("type"))
        if kind == "links":
            for link in obj.get("links") or []:
                summary["links"].append({"scene": scene, "from": link[0], "to": link[1]})
            continue
        record = {
            "scene": scene,
            "name": name,
            "type": kind,
            "file": unwrap(obj.get("file")),
            "patchSize": unwrap(obj.get("patchSize")),
            "patchControl": obj.get("patchControl"),
            "invertChannels": unwrap(obj.get("invertChannels")),
            "blackLevel": unwrap(obj.get("blackLevel")),
        }
        summary["objects"].append(record)
        bucket = {
            "mesh": "meshes",
            "image": "images",
            "image_ffmpeg": "images",
            "warp": "warps",
            "filter": "filters",
            "filter_black_level": "filters",
            "camera": "cameras",
            "window": "windows",
        }.get(kind)
        if bucket:
            summary[bucket].append(record)
    return summary


def find_splash_files(root: Path) -> dict:
    root = root.resolve()
    found = {
        "root": str(root),
        "json": [],
        "obj": [],
        "blend": [],
        "python": [],
        "blender_addon": [],
    }
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = str(path.relative_to(root))
        if any(part in {".git", "node_modules", "external", "build"} for part in path.parts):
            continue
        suffix = path.suffix.lower()
        if suffix == ".json" and "splash" in path.name.lower() or path.name.endswith("scene.json"):
            found["json"].append(rel)
        elif suffix == ".json" and path.name in {"splash.json", "splashrc.json"}:
            found["json"].append(rel)
        elif suffix == ".obj":
            found["obj"].append(rel)
        elif suffix == ".blend":
            found["blend"].append(rel)
        elif suffix == ".py" and "blender" in rel:
            found["blender_addon"].append(rel)
        elif suffix == ".py" and ("addons/python" in rel.replace("\\", "/") or path.name in {"httpserver.py", "repl.py"}):
            found["python"].append(rel)
    # Also catch splash.json even if name check missed
    for path in root.rglob("splash.json"):
        rel = str(path.relative_to(root))
        if rel not in found["json"]:
            found["json"].append(rel)
    return found


def print_summary(summary: dict) -> None:
    print(f"Splash version: {summary['version']}")
    world = summary["world"]
    if world:
        print(f"World framerate: {unwrap(world.get('framerate'))}")
    print("\nGraph objects:")
    for obj in summary["objects"]:
        extra = obj["file"] or obj["patchSize"] or ""
        print(f"  [{obj['scene']}] {obj['name']:28} type={obj['type']} {extra}")
    print("\nLinks (from -> to):")
    for link in summary["links"]:
        print(f"  {link['from']} -> {link['to']}")
    print("\nHow this maps to the canvas:")
    print("  Mesh OBJ faces     -> Geometry tab (pin media onto a face)")
    print("  Warp patchControl  -> Warp tab (move a sectional grid onto a surface)")
    print("  Filter/blackLevel  -> Mask tab (lift blacks, omit black, or invert)")
    print("  Image/Video        -> media assigned to the object / selected faces")
    print("  Window             -> Present / fullscreen output")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".", help="Path to splash-master or a Splash checkout")
    parser.add_argument("--json", help="Specific splash JSON to parse")
    parser.add_argument("--out", help="Write a compact web project JSON")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    print(f"Scanning {root}\n")
    files = find_splash_files(root)
    for key in ("json", "obj", "blend", "blender_addon", "python"):
        print(f"{key}:")
        for rel in files[key][:40]:
            print(f"  {rel}")
        if not files[key]:
            print("  (none found)")
        print()

    json_path = Path(args.json).expanduser() if args.json else None
    if json_path is None:
        for rel in files["json"]:
            candidate = root / rel
            if candidate.name == "splash.json" or "sample" in candidate.name:
                json_path = candidate
                break
        if json_path is None and files["json"]:
            json_path = root / files["json"][0]

    if json_path and json_path.exists():
        print(f"Parsing {json_path}\n")
        config = load_jsonc(json_path)
        summary = summarize(config)
        print_summary(summary)
        if args.out:
            out = Path(args.out)
            out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
            print(f"\nWrote {out}")
    else:
        print("No splash JSON found. Drop splash.json from the Blender addon export onto the canvas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
