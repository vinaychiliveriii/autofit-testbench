const WALL_PROXIMITY_THRESHOLD = 100;
const TOLERANCE = {
  PROPS:250,
  FURNITURE_ZONE:100
}

export const calculateNewPosition = ({ sourceRoomDimension, targetRoomDimensions, zoneInfo, angle = 0 }) => {
  const { dimensions: zoneDimensions, wallTouch, cornerTouch, normalized_position: normalizedPosition, modules, zoneRotation } = zoneInfo;
  const isProp = Object.keys(modules).length === 0;
  const is90Or270degree = [90,270].some(angle => angle == Math.abs(zoneRotation));

  const { roomWidth: newWidth, roomLength: newLength, center: leftTop } = targetRoomDimensions;
  const newRoomXmin = leftTop.x;
  const newRoomXmax = leftTop.x + newWidth;
  const newRoomZmin = leftTop.z;
  const newRoomZmax = leftTop.z + newLength;

  const { width, length } = zoneDimensions;
  const { xNorm, yNorm, zNorm } = normalizedPosition;

  let xNew, yNew, zNew;
  const { x: leftTopX, z: leftTopZ } = leftTop;

  // Room center (absolute)
  const cx = leftTopX + newWidth / 2;
  const cz = leftTopZ + newLength / 2;

  // Current absolute position from normalized
  const px = cx + xNorm * newWidth;
  const pz = cz + zNorm * newLength;

  // Vector from center
  const dx = px - cx;
  const dz = pz - cz;
  if(angle === 0){
    xNew = px
    zNew = pz
    if(wallTouch){
      if(wallTouch == "left") xNew = newRoomXmin + length/2;
      if(wallTouch == "right") xNew = newRoomXmax - length/2;
      if(wallTouch == "front") zNew = newRoomZmax - length/2;
      if(wallTouch == "back") zNew = newRoomZmin + length/2;
    }
    if(cornerTouch.length>0){
      const corner = cornerTouch[0];
      const xShift = is90Or270degree?length:(isProp?width:0);
      const zShift = is90Or270degree?(isProp?width:0):length;
      //adjust the depth and width after resize and remove this logic from here.
      if(corner == "back-left") {
        xNew = newRoomXmin + xShift/2;
        zNew = newRoomZmin + zShift/2;
      }
      if(corner == "back-right"){
        xNew = newRoomXmax - xShift/2;
        zNew = newRoomZmin + zShift/2;
      }
      if(corner == "front-left"){
        xNew = newRoomXmin + xShift/2;
        zNew = newRoomZmax - zShift/2; 
      }
      if(corner == "front-right"){
        xNew = newRoomXmax - xShift/2;
        zNew = newRoomZmax - zShift/2;
      }
    }
  }else{
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    xNew = (leftTopX + newLength/2) - dx * cosA - dz * sinA;
    zNew = (leftTopZ + newWidth/2) + dx * sinA + dz * cosA;
  }
  yNew = yNorm;
  return { x: xNew, y: yNew, z: zNew };
};

export const calculateNewModulePosition = (normalizedPosition, roomDimensions, moduleDimensions, zonePosition, zoneDimensions, modulePosition) => {
  const { roomWidth: newWidth, roomLength: newLength, roomHeight: newHeight, center } = roomDimensions;
  let xNew, yNew, zNew;

  // Use the provided center point
  const { x: centerX, y: centerY, z: centerZ } = center;

  xNew = modulePosition.x;
  yNew = modulePosition.y;
  zNew = modulePosition.z;
  return { x: xNew, y: yNew, z: zNew };
};

export const getRelativeZonePositions = (roomDimensions, zones=[]) => {
  const { roomWidth, roomLength, roomHeight, center: pivot } = roomDimensions;
  const zonePositions = {};
  const cx = pivot.x + roomWidth / 2;
  const cz = pivot.z + roomLength / 2;
  zones.forEach(zone => {
    const { zoneName, modules, zoneRotation, objectId, wallTouch, cornerTouch, modulePropPositions } = zone;
    const { x, y, z } = zone.position;
    const { width, length, height } = zone.dimension;
    // Calculate relative position
    const xRel = x - cx;
    const yRel = y //- pivot.y; 
    const zRel = z - cz;

    // Normalize values based on room dimensions
    const xNorm = xRel / roomWidth;
    const yNorm = y//Rel / roomHeight;
    const zNorm = zRel / roomLength;

    // Store relative and normalized positions
    zonePositions[objectId] = {
      relative_position: { xRel, yRel, zRel },
      normalized_position: { xNorm, yNorm, zNorm },
      dimensions: { length, height, width },
      zoneRotation,
      objectId,
      wallTouch,
      cornerTouch,
      modules: getRelativePositionModule(roomDimensions, modules, zone.position, zone.dimension),
      zoneName,
      modulePropPositions
    };
  });

  return zonePositions;
}

