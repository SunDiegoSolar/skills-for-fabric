# How Splash files work together

This canvas speaks the same graph as [Splash mapper](https://splashmapper.xyz) (`splash-master` on disk). The C++ engine is not bundled here (GPLv3, native OpenGL). The JSON, OBJ, Blender addon, and Python scripts already define the mapping. This app loads those files and performs the same jobs in the browser.

## The graph

Everything is nodes plus directed links `[from, to]`:

```
Image / Video ──► Filter (black level, invert) ──► Object ◄── Mesh (OBJ + UVs)
                                                      │
                                                   Camera
                                                      │
                                          Warp (4×4 bezier patch)
                                                      │
                                                   Window
```

Default `data/share/splash/splash.json` in Splash does this:

| Link | Meaning |
|------|---------|
| `mesh → object` | UV-mapped geometry is the surface |
| `image → object` and `image → object_image_filter` | Media feeds the object, optionally through a filter |
| `object_image_filter → object` | Color / black-level / invert on that media |
| `object → cam1` | Camera looks at the object |
| `cam1 → window_1_cam1_warp` | Camera image enters the warp |
| `window_1_cam1_warp → window_1` | Warped texture is the fullscreen output |

Blender export (`tests/data/sample_blender_scene.json`) is the same idea with multiple cameras (South / West / East / North / Zenith) sharing one `Object` + `Mesh`.

## File roles

| File | Role |
|------|------|
| `splash.json` / Blender export JSON | World, scenes, objects, attributes, links |
| `*.obj` (`wall_corner.obj`, `cubes.obj`, `splash_<Object>.obj`) | Mesh with **UVs required**. Each face is a pin-able section |
| `addons/blender/splash/*.py` | Node tree: Camera, Image, Mesh, Object, Window, World. Export writes JSON + OBJ |
| `addons/blender/templates/*.blend` | Ready dome / plane projector setups |
| `addons/python/httpserver.py` | Inside Splash: `get_object_list`, `get_object_links`, `set_object_attribute` |
| `addons/python/repl.py` | Live Python REPL against the running graph |
| `filter_black_level` | Lift black (0–255) so projector black can match, or auto-match luminance |
| `warp.patchControl` | 4×4 (default) bezier control points in NDC `[-1, 1]` — drag a sectional grid onto a real surface |
| Second texture / mask mix in the object shader | Overlay another image using its alpha |

## Correctness notes (what this canvas implements)

- **Warp** uses the same Bernstein / binomial evaluation as Splash `Mesh_BezierPatch` (`src/mesh/mesh_bezierpatch.cpp`). Dest vertices are warped on the CPU so any patch size works, not only 4×4 in a shader.
- **invertChannels** swaps red and blue (`color.rgb = color.bgr`), matching Splash’s filter shader — it is not `1.0 - rgb`.
- **blackLevel** is 0–255 in JSON, then `color.rgb * (1 - bl) + bl` with `bl` in 0–1.
- **OBJ** supports negative indices, n-gon fan triangulation, and UV-derived dest quads. Vertices are normalized to a ~1.7 fit so Blender exports are visible.
- Dest handles in the Warp tab are dragged in screen space and **inverse-warped** back into dest NDC, so the gold quad stays on the image while the white grid is `patchControl`.
- Geometry tab shows the 3D mesh (orbit / pick). Warp / Mask / Present show the output mapping.

NVIDIA camera-calibration skills (AMC, NGC) can help a full projector-calibration stack later. They are not required here and are not installed; this studio stays on Splash JSON + OBJ + WebGL.

## The abilities you asked for

**Grid pattern**  
Mesh faces (or the starter `samples/grid_wall.obj` 8×6 UV grid). Warp also draws a 4×4 control grid.

**Pinch and add things to different faces**  
Click a face, drop media, pinch with two pointers to scale that section, drag its four gold corners onto the surface.

**Omit black sections / vice versa**  
- Per face: Omit / restore (no color on that face). Invert omitted faces to flip the set.  
- Per pixel: omit dark luma, or **only** dark luma.  
- Painted mask: black = hole. Invert mask to flip keep/omit. Shift-drag restores.

**Move a sectional thing onto a surface**  
Warp tab = Splash `patchControl`. Drag white points (Bernstein patch) or a face’s gold dest quad (inverse-warped so it tracks the image).

**Animations moving one way or the other**  
Per face: U→ U← V↑ V↓ UV pan, same idea as sliding texture coordinates on a Splash object (Blender can also stream live meshes).

## Use your splash-master folder

```bash
python3 python/splash_project.py /Users/javierthephotoguy/Downloads/splash-master
```

Then in the canvas: **Open Splash files** (or drop) `splash.json` plus the `*.obj` it references, plus any image/video.

From Blender: enable the Splash addon, export the node tree (JSON + `splash_<object>.obj` with UVs), drop those onto the canvas.
