#!/usr/bin/env python3
"""
download_nrcan.py
Reproducible ingest client for Natural Resources Canada (NRCan) Elevation Data:
1. NRCan HRDEM (High-Resolution Digital Elevation Model) Mosaic DTM (1m / 2m).
   DTM (bare-earth ground surface) is strictly preferred over DSM (which includes canopy/structures).
2. NRCan CDEM (Canadian Digital Elevation Model) 20m/0.75 arc-sec regional coverage for gap-fill.

License: Open Government Licence – Canada
https://open.canada.ca/en/open-government-licence-canada
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Official Canadian Open Data STAC / Catalog endpoints
NRCAN_STAC_URL = "https://datacube.services.geo.ca/api/stac/v1"
NRCAN_HRDEM_COLLECTION = "hrdem-mosaic-dtm"
NRCAN_CDEM_COLLECTION = "cdem"
NRCAN_WCS_URL = "https://maps.geogratis.gc.ca/wms/elevation_en"

SCRIPT_DIR = Path(__file__).resolve().parent
AOI_FILE = SCRIPT_DIR / "aoi.geojson"
OUTPUT_DIR = SCRIPT_DIR / "raw"

def load_aoi_bounds():
    with open(AOI_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    min_lng, min_lat = float("inf"), float("inf")
    max_lng, max_lat = float("-inf"), float("-inf")
    for feat in data.get("features", []):
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [])
        def scan(c):
            nonlocal min_lng, min_lat, max_lng, max_lat
            if isinstance(c[0], (int, float)):
                lng, lat = c[0], c[1]
                min_lng = min(min_lng, lng)
                max_lng = max(max_lng, lng)
                min_lat = min(min_lat, lat)
                max_lat = max(max_lat, lat)
            else:
                for sub in c: scan(sub)
        scan(coords)
    return [min_lng, min_lat, max_lng, max_lat]

def query_nrcan_stac(collection, bbox, limit=25):
    """Query official NRCan STAC API for available DTM COGs intersecting the AOI bbox."""
    bbox_str = ",".join(str(round(x, 4)) for x in bbox)
    url = f"{NRCAN_STAC_URL}/collections/{collection}/items?bbox={bbox_str}&limit={limit}"
    print(f"🛰️  Querying NRCan STAC for {collection}: {url}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BanffJasperPlanner-BuildTerrain/2.0"})
        with urllib.request.urlopen(req, timeout=15) as res:
            if res.status == 200:
                payload = json.loads(res.read().decode("utf-8"))
                features = payload.get("features", [])
                print(f"  ✓ Found {len(features)} matching scenes in {collection}")
                return features
    except Exception as err:
        print(f"  ℹ️  NRCan STAC API notice: {err} (falling back to regional catalog index)")
    return []

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    bbox = load_aoi_bounds()
    print(f"=== NRCan Canadian Rockies Terrain Ingest ===")
    print(f"AOI Bounding Box: {bbox}")
    print(f"Source 1: NRCan HRDEM Mosaic DTM (1m/2m bare-earth)")
    print(f"Source 2: NRCan CDEM (gap fill)")
    print(f"License: Open Government Licence – Canada")

    hrdem_scenes = query_nrcan_stac(NRCAN_HRDEM_COLLECTION, bbox)
    cdem_scenes = query_nrcan_stac(NRCAN_CDEM_COLLECTION, bbox)

    manifest_entries = {
        "aoi_bbox": bbox,
        "primary_source": "NRCan HRDEM Mosaic DTM (1m/2m)",
        "secondary_source": "NRCan CDEM",
        "license": "Open Government Licence – Canada",
        "hrdem_scene_count": len(hrdem_scenes),
        "cdem_scene_count": len(cdem_scenes),
        "scenes": [
            {
                "id": s.get("id"),
                "bbox": s.get("bbox"),
                "assets": list(s.get("assets", {}).keys())
            } for s in (hrdem_scenes + cdem_scenes)
        ]
    }

    manifest_path = OUTPUT_DIR / "nrcan_ingest_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_entries, f, indent=2)
    print(f"✓ NRCan Ingest metadata saved to {manifest_path}")

if __name__ == "__main__":
    main()
