// Mirror the algorithm's own constants so thresholds are consistent
const WALL_PROXIMITY_THRESHOLD = 100;
const NEIGHBOR_TOLERANCE = 100;

// ─── Shared helpers ───────────────────────────────────────────────────────────

const getRoomBounds = (room) => ({
  xMin: room.loc.x * 20,
  xMax: (room.loc.x + room.breadth) * 20,
  zMin: room.loc.y * 20,
  zMax: (room.loc.y + room.length) * 20,
});

const getZoneEdges = (zone) => {
  const absRot = Math.round(Math.abs(zone.rotation?.y ?? 0));
  const isRotated = absRot === 90 || absRot === 270;
  const w = isRotated ? zone.assets.length : zone.assets.width;
  const l = isRotated ? zone.assets.width  : zone.assets.length;
  return {
    xLeft:  zone.position.x - w / 2,
    xRight: zone.position.x + w / 2,
    zBack:  zone.position.z - l / 2,
    zFront: zone.position.z + l / 2,
  };
};

const detectCorner = (edges, bounds) => {
  const nearLeft  = Math.abs(bounds.xMin - edges.xLeft)  < WALL_PROXIMITY_THRESHOLD;
  const nearRight = Math.abs(bounds.xMax - edges.xRight) < WALL_PROXIMITY_THRESHOLD;
  const nearBack  = Math.abs(bounds.zMin - edges.zBack)  < WALL_PROXIMITY_THRESHOLD;
  const nearFront = Math.abs(bounds.zMax - edges.zFront) < WALL_PROXIMITY_THRESHOLD;
  const walls = [nearBack && 'back', nearFront && 'front', nearLeft && 'left', nearRight && 'right'].filter(Boolean);
  const map = { 'back left': 'back-left', 'back right': 'back-right', 'front left': 'front-left', 'front right': 'front-right' };
  return map[walls.sort().join(' ')] || null;
};

// ─── A — Zone Placement ───────────────────────────────────────────────────────

const checkA1_inBounds = (destRoom, destZones) => {
  const bounds = getRoomBounds(destRoom);
  const failedZones = [];

  destZones.forEach(zone => {
    const e = getZoneEdges(zone);
    const violations = [];
    if (e.xLeft  < bounds.xMin) violations.push({ edge: 'left',  overshootBy: Math.round(bounds.xMin - e.xLeft) });
    if (e.xRight > bounds.xMax) violations.push({ edge: 'right', overshootBy: Math.round(e.xRight - bounds.xMax) });
    if (e.zBack  < bounds.zMin) violations.push({ edge: 'back',  overshootBy: Math.round(bounds.zMin - e.zBack) });
    if (e.zFront > bounds.zMax) violations.push({ edge: 'front', overshootBy: Math.round(e.zFront - bounds.zMax) });
    if (violations.length) failedZones.push({ zoneObjectId: zone.objectId, zoneName: zone.name, violations });
  });

  return { pass: failedZones.length === 0, failedZones };
};

const checkA2_wallSnapAccuracy = (sourceZoneMeta, destZones, destRoom) => {
  const bounds = getRoomBounds(destRoom);
  const failedZones = [];

  sourceZoneMeta.forEach(srcMeta => {
    if (!srcMeta.wallTouch) return;
    const destZone = destZones.find(z => z.copiedUnitEntryId === srcMeta.objectId);
    if (!destZone) return;

    const e = getZoneEdges(destZone);
    const distMap = { left: Math.abs(bounds.xMin - e.xLeft), right: Math.abs(bounds.xMax - e.xRight), back: Math.abs(bounds.zMin - e.zBack), front: Math.abs(bounds.zMax - e.zFront) };
    const distance = distMap[srcMeta.wallTouch];

    if (distance === undefined || distance > WALL_PROXIMITY_THRESHOLD) {
      failedZones.push({ zoneObjectId: destZone.objectId, zoneName: destZone.name, expectedWall: srcMeta.wallTouch, distanceFromWall: Math.round(distance ?? -1) });
    }
  });

  return { pass: failedZones.length === 0, failedZones };
};

