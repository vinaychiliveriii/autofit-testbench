const ROOM_BASE = {
  category: 'RoomNode',
  isSuggested: 0,
  suggestedRoomType: 'null',
  isDoowUp: false,
  roomShape: 'Rect-0',
};

const ROOM_DEFAULTS = {
  Bedroom:    { fill: '#FFD6D4', loc: { x: 1737.90, y: 247.14, s: false } },
  Livingroom: { fill: '#FFF7EF', loc: { x: 125.36,  y: 262.56, s: false } },
  Kitchen:    { fill: '#FFF29C', loc: { x: 933.89,  y: 248.90, s: false } },
  Bathroom:   { fill: '#DEE0E6', loc: { x: 2419.76, y: 250.05, s: false } },
};

const THICKNESS = 100;
const T2 = THICKNESS / 2;

function genId() {
  return crypto.randomUUID().replace(/-/g, '');
}

function pt(x, y) {
  return { className: 'go.Point', x, y };
}

function buildWalls(locX, locY, breadth, length) {
  const TL = { x: locX * 20, y: locY * 20 };
  const TR = { x: (locX + breadth) * 20, y: locY * 20 };
  const BR = { x: (locX + breadth) * 20, y: (locY + length) * 20 };
  const BL = { x: locX * 20, y: (locY + length) * 20 };

  // Wall top (A): left → right along top edge
  const wallTop = {
    key: genId(),
    caption: 'wall A',
    category: 'WallGroup',
    wallType: 'BRICK',
    url: null,
    color: '#979797',
    length: Math.round(breadth * 20),
    wallHeight: 3000,
    width: null,
    thickness: THICKNESS,
    isGroup: true,
    isDivider: false,
    startPoint: pt(TL.x - T2, TL.y - T2),
    endPoint:   pt(TR.x + T2, TR.y - T2),
    smpt1: pt(TL.x,         TL.y),
    smpt2: pt(TL.x - THICKNESS, TL.y - THICKNESS),
    empt1: pt(TR.x,         TR.y),
    empt2: pt(TR.x + THICKNESS, TR.y - THICKNESS),
    minLocation: pt('NaN', '-9e9999'),
    maxLocation: pt('NaN', '9e9999'),
  };

  // Wall left (D): bottom → top along left edge
  const wallLeft = {
    key: genId(),
    caption: 'wall D',
    category: 'WallGroup',
    wallType: 'BRICK',
    url: null,
    color: '#979797',
    length: Math.round(length * 20),
    wallHeight: 3000,
    width: null,
    thickness: THICKNESS,
    isGroup: true,
    isDivider: false,
    startPoint: pt(BL.x - T2, BL.y + T2),
    endPoint:   pt(TL.x - T2, TL.y - T2),
    smpt1: pt(BL.x,         BL.y),
    smpt2: pt(BL.x - THICKNESS, BL.y + THICKNESS),
    empt1: pt(TL.x,         TL.y),
    empt2: pt(TL.x - THICKNESS, TL.y - THICKNESS),
    minLocation: pt('-9e9999', 'NaN'),
    maxLocation: pt('9e9999',  'NaN'),
  };

  // Wall bottom (C): right → left along bottom edge
  const wallBottom = {
    key: genId(),
    caption: 'wall C',
    category: 'WallGroup',
    wallType: 'BRICK',
    url: null,
    color: '#979797',
    length: Math.round(breadth * 20),
    wallHeight: 3000,
    width: null,
    thickness: THICKNESS,
    isGroup: true,
    isDivider: false,
    startPoint: pt(TR.x + T2, BL.y + T2),
    endPoint:   pt(TL.x - T2, BL.y + T2),
    smpt1: pt(TR.x,         BL.y),
    smpt2: pt(TR.x + THICKNESS, BL.y + THICKNESS),
    empt1: pt(TL.x,         BL.y),
    empt2: pt(TL.x - THICKNESS, BL.y + THICKNESS),
    minLocation: pt('NaN', '-9e9999'),
    maxLocation: pt('NaN', '9e9999'),
  };

  // Wall right (B): top → bottom along right edge
  const wallRight = {
    key: genId(),
    caption: 'wall B',
    category: 'WallGroup',
    wallType: 'BRICK',
    url: null,
    color: '#979797',
    length: Math.round(length * 20),
    wallHeight: 3000,
    width: null,
    thickness: THICKNESS,
    isGroup: true,
    isDivider: false,
    startPoint: pt(TR.x + T2, TL.y - T2),
    endPoint:   pt(BR.x + T2, BR.y + T2),
    smpt1: pt(TR.x,         TL.y),
    smpt2: pt(TR.x + THICKNESS, TL.y - THICKNESS),
    empt1: pt(BR.x,         BR.y),
    empt2: pt(BR.x + THICKNESS, BR.y + THICKNESS),
    minLocation: pt('-9e9999', 'NaN'),
    maxLocation: pt('9e9999',  'NaN'),
  };

  return [wallTop, wallLeft, wallBottom, wallRight];
}


