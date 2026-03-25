# Autofit Testbench — Evaluation Plan

## Overview

When "Import Room with Autofit" is triggered, the algorithm:
1. Computes normalized zone positions from the source room
2. Remaps them onto the destination room geometry
3. Calls a sequence of APIs (copyRoomData → autoResize → transform × N → lights)
4. Runs a BFS readjustment pass to fix neighbor gaps after resize

The testbench evaluates the **quality of the output** across the dimensions below and returns a scored JSON report after each run.

---

## Decisions & Assumptions

| Question | Decision |
|---|---|
| **Evaluation scope** | Primarily post-API response. Intermediate values (wall mapping, scale factors) also captured where they provide extra signal — they are cheap to compute and help distinguish algorithm bugs from API bugs. |
| **Run mode** | Single-run, triggered from UI. Architecture designed to accept a CSV of pairs and return a CSV of scores in a future batch mode. |
| **Tolerances** | Derived from the algorithm's own constants (`WALL_PROXIMITY_THRESHOLD = 100`, `TOLERANCE.FURNITURE_ZONE = 100`, `TOLERANCE.PROPS = 250`). Where no constant exists, values are reported as informational with no hard pass/fail until calibrated on real data. |
| **Ground truth** | No external ground truth. Pass/fail is determined by the algorithm's own invariants — wall-snapped zones must touch the correct wall, corner zones must be in the correct corner, free-floating zones are compared against their own normalized source position (the algorithm's stated goal is to preserve relative position). |

---

## Evaluation Dimensions

### A — Zone Placement
> Are zones placed in the right location relative to the destination room?
> **Source of truth**: post-API response (final dest room state).

| # | Check | How | Pass Condition |
|---|---|---|---|
| A1 | **In-bounds** | `zone.center ± halfDimension` vs dest room boundary (accounting for zone rotation) | Every edge within room bounds |
| A2 | **Wall snap accuracy** | For zones where source had `wallTouch`, measure the snapped edge distance to the corresponding mapped wall in dest | Distance < `WALL_PROXIMITY_THRESHOLD` (100 units) |
| A3 | **Corner snap accuracy** | For zones where source had `cornerTouch`, detect which corner they landed in using the same `detectCornerTouches` logic | Correct corner matched |
| A4 | **Free-zone position drift** | For zones with no `wallTouch`/`cornerTouch`: `∣xNorm_dest − xNorm_src∣` and `∣zNorm_dest − zNorm_src∣` | **Informational** — reported as a number, no hard pass/fail until calibrated |
| A5 | **Module out-of-bounds** | For every module inside every zone, compute absolute module position (`zone.position + module.position_x/y/z`) and check all edges against dest room bounds. A module is out-of-bounds if any edge crosses the room boundary. | **Fail** — report which zone and which module crossed, and by how much |

---

### B — Zone Integrity
> Did all zones survive the copy with their structure intact?
> **Source of truth**: post-API response.

| # | Check | How | Pass Condition |
|---|---|---|---|
| B1 | **Zone count** | `dest.unitEntries.length === src.unitEntries.length` | Exact match |
| B2 | **Type preservation** | Each zone's `unitEntryType` in dest matched to its source counterpart via `copiedUnitEntryId` | All match |
| B3 | **No overlaps** | Bounding box intersection check for every zone pair in dest after all transforms | Zero intersecting pairs |
| B4 | **Neighbor gap preservation** | Zone pairs that were adjacent (within `TOLERANCE.FURNITURE_ZONE = 100`) in src — still touching in dest? | Gap ≤ 100 per adjacent pair |
| B5 | **Module count per zone** | `destZone.miqModules.length === srcZone.miqModules.length` per zone | Exact match per zone |

---

### C — Scaling
> Were zone dimensions scaled proportionally to the room size change?
> **Source of truth**: intermediate computed values + post-API zone dimensions.

| # | Check | How | Pass Condition |
|---|---|---|---|
| C1 | **Scale factor correctness** | `scaleX = destRoom.breadth / srcRoom.breadth`, `scaleY = destRoom.length / srcRoom.length` verified against what `getRelativePositionsWrapper` computed | Within 1% |
| C2 | **Zone resize accuracy** | `destZone.assets.width` vs `srcZone.assets.width × scaleX` (or `scaleY` for 90/270° rotated zones) | **Informational** — reported as % error per zone, no hard pass/fail until calibrated |
| C3 | **L-corner / loft zones skipped from resize** | Zones flagged `isLCornerZone` or `isLoftZone` must have `autoResize` not called on them | Zero resize calls on these zones |

---

### D — Wall Mapping
> Were source walls correctly paired with destination walls?
> **Source of truth**: intermediate `sToDWallNameMapping` from `getRelativePositionsWrapper`.

| # | Check | How | Pass Condition |
|---|---|---|---|
| D1 | **Mapping completeness** | Every key in `sToDWallNameMapping` maps to a non-null dest wall key | No null values |
| D2 | **Angle alignment** | For each mapped pair, compute `calculateAngle(srcWall)` vs `calculateAngle(destWall)` — difference should be small | **Informational** — angle diff reported per pair |
| D3 | **Wall count mismatch handling** | When src and dest rooms have different wall counts, no crash and no unmapped source walls blow up | Zero errors |

---