const checkA3_cornerSnapAccuracy = (sourceZoneMeta, destZones, destRoom) => {
  const bounds = getRoomBounds(destRoom);
  const failedZones = [];

  sourceZoneMeta.forEach(srcMeta => {
    if (!srcMeta.cornerTouch?.length) return;
    const expectedCorner = srcMeta.cornerTouch[0];
    const destZone = destZones.find(z => z.copiedUnitEntryId === srcMeta.objectId);
    if (!destZone) return;

    const actualCorner = detectCorner(getZoneEdges(destZone), bounds);
    if (actualCorner !== expectedCorner) {
      failedZones.push({ zoneObjectId: destZone.objectId, zoneName: destZone.name, expectedCorner, actualCorner });
    }
  });

  return { pass: failedZones.length === 0, failedZones };
};

const measureA4_positionDrift = (sourceRoom, sourceZoneMeta, destZones, destRoom) => {
  const sb = getRoomBounds(sourceRoom);
  const db = getRoomBounds(destRoom);
  const sCx = (sb.xMin + sb.xMax) / 2, sCz = (sb.zMin + sb.zMax) / 2;
  const dCx = (db.xMin + db.xMax) / 2, dCz = (db.zMin + db.zMax) / 2;
  const sW = sb.xMax - sb.xMin, sL = sb.zMax - sb.zMin;
  const dW = db.xMax - db.xMin, dL = db.zMax - db.zMin;

  const perZone = [];
  sourceZoneMeta.forEach(srcMeta => {
    if (srcMeta.wallTouch || srcMeta.cornerTouch?.length) return;
    const srcZone = (sourceRoom.unitEntries || []).find(z => z.objectId === srcMeta.objectId);
    const dstZone = destZones.find(z => z.copiedUnitEntryId === srcMeta.objectId);
    if (!srcZone || !dstZone) return;

    const xNormSrc = (srcZone.position.x - sCx) / sW;
    const zNormSrc = (srcZone.position.z - sCz) / sL;
    const xNormDst = (dstZone.position.x - dCx) / dW;
    const zNormDst = (dstZone.position.z - dCz) / dL;

    perZone.push({
      zoneObjectId: dstZone.objectId, zoneName: dstZone.name,
      driftX: parseFloat(Math.abs(xNormDst - xNormSrc).toFixed(4)),
      driftZ: parseFloat(Math.abs(zNormDst - zNormSrc).toFixed(4)),
    });
  });

  const avg = (key) => perZone.length ? parseFloat((perZone.reduce((s, z) => s + z[key], 0) / perZone.length).toFixed(4)) : 0;
  return { informational: true, avgDriftX: avg('driftX'), avgDriftZ: avg('driftZ'), perZone };
};

const checkA5_moduleOutOfBounds = (destRoom, destZones) => {
  const bounds = getRoomBounds(destRoom);
  const failedModules = [];

  destZones.forEach(zone => {
    (zone.miqModules || []).forEach(module => {
      const absX = zone.position.x + (module.position_x ?? 0);
      const absZ = zone.position.z + (module.position_z ?? 0);
      const dim = (module.dimension || '').split(' X ').map(Number);
      const [width, length] = dim;
      if (!width || !length) return;

      const violations = [];
      if (absX - width / 2  < bounds.xMin) violations.push({ edge: 'left',  overshootBy: Math.round(bounds.xMin - (absX - width / 2)) });
      if (absX + width / 2  > bounds.xMax) violations.push({ edge: 'right', overshootBy: Math.round((absX + width / 2) - bounds.xMax) });
      if (absZ - length / 2 < bounds.zMin) violations.push({ edge: 'back',  overshootBy: Math.round(bounds.zMin - (absZ - length / 2)) });
      if (absZ + length / 2 > bounds.zMax) violations.push({ edge: 'front', overshootBy: Math.round((absZ + length / 2) - bounds.zMax) });

      if (violations.length) {
        failedModules.push({ zoneObjectId: zone.objectId, zoneName: zone.name, moduleName: module.moduleName, violations });
      }
    });
  });

  return { pass: failedModules.length === 0, reason: failedModules.length ? 'Modules are going out of the room' : null, failedModules };
};

// ─── B — Zone Integrity ───────────────────────────────────────────────────────

const checkB1_zoneCount = (sourceRoom, destZones) => {
  const expected = (sourceRoom.unitEntries || []).length;
  const actual = destZones.length;
  return { pass: expected === actual, expected, actual };
};