// LOC_GAP=100 canvas units of clear space between walls
const LOC_GAP = 100;

/**
 * Compute a non-overlapping loc for the new room.
 * Places the new room to the right of all existing rooms on the same floor.
 */
function computeLoc(existingRooms, templateLoc) {
  if (!existingRooms || existingRooms.length === 0) {
    return { x: templateLoc.x, y: templateLoc.y };
  }

  let maxRight = -Infinity;
  let baseY = templateLoc.y;

  existingRooms.forEach((room) => {
    const locX   = room.loc?.x   ?? 0;
    const breadth = room.breadth ?? 0;
    const right  = locX + breadth;
    if (right > maxRight) maxRight = right;
    if (room.loc?.y !== undefined) baseY = Math.min(baseY, room.loc.y);
  });

  return { x: maxRight + LOC_GAP, y: baseY };
}

/**
 * Derive a unique name for the new room.
 * If a room of the same type already exists, append a counter starting at 2.
 */
function computeRoomName(roomType, existingRooms) {
  if (!existingRooms || existingRooms.length === 0) return roomType;
  const sameType = existingRooms.filter((r) => r.roomType === roomType);
  if (sameType.length === 0) return roomType;
  return `${roomType} ${sameType.length + 1}`;
}

/**
 * Build the walls API payload and room API payload for a rectangular room.
 * @param {string}   roomType      - e.g. "Bedroom", "Livingroom"
 * @param {number}   widthMm       - room width in mm
 * @param {number}   lengthMm      - room length in mm
 * @param {object[]} existingRooms - rooms already on the floor (from API)
 * @returns {{ wallsPayload: object[], roomPayload: object }}
 */
export function buildRoomPayload(roomType, widthMm, lengthMm, existingRooms = []) {
  const defaults = ROOM_DEFAULTS[roomType] ?? ROOM_DEFAULTS.Bedroom;

  const breadth = widthMm  / 20;   // mm → loc units
  const length  = lengthMm / 20;
  const area    = breadth * length;

  const loc  = computeLoc(existingRooms, defaults.loc);
  const name = computeRoomName(roomType, existingRooms);

  const walls         = buildWalls(loc.x, loc.y, breadth, length);
  const boundaryWalls = walls.map((w) => ({ direction: 1, key: w.key }));

  const roomId = genId();

  const roomPayload = {
    ...ROOM_BASE,
    fill:         defaults.fill,
    key:          roomId,
    id:           roomId,
    loc:          { ...defaults.loc, x: loc.x, y: loc.y },
    area,
    breadth,
    length,
    name,
    roomType,
    walls,
    boundaryWalls,
    unitEntries:  [],
    assets:       [],
    isSelected:   false,
    fixture:      { roomFixtures: {}, wallParts: { doors: {}, windows: {} } },
  };

  return { wallsPayload: walls, roomPayload };
}