function rotateArrayClockwise(arr, steps) {
  let len = arr.length;
  steps = ((steps % len) + len) % len;  
  return [...arr.slice(steps), ...arr.slice(0, len - steps)];
}

export function mapWallsWithRotation(sourceWalls, targetWalls, angle = 0) {
  // Compute angles for each wall
  let sourceAngles = sourceWalls.map(wall => ({
    name: wall.caption,
    key: wall.key,
    angle: calculateAngle(wall.startPoint.x, wall.startPoint.y, wall.endPoint.x, wall.endPoint.y)
  }));

  let targetAngles = targetWalls.map(wall => ({
    name: wall.caption,
    key: wall.key,
    angle: calculateAngle(wall.startPoint.x, wall.startPoint.y, wall.endPoint.x, wall.endPoint.y)
  }));

  const sortedSource = [...sourceAngles].sort((a, b) => a.angle - b.angle);
  const sortedTarget = [...targetAngles].sort((a, b) => a.angle - b.angle);

  // Compute rotation steps based on angle (90° = 1 step)
  const steps = (angle % 360) / 90;
  const rotatedTarget = rotateArrayClockwise(sortedTarget, steps);

  // Map source to rotated target
  const mapping = {};
  for (let i = 0; i < sortedSource.length; i++) {
    mapping[sortedSource[i].key] = rotatedTarget[i]?.key || null;
  }

  return mapping;
}


export function mapWalls(sourceWalls, targetWalls) {
  // Compute angles for each wall
  let sourceAngles = sourceWalls.map(wall => ({
    name: wall.caption,
    key: wall.key,
    angle: calculateAngle(wall.startPoint.x, wall.startPoint.y, wall.endPoint.x, wall.endPoint.y)
  }));

  let targetAngles = targetWalls.map(wall => ({
    name: wall.caption,
    key: wall.key,
    angle: calculateAngle(wall.startPoint.x, wall.startPoint.y, wall.endPoint.x, wall.endPoint.y)
  }));

  // Sort by angle
  sourceAngles.sort((a, b) => a.angle - b.angle);
  targetAngles.sort((a, b) => a.angle - b.angle);

  // Map source to target walls
  let mapping = {};
  for (let i = 0; i < sourceAngles.length; i++) {
    if(targetAngles[i]?.key){
      mapping = {...mapping, [sourceAngles[i].key] : targetAngles[i].key};
    }
  }

  return mapping;
}

export const identifyZoneWallAndCorner = (oldRoom, zones) => {
  if (!Object.keys(oldRoom).length || !zones.length) return;

  const { center: leftTop, roomLength, roomWidth } = oldRoom;
  const bounds = {
    xMin: leftTop.x,                 // Left wall
    xMax: leftTop.x + roomWidth,     // Right wall
    yMin: leftTop.z,                 // Back wall
    yMax: leftTop.z + roomLength,    // Front wall (reference left back bottom point)
  };

  const filteredZones = zones;
  return filteredZones.map(zone => processZone(zone, filteredZones, bounds));
};

const getRelativePositionModule = (roomDimensions, modules, zonePosition, zoneDimension) => {
  const { roomWidth, roomHeight, roomLength, center: pivot } = roomDimensions;
  const modulePositions = {};
  modules.forEach(module => {
    const { x, y, z } = module.position;
    const { bottomCenterZonePos, dimension, name, modelId, moduleId, moduleRotation, objectId } = module;
    const { width, length, height } = zoneDimension;
    // Calculate relative position of module within the zone
    const xRelModule = (x - zonePosition.x);
    const yRelModule = (y - zonePosition.y);
    const zRelModule = (z - zonePosition.z);

    const xNorm = xRelModule / width;
    const yNorm = yRelModule / length;
    const zNorm = zRelModule / height;

    modulePositions[objectId] = {
      relative_position: { xRel: xRelModule, yRel: yRelModule, zRel: zRelModule },
      normalized_position: { xNorm, yNorm, zNorm },
      dimension,
      name,
      modelId,
      moduleId,
      position: module.position,
      moduleRotation,
      objectId
    };
  });

  return modulePositions;
}

const calculateAngle = (x1, y1, x2, y2) => {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

const getZoneEdges = (zone) => {
  let { dimension, position, zoneRotation:rotation, zoneModuleMinPosition } = zone;
  const {length,width,height} = dimension;
  const {x,y,z} = position;
  let halfLength = width / 2;
  let halfDepth = length / 2;

  if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
    [halfLength, halfDepth] = [halfDepth, halfLength]; // Swap for rotated zones
  }

  return {
    left: x - halfLength,
    right: x + halfLength,
    front: z + halfDepth,
    back: z - halfDepth,
    top: Math.max(y,zoneModuleMinPosition) + height,
    bottom: y
  };
}