const checkB2_typePreservation = (sourceRoom, destZones) => {
  const mismatches = [];
  destZones.forEach(destZone => {
    const srcZone = (sourceRoom.unitEntries || []).find(z => z.objectId === destZone.copiedUnitEntryId);
    if (srcZone && srcZone.unitEntryType !== destZone.unitEntryType) {
      mismatches.push({ zoneObjectId: destZone.objectId, zoneName: destZone.name, expected: srcZone.unitEntryType, actual: destZone.unitEntryType });
    }
  });
  return { pass: mismatches.length === 0, mismatches };
};

const checkB3_noOverlaps = (destZones) => {
  const pairs = [];
  for (let i = 0; i < destZones.length; i++) {
    for (let j = i + 1; j < destZones.length; j++) {
      const a = getZoneEdges(destZones[i]);
      const b = getZoneEdges(destZones[j]);
      const overlapping = !(a.xRight <= b.xLeft || b.xRight <= a.xLeft || a.zFront <= b.zBack || b.zFront <= a.zBack);
      if (overlapping) {
        pairs.push({ zoneAId: destZones[i].objectId, zoneAName: destZones[i].name, zoneBId: destZones[j].objectId, zoneBName: destZones[j].name });
      }
    }
  }
  return { pass: pairs.length === 0, count: pairs.length, pairs };
};

const checkB4_neighborGaps = (sourceZoneMeta, destZones) => {
  const brokenPairs = [];
  const seen = new Set();

  sourceZoneMeta.forEach(srcMeta => {
    const { left = [], right = [], front = [], back = [] } = srcMeta.neighbors || {};
    const allNeighbors = [
      ...left.map(n => ({ dir: 'left', neighbor: n })),
      ...right.map(n => ({ dir: 'right', neighbor: n })),
      ...front.map(n => ({ dir: 'front', neighbor: n })),
      ...back.map(n => ({ dir: 'back', neighbor: n })),
    ];

    const destA = destZones.find(z => z.copiedUnitEntryId === srcMeta.objectId);
    if (!destA) return;

    allNeighbors.forEach(({ dir, neighbor }) => {
      const pairKey = [srcMeta.objectId, neighbor.objectId].sort().join('|');
      if (seen.has(pairKey)) return;
      seen.add(pairKey);

      const destB = destZones.find(z => z.copiedUnitEntryId === neighbor.objectId);
      if (!destB) return;

      const eA = getZoneEdges(destA);
      const eB = getZoneEdges(destB);
      const gapMap = { left: eB.xRight - eA.xLeft, right: eA.xRight - eB.xLeft, front: eA.zFront - eB.zBack, back: eB.zFront - eA.zBack };
      const gap = gapMap[dir];

      if (Math.abs(gap) > NEIGHBOR_TOLERANCE) {
        brokenPairs.push({ zoneAId: destA.objectId, zoneAName: destA.name, zoneBId: destB.objectId, zoneBName: destB.name, direction: dir, gapInDest: Math.round(gap) });
      }
    });
  });

  return { pass: brokenPairs.length === 0, brokenPairs };
};

const checkB5_moduleCount = (sourceRoom, destZones) => {
  const mismatches = [];
  destZones.forEach(destZone => {
    const srcZone = (sourceRoom.unitEntries || []).find(z => z.objectId === destZone.copiedUnitEntryId);
    if (!srcZone) return;
    const expected = (srcZone.miqModules || []).length;
    const actual   = (destZone.miqModules || []).length;
    if (expected !== actual) mismatches.push({ zoneObjectId: destZone.objectId, zoneName: destZone.name, expected, actual });
  });
  return { pass: mismatches.length === 0, mismatches };
};

// ─── C — Scaling ──────────────────────────────────────────────────────────────

const checkC1_scaleFactors = (sourceRoom, destRoom, intermediateData) => {
  const expectedScaleX = destRoom.breadth / sourceRoom.breadth;
  const expectedScaleY = destRoom.length  / sourceRoom.length;
  const actualScaleX   = intermediateData.scaleX;
  const actualScaleY   = intermediateData.scaleY;
  const errX = Math.abs(actualScaleX - expectedScaleX) / expectedScaleX;
  const errY = Math.abs(actualScaleY - expectedScaleY) / expectedScaleY;

  return {
    pass: errX < 0.01 && errY < 0.01,
    expectedScaleX: +expectedScaleX.toFixed(4), expectedScaleY: +expectedScaleY.toFixed(4),
    actualScaleX:   +actualScaleX.toFixed(4),   actualScaleY:   +actualScaleY.toFixed(4),
    errorXPct: +(errX * 100).toFixed(2),         errorYPct:      +(errY * 100).toFixed(2),
  };
};