### E — Lights
> Was the lighting transferred and scaled correctly?
> **Source of truth**: post-API response from `GET project` after lights PUT.

| # | Check | How | Pass Condition |
|---|---|---|---|
| E1 | **Light count preserved** | `dest.roomSettings.lights.length === src.roomSettings.lights.length` | Exact match |
| E2 | **Relative position preserved** | `(lightX − roomCenterX) / roomWidth` in src vs dest per light | **Informational** — drift reported per light |
| E3 | **Bloom / exposure copied** | `dest.roomSettings.bloomStrength === src.roomSettings.bloomStrength` and same for `exposure` | Exact match |

---

### F — API Execution
> Did each API step in the saga succeed, and how long did it take?
> **Source of truth**: captured in saga instrumentation.

| # | Check | How | Pass Condition |
|---|---|---|---|
| F1 | **copyRoomData** | HTTP status of the bulk copy call | 2xx |
| F2 | **autoResize per zone** | Success / fail / skipped count across all `FITTED_FURNITURE` zones | 0 failures (skips are ok) |
| F3 | **transform per zone** | Success / fail count across all readjusted transform calls | 0 failures |
| F4 | **Lights PUT** | HTTP status | 2xx |
| F5 | **End-to-end latency** | Wall-clock time from button click to saga resolve | Informational |

---

## Scoring Model

Each check is either:
- **Pass/Fail** — hard correctness requirement (zone count, overlaps, L-corner skipped, etc.)
- **Informational** — reported as a number (drift, angle diff, resize % error) with no hard pass/fail until real data gives us a sensible threshold

### Score Calculation

```
score = (passed hard checks / total hard checks) × 100
```

Informational metrics are included in the report but do not affect the score. They are there to help calibrate future thresholds.

### Grade Scale

| Score | Grade | Meaning |
|---|---|---|
| 95–100 | A | All hard checks pass, minor informational drift |
| 80–94  | B | 1–2 non-critical hard checks failing |
| 60–79  | C | Structural issues (overlaps, zone loss, wall snap misses) |
| < 60   | F | Fundamental failure (zone count wrong, API errors) |

---

## Output JSON Schema

```json
{
  "runId": "<ISO timestamp>",
  "sourceProjectId": "...",
  "sourceRoomId": "...",
  "destProjectId": "...",
  "destRoomId": "...",
  "roomType": "BEDROOM",
  "scores": {
    "placement": {
      "inBounds":           { "pass": true,  "failedZones": [] },
      "wallSnapAccuracy":   { "pass": true,  "failedZones": [] },
      "cornerSnapAccuracy": { "pass": false, "failedZones": ["objectId-xyz"] },
      "positionDrift":      { "informational": true, "avgDriftX": 0.02, "avgDriftZ": 0.03, "perZone": [] },
      "moduleOutOfBounds":  { "pass": false, "failedModules": [
        { "zoneObjectId": "zone-abc", "moduleName": "Base Unit", "edge": "right", "overshootBy": 45 }
      ]}
    },
    "integrity": {
      "zoneCount":          { "pass": true,  "expected": 8, "actual": 8 },
      "typePreservation":   { "pass": true,  "mismatches": [] },
      "overlaps":           { "pass": true,  "count": 0, "pairs": [] },
      "neighborGaps":       { "pass": true,  "brokenPairs": [] },
      "moduleCount":        { "pass": true,  "mismatches": [] }
    },
    "scaling": {
      "scaleFactors":       { "scaleX": 0.85, "scaleY": 0.92 },
      "cornerLoftSkipped":  { "pass": true },
      "zoneResizeAccuracy": { "informational": true, "avgErrorPct": 3.2, "perZone": [] }
    },
    "wallMapping": {
      "completeness":       { "pass": true,  "nullMappings": [] },
      "angleAlignment":     { "informational": true, "perPair": [] }
    },
    "lights": {
      "countMatch":         { "pass": true },
      "bloomExposure":      { "pass": true },
      "positionDrift":      { "informational": true, "avgDrift": 0.01, "perLight": [] }
    },
    "api": {
      "copyRoomData":       { "pass": true,  "status": 200 },
      "autoResize":         { "pass": true,  "total": 6, "success": 6, "failed": 0, "skipped": 2 },
      "transforms":         { "pass": true,  "total": 4, "success": 4, "failed": 0 },
      "lights":             { "pass": true,  "status": 200 },
      "latencyMs":          { "informational": true, "value": 3420 }
    }
  },
  "overall": {
    "score": 91,
    "grade": "B",
    "totalHardChecks": 12,
    "passedHardChecks": 11,
    "failedChecks": ["A3 — corner snap failed for objectId-xyz"],
    "informationals": {
      "avgPositionDriftX": 0.02,
      "avgPositionDriftZ": 0.03,
      "avgResizeErrorPct": 3.2,
      "latencyMs": 3420
    }
  }
}
```

---

## Future: Batch Mode (CSV)

When batch mode is added, the input CSV will have columns:
```
sourceProjectId, sourceRoomId, destProjectId, destRoomId
```

The output CSV will have columns:
```
runId, sourceRoomId, destRoomId, score, grade, failedChecks, avgDriftX, avgDriftZ, avgResizeErrorPct, latencyMs
```

Each row = one import run. Failed checks will be semicolon-separated in a single column.