const findNeighbors = (zone, otherZones) => {
  let zoneA = zone;
  let edgesA = getZoneEdges(zoneA);
  let left = [], right = [], front = [], back = [], top = [], bottom = [], inside = [];

  for (let j = 0; j < otherZones.length; j++) {
    let zoneB = otherZones[j];
    const newTolerance  = zoneB.modules.length==0 ? TOLERANCE.PROPS : TOLERANCE.FURNITURE_ZONE;
    const edgesB = getZoneEdges(zoneB);
    if(zoneA==zoneB) continue;

    // Check for left neighbor
    if (Math.abs(edgesA.left - edgesB.right) <= newTolerance && 
        !(edgesA.front < edgesB.back || edgesA.back > edgesB.front) &&
        !(edgesA.top < edgesB.bottom || edgesA.bottom > edgesB.top)) {
      left.push(zoneB);
    }

    // Check for right neighbor
    if (Math.abs(edgesA.right - edgesB.left) <= newTolerance &&
        !(edgesA.front < edgesB.back || edgesA.back > edgesB.front) &&
        !(edgesA.top < edgesB.bottom || edgesA.bottom > edgesB.top)) {
      right.push(zoneB);
    }

    // Check for front neighbor
    if (Math.abs(edgesA.front - edgesB.back) <= newTolerance &&
        !(edgesA.right < edgesB.left || edgesA.left > edgesB.right) &&
        !(edgesA.top < edgesB.bottom || edgesA.bottom > edgesB.top)) {
      front.push(zoneB);
    }

    // Check for back neighbor
    if (Math.abs(edgesA.back - edgesB.front) <= newTolerance &&
        !(edgesA.right < edgesB.left || edgesA.left > edgesB.right) &&
        !(edgesA.top < edgesB.bottom || edgesA.bottom > edgesB.top)) {
      back.push(zoneB);
    }

    // Check for top neighbor
    if (Math.abs(edgesA.top - edgesB.bottom) <= newTolerance &&
        !(edgesA.right < edgesB.left || edgesA.left > edgesB.right) &&
        !(edgesA.front < edgesB.back || edgesA.back > edgesB.front)) {
      top.push(zoneB);
    }

    // Check for bottom neighbor
    if (Math.abs(edgesA.bottom - edgesB.top) <= newTolerance &&
        !(edgesA.right < edgesB.left || edgesA.left > edgesB.right) &&
        !(edgesA.front < edgesB.back || edgesA.back > edgesB.front)) {
      bottom.push(zoneB);
    }

    // Check if zoneB is inside zoneA
    if (edgesB.left >= edgesA.left && edgesB.right <= edgesA.right &&
        edgesB.front <= edgesA.front && edgesB.back >= edgesA.back &&
        edgesB.top <= edgesA.top && edgesB.bottom >= edgesA.bottom) {
      inside.push(zoneB);
    }
  }
  return { left, right, front, back, top, bottom, inside, zone: zoneA };
}

const getNeighborRelativePosition = ({propPosition, modulePosition}) => {
  return {
    x: propPosition.x - modulePosition.x,
    y: propPosition.y - modulePosition.y,
    z: propPosition.z - modulePosition.z
  }
}

