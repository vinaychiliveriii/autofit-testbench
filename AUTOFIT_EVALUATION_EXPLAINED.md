# What the Autofit Testbench is Checking — and Why It Matters

When you click "Import Room with Autofit", the system takes all the furniture from one room (source) and tries to intelligently place it into a different room (destination). The destination room may be a different size, shape, or orientation.

The testbench runs automatically after every import and gives you a score out of 100. Below is a plain-English explanation of what each section checks and what it means for the quality of the result.

---

## A — Zone Placement
### What is it?
A "zone" is a furniture unit — a wardrobe, a bed, a sofa, a kitchen counter. Zone Placement checks whether each piece of furniture ended up in the right place inside the destination room.

### What are we checking?

**A1 — Is every piece of furniture inside the room?**
After moving furniture from source to destination, no piece should be sticking out through a wall. This check confirms that every zone's full footprint (including its width and depth) fits entirely within the room's four walls.
→ *A wardrobe half inside the wall is a failure.*

**A2 — Did wall-touching furniture stay against its wall?**
In the source room, some furniture is placed flush against a specific wall (e.g. a wardrobe against the back wall). After import, that same furniture should still be touching the equivalent wall in the destination room.
→ *If the wardrobe was against the back wall in source, it should be against the back wall in destination too. If it's floating in the middle, that's a failure.*

**A3 — Did corner furniture land in the right corner?**
Some furniture sits in corners (e.g. an L-shaped wardrobe in the back-left corner). This check confirms it landed in the correct corner in the destination room.
→ *Corner furniture moving to the wrong corner is a failure.*

**A4 — How much did free-floating furniture drift? (Informational)**
Furniture that isn't against any wall should roughly maintain its relative position in the room. For example, if a bed was centered slightly towards the left in the source room, it should be similarly positioned in the destination. This is reported as a drift number — lower is better — but it doesn't affect the score directly yet because we're still learning what "too much" looks like.
→ *This is shown for awareness, not scored.*

**A5 — Are any individual modules going outside the room?**
Each piece of furniture is made up of smaller components called modules (e.g. a wardrobe is made of individual cabinet units). Even if the furniture zone itself looks fine, a module inside it might be poking through a wall. This check goes deeper and looks at every single module's position.
→ *A cabinet unit peeking through a wall is caught here and marked as a failure with the exact module and direction.*

---

## B — Zone Integrity
### What is it?
After the import, this section checks whether all the furniture survived the move correctly — nothing got lost, duplicated, changed into the wrong type, or started overlapping with other furniture.

### What are we checking?

**B1 — Did all furniture pieces make it across?**
The number of furniture zones in the destination room should exactly match the number in the source room. If the source had 8 zones, the destination should also have 8.
→ *Any fewer means something got dropped. Any more means something got duplicated.*

**B2 — Did each zone keep its correct type?**
A wardrobe should stay a wardrobe. A loose furniture item (prop) should stay a prop. The system should never accidentally convert one type into another during the copy.
→ *Mismatched types would cause the furniture to behave incorrectly in the 3D viewer.*

**B3 — Is any furniture overlapping another piece?**
After placement, no two furniture pieces should be occupying the same space. This check scans every possible pair of zones and flags any that overlap.
→ *Two wardrobes sitting inside each other is a failure.*

**B4 — Is furniture that was touching each other still touching?**
In the source room, some zones are placed right next to each other (e.g. a row of base cabinets in a kitchen). After import and resizing, they should still be touching — no unexpected gaps should appear between them.
→ *A gap opening up between two base cabinets that were flush in the source room is a failure.*

**B5 — Does each furniture piece still have all its modules?**
Every furniture zone is built from individual modules. If a zone had 6 cabinet units in source, it should still have 6 in destination. Missing modules mean incomplete furniture.
→ *A kitchen unit with 3 missing cabinets is a failure.*

---

## C — Scaling
### What is it?
The destination room is usually a different size than the source room. Scaling is the process of adjusting furniture dimensions to fit the new room proportionally. This section checks that the scaling was done correctly.

### What are we checking?

**C1 — Were the scale ratios calculated correctly?**
Before any furniture is moved, the system calculates how much bigger or smaller the destination room is compared to the source — separately for width and length. For example, if the destination is 80% as wide, furniture should be resized to 80% of its original width. This check confirms those ratios were computed accurately.
→ *A wrong ratio would cause everything downstream to be placed at the wrong size.*