const checkC3_cornerLoftSkipped = (sourceZoneMeta, apiStats) => {
  const shouldSkip  = sourceZoneMeta.filter(z => z.isLCornerZone || z.isLoftZone).map(z => z.objectId);
  const wronglyResized = (apiStats.autoResize?.resizedZoneIds || []).filter(id => shouldSkip.includes(id));
  return { pass: wronglyResized.length === 0, shouldBeSkipped: shouldSkip, wronglyResized };
};

const measureC2_resizeAccuracy = (sourceRoom, destZones, intermediateData) => {
  const perZone = [];
  destZones.forEach(destZone => {
    if (destZone.unitEntryType !== 'FITTED_FURNITURE') return;
    const srcZone = (sourceRoom.unitEntries || []).find(z => z.objectId === destZone.copiedUnitEntryId);
    if (!srcZone) return;

    const absRot = Math.round(Math.abs(destZone.rotation?.y ?? 0));
    const scale  = [90, 270].includes(absRot) ? intermediateData.scaleY : intermediateData.scaleX;
    const expectedWidth = srcZone.assets.width * scale;
    const actualWidth   = destZone.assets.width;
    const errorPct      = Math.abs(actualWidth - expectedWidth) / expectedWidth * 100;

    perZone.push({ zoneObjectId: destZone.objectId, zoneName: destZone.name, expectedWidth: Math.round(expectedWidth), actualWidth, errorPct: +errorPct.toFixed(2) });
  });

  const avgErrorPct = perZone.length ? +(perZone.reduce((s, z) => s + z.errorPct, 0) / perZone.length).toFixed(2) : 0;
  return { informational: true, avgErrorPct, perZone };
};

// ─── D — Wall Mapping ─────────────────────────────────────────────────────────

const checkD1_mappingCompleteness = (intermediateData) => {
  const mapping     = intermediateData?.payload?.sToDWallNameMapping || {};
  const nullMappings = Object.entries(mapping).filter(([, v]) => v === null).map(([k]) => k);
  return { pass: nullMappings.length === 0, nullMappings, totalWalls: Object.keys(mapping).length };
};

const measureD2_angleAlignment = (intermediateData, sourceProjectData, destProjectData) => {
  const mapping  = intermediateData?.payload?.sToDWallNameMapping || {};
  const srcWalls = Object.values(sourceProjectData?.floors?.[0]?.floorWalls || {});
  const dstWalls = Object.values(destProjectData?.floors?.[0]?.floorWalls  || {});
  const angle    = (w) => Math.atan2(w.endPoint.y - w.startPoint.y, w.endPoint.x - w.startPoint.x) * (180 / Math.PI);

  const perPair = Object.entries(mapping).map(([srcKey, dstKey]) => {
    const sw = srcWalls.find(w => w.key === srcKey);
    const dw = dstWalls.find(w => w.key === dstKey);
    if (!sw || !dw) return { srcKey, dstKey, angleDiff: null };
    const srcAngle = +angle(sw).toFixed(1);
    const dstAngle = +angle(dw).toFixed(1);
    return { srcKey, dstKey, srcAngle, dstAngle, angleDiff: +Math.abs(srcAngle - dstAngle).toFixed(1) };
  });

  return { informational: true, perPair };
};

// ─── E — Lights ───────────────────────────────────────────────────────────────

const checkE1_lightCount = (sourceRoom, destRoom) => {
  const expected = (sourceRoom.roomSettings?.lights || []).length;
  const actual   = (destRoom.roomSettings?.lights   || []).length;
  return { pass: expected === actual, expected, actual };
};

const checkE3_bloomExposure = (sourceRoom, destRoom) => {
  const mismatches = [];
  const fields = ['bloomStrength', 'exposure'];
  fields.forEach(f => {
    const e = sourceRoom.roomSettings?.[f];
    const a = destRoom.roomSettings?.[f];
    if (e !== a) mismatches.push({ field: f, expected: e, actual: a });
  });
  return { pass: mismatches.length === 0, mismatches };
};