const getPropPositions = (zoneNeighborData) => {
  const {top, bottom, inside, zone} = zoneNeighborData;
  const modulePositions = {};
  if (inside.length === 0 && top.length === 0 && bottom.length === 0 || (zone.modules.length === 0)) {
    return modulePositions;
  }

  const combinedNeighbors = [...top, ...bottom, ...inside].filter(zone => zone.modules!=undefined && zone.modules.length == 0);
  
  // For each module in the zone
  zone.modules.forEach(module => {
    // Convert module position from relative to absolute by adding zone position
    const absoluteModulePosition = {
      x: module.position.x + zone.position.x,
      y: module.position.y + zone.position.y,
      z: module.position.z + zone.position.z
    };
    const {width,length,height} = module.dimension;
    const moduleEdges = {
      left: absoluteModulePosition.x - (parseInt(width) / 2),
      right: absoluteModulePosition.x + (parseInt(width)/ 2),
      front: absoluteModulePosition.z + (parseInt(length) / 2),
      back: absoluteModulePosition.z - (parseInt(length) / 2),
      top: absoluteModulePosition.y + parseInt(height),
      bottom: absoluteModulePosition.y
    };

    // For each neighbor
    combinedNeighbors.forEach(neighbor => {
      const neighborEdges = getZoneEdges(neighbor);
      const propRelativePosition = getNeighborRelativePosition({propPosition:neighbor.position,modulePosition:absoluteModulePosition})
      
      // Check if neighbor is on top of this module
      if (Math.abs(neighborEdges.bottom - moduleEdges.top) <= 900 &&
          !(neighborEdges.right < moduleEdges.left || neighborEdges.left > moduleEdges.right) &&
          !(neighborEdges.front < moduleEdges.back || neighborEdges.back > moduleEdges.front)) {
        if (!modulePositions[module.name]) {
          modulePositions[module.name] = { top: [], bottom: [], inside: [] };
        }
        modulePositions[module.name].top.push({...neighbor,propRelativePosition});
      }

      // Check if neighbor is below this module
      if (Math.abs(neighborEdges.top - moduleEdges.bottom) <= 100 &&
          !(neighborEdges.right < moduleEdges.left || neighborEdges.left > moduleEdges.right) &&
          !(neighborEdges.front < moduleEdges.back || neighborEdges.back > moduleEdges.front)) {
        if (!modulePositions[module.name]) {
          modulePositions[module.name] = { top: [], bottom: [], inside: [] };
        }
        modulePositions[module.name].bottom.push({...neighbor,propRelativePosition});
      }

      // Check if neighbor is inside this module
      if (neighborEdges.left >= moduleEdges.left && neighborEdges.right <= moduleEdges.right &&
          neighborEdges.front <= moduleEdges.front && neighborEdges.back >= moduleEdges.back &&
          neighborEdges.top <= moduleEdges.top && neighborEdges.bottom >= moduleEdges.bottom) {
        if (!modulePositions[module.name]) {
          modulePositions[module.name] = { top: [], bottom: [], inside: [] };
        }
        modulePositions[module.name].inside.push({...neighbor,propRelativePosition});
      }
    });
  });

  return modulePositions;
}

const processZone = (zone, filteredZones, bounds) => {
  const { dimension, position, zoneRotation } = zone;
  const { width, length } = getRotatedDimensions(dimension, zoneRotation);

  const zoneEdges = {
    xLeft: position.x - width / 2,
    xRight: position.x + width / 2,
    yBottom: position.z - length / 2,
    yTop: position.z + length / 2,
  };

  const wallsTouched = detectWallTouches(zoneEdges, bounds);
  const cornerTouch = detectCornerTouches(wallsTouched);
  const isLCornerZone = hasCornerModules(zone.modules);
  const isLoftZone = hasLoftModules(zone.modules);
  const neighbors = findNeighbors(zone, filteredZones.filter(z => z.objectId !== zone.objectId));
  const propPositionInsideZone = getPropPositions(neighbors);

  return { ...zone, wallTouch: wallsTouched.length === 1 ? wallsTouched[0] : null, cornerTouch, neighbors, isLCornerZone, modulePropPositions: propPositionInsideZone, isLoftZone };
};

const getRotatedDimensions = (dimension, rotation) => {
  const absRotation = Math.abs(rotation);
  return [90, 270].includes(absRotation)
    ? { width: dimension.length, length: dimension.width }
    : { width: dimension.width, length: dimension.length };
};

const detectWallTouches = (zoneEdges, bounds) => {
  const { xLeft, xRight, yBottom, yTop } = zoneEdges;
  const { xMin, xMax, yMin, yMax } = bounds;

  return [
      Math.abs(xMin - xLeft) < WALL_PROXIMITY_THRESHOLD && "left",
      Math.abs(xMax - xRight) < WALL_PROXIMITY_THRESHOLD && "right",
      Math.abs(yMin - yBottom) < WALL_PROXIMITY_THRESHOLD && "back",
      Math.abs(yMax - yTop) < WALL_PROXIMITY_THRESHOLD && "front",
  ].filter(Boolean);
};

const detectCornerTouches = (wallsTouched) => {
  const cornerMap = {
    "back left": "back-left",
    "back right": "back-right",
    "front left": "front-left",
    "front right": "front-right",
    "back left right":"back-left",
    "back front left":"front-left",
    "front left right":"front-right",
    "back front right":"back-right",
    "back front left right":"back-left"
  };
  return cornerMap[wallsTouched.sort().join(" ")] ? [cornerMap[wallsTouched.sort().join(" ")]] : [];
};

const hasCornerModules = (modules) => {
  return modules.some(mod => (mod?.moduleName || mod?.name || "").toLowerCase().includes("corner"));
};
const hasLoftModules = (modules) => {
  return modules.some(mod => (mod?.moduleName || mod?.name || "").toLowerCase().includes("loft"));
};