**C2 — Did furniture actually resize to the expected dimensions? (Informational)**
After the ratios are calculated, each piece of fitted furniture is resized via an API call. This check compares the expected new width (source width × scale ratio) against the actual width after resizing. Reported as a percentage error per zone.
→ *Not scored yet — we're collecting data to understand what a "normal" error looks like.*

**C3 — Was L-corner and loft furniture left untouched?**
L-shaped corner wardrobes and loft units are special — resizing them automatically would break their structure. The system is supposed to skip the resize step for these. This check confirms that rule was followed.
→ *Resizing an L-corner wardrobe is a failure — it would cause it to look broken.*

---

## D — Wall Mapping
### What is it?
When furniture is copied from source to destination, the system needs to know which wall in the destination corresponds to which wall in the source (e.g. "the back wall in source maps to the back wall in destination"). This mapping is used to correctly place wall-touching furniture. Wall Mapping checks that this translation was done correctly.

### What are we checking?

**D1 — Does every source wall have a matching destination wall?**
The system produces a map of source walls to destination walls. Every source wall should be paired with a destination wall — none should be left unmapped.
→ *An unmapped wall means any furniture against that wall has no reference point in destination.*

**D2 — Are the matched walls pointing in similar directions? (Informational)**
A wall running left-to-right in source should ideally map to a wall also running left-to-right in destination. This checks the angle difference between each mapped pair.
→ *Not scored yet — informational only, to help debug placement issues.*

---

## E — Lights
### What is it?
Along with furniture, the source room's lighting setup (ceiling lights, wall lights, bloom effect, exposure) is also transferred to the destination room. This section checks that the lights were copied correctly and repositioned to match the new room's proportions.

### What are we checking?

**E1 — Were all lights transferred?**
The number of lights in the destination room should match the source. If the source had 4 ceiling lights, the destination should also have 4.
→ *Missing lights means the room will look darker or different from the source.*

**E2 — Are the lights in roughly the same relative positions? (Informational)**
A light positioned in the center of the source room should be in the center of the destination room too. This is measured as a relative drift (not absolute distance, since the rooms are different sizes).
→ *Not scored yet — informational only.*

**E3 — Were bloom and exposure settings copied exactly?**
Bloom (the glow effect around bright lights) and exposure (overall brightness) are specific numerical settings. They should be identical in source and destination.
→ *Different bloom/exposure values would make the destination room look visually different from the source even with the same furniture.*

---

## F — API Execution
### What is it?
The autofit process is not just an algorithm — it makes several calls to the backend (the server) to actually save the furniture positions, resize furniture, transform positions, and apply lighting. This section checks that all those server calls succeeded.

### What are we checking?

**F1 — Did the initial furniture copy succeed?**
The very first API call copies all the furniture zones from source to destination in one shot. If this fails, nothing else can proceed.
→ *A failure here means zero furniture was moved.*

**F2 — Did all the resize calls succeed?**
After copying, each fitted furniture zone is resized individually via a separate API call. This tracks how many succeeded, how many failed, and how many were intentionally skipped (e.g. L-corner/loft zones).
→ *Failures here mean furniture has wrong dimensions in destination.*

**F3 — Did all the position adjustment calls succeed?**
After resizing, each zone's final position is saved via another API call. This tracks success/failure for all position update calls.
→ *Failures here mean furniture ended up in the wrong position despite being calculated correctly.*

**F4 — Did the lights transfer call succeed?**
The lighting settings are saved via a separate API call at the end. This checks if it went through.
→ *A failure here means the destination room has default lighting instead of the source room's lighting.*

**F5 — How long did the whole process take? (Informational)**
Total wall-clock time from when you clicked the button to when everything finished. Not scored — just useful to know if something is running slower than expected.

---

## How the Overall Score Works

Each check above is either a **hard check** (pass or fail, counts toward your score) or **informational** (reported as a number, no score impact yet).

```
Score = (number of hard checks that passed) ÷ (total hard checks) × 100
```

| Score | Grade | What it means |
|---|---|---|
| 95–100 | A | Everything placed correctly, all APIs succeeded |
| 80–94  | B | Minor issues — 1 or 2 checks failing, not critical |
| 60–79  | C | Structural problems — overlaps, missing furniture, wall snaps broken |
| Below 60 | F | Fundamental failure — furniture lost, APIs failing, rooms incompatible |

The informational metrics (drift, resize error, latency) are shown alongside the score so you can track them over time and eventually use them to set thresholds as you run more test cases.