const measureE2_lightPositionDrift = (sourceRoom, destRoom) => {
  const srcLights = sourceRoom.roomSettings?.lights || [];
  const dstLights = destRoom.roomSettings?.lights   || [];
  const sb = getRoomBounds(sourceRoom), db = getRoomBounds(destRoom);
  const sCx = (sb.xMin + sb.xMax) / 2, sCz = (sb.zMin + sb.zMax) / 2;
  const dCx = (db.xMin + db.xMax) / 2, dCz = (db.zMin + db.zMax) / 2;
  const sW = sb.xMax - sb.xMin, sL = sb.zMax - sb.zMin;
  const dW = db.xMax - db.xMin, dL = db.zMax - db.zMin;

  const perLight = srcLights.map((sl, i) => {
    const dl = dstLights[i];
    if (!dl) return null;
    return {
      index: i,
      driftX: +Math.abs((dl.lightPosition3D.x - dCx) / dW - (sl.lightPosition3D.x - sCx) / sW).toFixed(4),
      driftZ: +Math.abs((dl.lightPosition3D.z - dCz) / dL - (sl.lightPosition3D.z - sCz) / sL).toFixed(4),
    };
  }).filter(Boolean);

  const avgDrift = perLight.length ? +((perLight.reduce((s, l) => s + l.driftX + l.driftZ, 0)) / (perLight.length * 2)).toFixed(4) : 0;
  return { informational: true, avgDrift, perLight };
};

// ─── F — API Execution ────────────────────────────────────────────────────────

const evaluateApi = (apiStats) => ({
  copyRoomData: { pass: apiStats.copyRoomData?.status >= 200 && apiStats.copyRoomData?.status < 300, status: apiStats.copyRoomData?.status },
  autoResize:   { pass: (apiStats.autoResize?.failed ?? 0) === 0, ...apiStats.autoResize },
  transforms:   { pass: (apiStats.transforms?.failed ?? 0) === 0, ...apiStats.transforms },
  lights:       { pass: apiStats.lights?.status === 200 || apiStats.lights?.status === 'skipped', status: apiStats.lights?.status },
  latencyMs:    { informational: true, value: apiStats.latencyMs },
});

// ─── Main entry point ─────────────────────────────────────────────────────────

export const runEvaluation = ({ sourceRoom, destRoom, intermediateData, apiStats, sourceProjectData, destProjectData }) => {
  const destZones     = destRoom?.unitEntries || [];
  const sourceZoneMeta = intermediateData?.cornerWallsAllignedZones || [];

  return {
    placement: {
      inBounds:           checkA1_inBounds(destRoom, destZones),
      wallSnapAccuracy:   checkA2_wallSnapAccuracy(sourceZoneMeta, destZones, destRoom),
      cornerSnapAccuracy: checkA3_cornerSnapAccuracy(sourceZoneMeta, destZones, destRoom),
      positionDrift:      measureA4_positionDrift(sourceRoom, sourceZoneMeta, destZones, destRoom),
      moduleOutOfBounds:  checkA5_moduleOutOfBounds(destRoom, destZones),
    },
    integrity: {
      zoneCount:        checkB1_zoneCount(sourceRoom, destZones),
      typePreservation: checkB2_typePreservation(sourceRoom, destZones),
      overlaps:         checkB3_noOverlaps(destZones),
      neighborGaps:     checkB4_neighborGaps(sourceZoneMeta, destZones),
      moduleCount:      checkB5_moduleCount(sourceRoom, destZones),
    },
    scaling: {
      scaleFactors:       checkC1_scaleFactors(sourceRoom, destRoom, intermediateData),
      cornerLoftSkipped:  checkC3_cornerLoftSkipped(sourceZoneMeta, apiStats),
      zoneResizeAccuracy: measureC2_resizeAccuracy(sourceRoom, destZones, intermediateData),
    },
    wallMapping: {
      completeness:   checkD1_mappingCompleteness(intermediateData),
      angleAlignment: measureD2_angleAlignment(intermediateData, sourceProjectData, destProjectData),
    },
    lights: {
      countMatch:    checkE1_lightCount(sourceRoom, destRoom),
      bloomExposure: checkE3_bloomExposure(sourceRoom, destRoom),
      positionDrift: measureE2_lightPositionDrift(sourceRoom, destRoom),
    },
    api: evaluateApi(apiStats),
  };
};
