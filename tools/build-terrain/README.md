# Canadian Rockies Terrain Ingest & Terrarium Pipeline

This pipeline builds and packages high-resolution bare-earth Canadian terrain for the Banff-Jasper 3D Planner with **$0 recurring API cost** and **zero external billing dependencies**.

---

## Data Sources & Priorities

1. **Primary**: [NRCan High-Resolution Digital Elevation Model (HRDEM) Mosaic](https://open.canada.ca/data/en/dataset/957782bf-84d4-48c5-a079-04186595ddb3)
   - **Product**: Bare-earth Digital Terrain Model (DTM), 1 m to 2 m native resolution.
   - **Rationale**: DTM removes tree canopy, structural clutter, and noise, leaving crisp mountain rock and valley geology.
2. **Secondary (Gap-Fill / Wide Area)**: [NRCan Canadian Digital Elevation Model (CDEM)](https://open.canada.ca/data/en/dataset/7f245a4d-76c2-4caa-951a-45d1d2051333)
   - **Resolution**: 0.75 arc-second (~20 m).
   - **Rationale**: Seamless regional coverage across British Columbia / Alberta provincial boundaries.
3. **License**: [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada) (permissive commercial and personal use).

---

## Area of Interest (AOI)

Defined in [`aoi.geojson`](./aoi.geojson):
- **Master Corridor Envelope**: ~35 km buffer along Highway 1 (Trans-Canada), Highway 93N (Icefields Parkway), and Highway 16 (Yellowhead).
  - Bounds: `[-118.50, 50.95]` to `[-113.80, 53.60]` (~450 km corridor).
- **Iconic Basins**:
  - Banff / Sulphur Mountain / Lake Minnewanka
  - Lake Louise / Moraine Lake / Valley of the Ten Peaks
  - Bow Lake / Peyto Lake / Bow Summit
  - Columbia Icefield / Athabasca Glacier (Hero Location)
  - Jasper / Pyramid Mountain / Maligne Lake Basin
  - Yoho / Emerald Lake

---

## Multi-Resolution Level of Detail (LOD)

| LOD | Target Resolution | Zoom Levels | Purpose | Typical Coverage |
|---|---|---|---|---|
| **LOD 0** | 20–30 m | z7–z9 | Whole trip regional context, long-distance vistas | Calgary to Jasper |
| **LOD 1** | 10–15 m | z10–z11 | Scenic highway corridor, valley approach | 35 km route buffer |
| **LOD 2** | 2–5 m | z12–z13 | Iconic basins (Louise, Bow, Maligne) | 5–10 km focal areas |
| **LOD 3** | 1–2 m | z14–z15 | Hero viewpoints (Athabasca Glacier, Ten Peaks) | 2–4 km viewpoints |

---

## Asset Size Budget Report

For the corridor seed package (`tools/build-terrain/generate_terrarium_tiles.py`):

- **Format**: MapLibre-compatible PNG raster-dem (Terrarium encoding: `(R*256 + G + B/256) - 32768`).
- **Tile Dimensions**: 256 × 256 pixels.
- **Tile Count**: 157 tiles.
- **Total Compressed Size**: 19.18 MB.
- **Git Strategy**: Kept out of main git commit tree via `.gitignore` to prevent repository bloat; served directly via `./terrain/{z}/{x}/{y}.png` when present, with seamless fallback to the free AWS Open Data Terrarium DEM if absent.

---

## Reproducing the Pipeline

### Prerequisites
- Python 3.10+
- `numpy`
- `Pillow` (PIL)

```bash
pip install numpy pillow
```

### 1. Ingest STAC Metadata & Assets
```bash
python3 tools/build-terrain/download_nrcan.py
```

### 2. Generate Local Terrarium Tiles
```bash
python3 tools/build-terrain/generate_terrarium_tiles.py
```

### 3. Verification & Server Launch
When `terrain/` exists, `server.js` automatically enables local terrain tiles at `/terrain/{z}/{x}/{y}.png`.
Test directly:
```bash
curl -I http://localhost:3001/terrain/11/361/679.png
```
Output: `HTTP/1.1 200 OK` `Content-Type: image/png`
