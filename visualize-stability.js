/* visualize-stability.js
 * Stability guard for the free MapLibre terrain renderer.
 *
 * This intentionally favors a coherent terrain mesh over maximum zoom/pitch.
 * It also refuses unverified local terrain: only genuine, explicitly validated
 * DEM assets may replace the consistent AWS/Open Data Terrarium source.
 */
(function (root) {
  'use strict';

  if (!root || !root.VisualizeWorld) return;
  if (root.__ROCKIES_TERRAIN_STABILITY_PATCHED) return;
  root.__ROCKIES_TERRAIN_STABILITY_PATCHED = true;

  root.ROCKIES_CONFIG = Object.assign(root.ROCKIES_CONFIG || {}, {
    localTerrain: false,
    terrainTileUrl: null,
    terrainSource: 'aws-open-data-terrarium',
    terrainStabilityMode: true
  });

  const World = root.VisualizeWorld;
  const originalInitialize = World.initialize.bind(World);

  World.initialize = async function stableInitialize(targetContainer) {
    const ML = await World.loadMapLibre();

    if (ML && !ML.__rockiesStableMapPatched) {
      ML.__rockiesStableMapPatched = true;
      const OriginalMap = ML.Map;

      ML.Map = class RockiesStableMap extends OriginalMap {
        constructor(options) {
          super(Object.assign({}, options || {}, {
            // Automatic skirts can render as large vertical walls at terrain-tile
            // boundaries. A fully opaque background is already present, so prefer
            // no skirts and a bounded landscape zoom instead.
            terrainSkirtLength: 'none',
            maxZoom: 15,
            maxPitch: 60,
            fadeDuration: 0
          }));

          const nativeAddSource = this.addSource.bind(this);
          this.addSource = function addStableSource(id, spec) {
            let next = spec;
            if (id === 'rockies-terrain-dem' && spec && spec.type === 'raster-dem') {
              // AWS/Open Data Terrarium has native 256 px tiles through z15.
              // Keeping source maxzoom below the camera zoom forced overzoomed DEM
              // and exposed tile-grid seams in hillshade/terrain rendering.
              next = Object.assign({}, spec, {
                minzoom: 1,
                maxzoom: 15,
                tileSize: 256,
                encoding: 'terrarium'
              });
            }
            return nativeAddSource(id, next);
          };
        }
      };
    }

    const map = await originalInitialize(targetContainer);
    if (map) {
      try { map.setMaxZoom(15); } catch (_) {}
      try { map.setMaxPitch(60); } catch (_) {}

      // Building extrusion is not needed for the mountain experience and can
      // create distracting vertical geometry while terrain is changing LOD.
      try {
        if (map.getLayer('rockies-buildings-3d')) {
          map.setLayoutProperty('rockies-buildings-3d', 'visibility', 'none');
        }
      } catch (_) {}
    }
    return map;
  };
})(typeof window !== 'undefined' ? window : null);
