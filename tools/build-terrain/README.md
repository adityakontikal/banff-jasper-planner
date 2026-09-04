# Canadian Rockies Terrain Ingest

This directory is reserved for building a **genuine, reproducible Canadian terrain dataset** for the Banff–Jasper Visualize experience with $0 recurring API cost.

## Runtime status

The application currently uses the consistent public AWS/Open Data Terrarium DEM by default.

A local `terrain/` directory is **not** trusted automatically. Local terrain is enabled only when:

1. `ROCKIES_LOCAL_TERRAIN=1` is set, and
2. `terrain/terrain-manifest.json` exists, and
3. that manifest explicitly identifies genuine NRCan data, Terrarium encoding, and `"synthetic": false`.

This guard exists because an earlier prototype generated procedural mountain relief and incorrectly described it as NRCan/high-resolution DTM. That prototype has been removed. **Do not fabricate terrain geometry.**

## Approved data sources

Use official Canadian elevation data only:

- **NRCan HRDEM Mosaic DTM** where coverage exists. Prefer DTM/bare-earth data over DSM.
- **NRCan CDEM** for wider-area coverage and legitimate gap fill.
- Open Government Licence – Canada terms must be preserved in generated metadata/attribution.

## Area of interest

`aoi.geojson` covers the trip corridor and key basins around:

- Banff / Sulphur Mountain / Minnewanka
- Lake Louise / Moraine Lake / Ten Peaks
- Bow Lake / Peyto / Bow Summit
- Saskatchewan Crossing
- Columbia Icefield / Athabasca Glacier
- Jasper / Pyramid / Patricia
- Medicine Lake / Maligne Lake
- Hinton
- Yoho / Emerald Lake

Do not use a razor-thin road buffer; adjacent mountain ranges must remain visible.

## Recommended LOD strategy

| LOD | Target | Purpose |
|---|---:|---|
| Regional | 10–20 m | whole-trip landscape |
| Scenic corridor | 5–10 m | major driving valleys |
| Iconic basins | 2–5 m where source permits | Louise, Moraine, Peyto, Icefield, Jasper, Maligne |
| Hero areas | 1–2 m only where genuine HRDEM coverage exists | small showcase zones |

Do not ship native 1–2 m data over the full Calgary–Jasper region.

## Current ingest helper

`download_nrcan.py` currently performs catalog/STAC discovery and writes metadata about matching NRCan scenes. It does **not** yet download, mosaic, reproject, gap-fill, or tile the actual raster assets.

Run:

```bash
python3 tools/build-terrain/download_nrcan.py
```

Treat its output only as discovery metadata.

## Requirements for a future real terrain builder

Before local terrain may be enabled, the builder must:

1. download actual NRCan raster assets;
2. record exact source URLs / item IDs;
3. mosaic in a geospatial toolchain such as GDAL/rasterio;
4. reproject and resample without inventing elevations;
5. use CDEM only for legitimate source gaps;
6. generate MapLibre-compatible Terrarium tiles;
7. preserve tile-edge continuity;
8. validate decoded elevations at known points;
9. produce `terrain/terrain-manifest.json` with at least:

```json
{
  "source": "NRCan HRDEM DTM + NRCan CDEM gap fill",
  "encoding": "terrarium",
  "synthetic": false,
  "license": "Open Government Licence – Canada",
  "minzoom": 7,
  "maxzoom": 15
}
```

10. visually inspect adjacent tile boundaries at multiple zooms before enabling the local source.

## Important

Never generate mountain relief from sine waves, noise, hand-authored peaks, or landmark elevation anchors and call it DEM/NRCan terrain. The Visualize tab is supposed to represent real geography.
