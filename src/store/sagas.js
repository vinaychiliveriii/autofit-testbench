import { call, delay, put, takeLatest } from 'redux-saga/effects';
import {
  FETCH_SOURCE_PROJECT,
  FETCH_SOURCE_PROJECT_SUCCESS,
  FETCH_SOURCE_PROJECT_FAILURE,
  FETCH_DEST_PROJECT,
  FETCH_DEST_PROJECT_SUCCESS,
  FETCH_DEST_PROJECT_FAILURE,
  CREATE_MODULE_UNITENTRIES,
  COPY_ZONES,
  CREATE_ROOM,
  CREATE_ROOM_SUCCESS,
  CREATE_ROOM_FAILURE,
} from './actions';
import { buildRoomPayload } from '../utils/roomBuilder';
import { apiRequest } from '../services/apiService';

const BASE_URL = 'https://sc-backend-production.homelane.com/api/v1.0/project/'

function* fetchSourceProjectSaga(action) {
  try {
    const sourceProjectDetails = yield call(apiRequest, `${BASE_URL}${action?.payload}`, "GET", '', false);
    yield put({ type: FETCH_SOURCE_PROJECT_SUCCESS, payload: sourceProjectDetails });
  } catch (error) {
    yield put({ type: FETCH_SOURCE_PROJECT_FAILURE, payload: error.message });
  }
}

function* fetchDestProjectSaga(action) {
  try {
    const destProjectDetails = yield call(apiRequest, `${BASE_URL}${action?.payload}`, "GET", '', false);
    yield put({ type: FETCH_DEST_PROJECT_SUCCESS, payload: destProjectDetails });
  } catch (error) {
    yield put({ type: FETCH_DEST_PROJECT_FAILURE, payload: error.message });
  }
}

function isCornerOrLoftZone (zoneMetaData){
  return (zoneMetaData?.isLCornerZone || zoneMetaData?.isLoftZone);
}

const getUpdatedZoneMetaData = (cornerWallsAllignedData,zones) =>{
  const updatedMetaData = [];
  for(let i=0;i<zones.length;i++){
    const zoneMeta = cornerWallsAllignedData.find(zoneMeta => zoneMeta.objectId===zones[i].copiedUnitEntryId);
    updatedMetaData.push({...zoneMeta,objectId:zones[i].objectId});
  }
  return updatedMetaData;
}

function zoneExtremes(zone){
  const {rotation, assets, position} = zone;
  let zoneRotation = rotation.y;
  // let position = position || {x: parseFloat(assets.location.split(' ')[0]), z: parseFloat(assets.location.split(' ')[1])}
  const zoneWidth = assets.width ;
  const zoneLength = assets.length;
  const absRotation = Math.abs(zoneRotation);
  const width = [90,270].some(angle=> angle == absRotation)?zoneLength:zoneWidth;
  const length = [90,270].some(angle=> angle == absRotation)?zoneWidth:zoneLength;
  let xLeft = position.x - width / 2;//zone left
  let xRight = position.x + width / 2;//zone right
  let yBottom = position.z - length / 2;//
  let yTop = position.z + length / 2;
  return {xLeft,xRight,yBottom,yTop}
}

function readjustZones(zonesMetaData, zoneData, scaleX, scaleZ, angle) {
  try{
    if (Object.keys(zoneData).length === 0 || zonesMetaData.length === 0) return {};

    const zoneMap = zonesMetaData.reduce((map, zoneMeta) => {
      map[zoneMeta.zoneName] = false;
      return map;
    }, {});

    let updateZoneData = {};
    const allZones = Object.values(zoneData);

    const zoneQueue = [];
    const filteredZoneMeta = zonesMetaData.filter(z => z.modules.length > 0);
    const lCornerZones = filteredZoneMeta.filter(zoneMeta => zoneMeta.isLCornerZone);
    const cornerZones = filteredZoneMeta.filter(zoneMeta => !zoneMeta.isLCornerZone && zoneMeta.cornerTouch.length > 0);
    const remainingZones = filteredZoneMeta.filter(zoneMeta => !zoneMeta.isLCornerZone && zoneMeta.cornerTouch.length === 0);

    if (lCornerZones.length > 0) {
      zoneQueue.push(...lCornerZones);
      lCornerZones.forEach(zone => zoneMap[zone.zoneName] = true);
      remainingZones.push(...cornerZones);
    }

    if (zoneQueue.length === 0 && cornerZones.length > 0) {
      // if(scaleX>=1) {
      //   cornerZones.forEach(zone => zoneMap[zone.zoneName] = true);
      //   zoneQueue.push(...cornerZones);
      // }else{
      zoneMap[cornerZones[0].zoneName] = true;
      zoneQueue.push(cornerZones[0]);
      // }
    }

    const adjustZonePosition = (actualZone, offsetX, offsetZ) => {
      updateZoneData[actualZone.name] = {
        position: {
          ...actualZone.position,
          x: actualZone.position.x + offsetX,
          z: actualZone.position.z + offsetZ,
        },
        scale: { ...actualZone.scale },
        rotation: { ...actualZone.rotation },
        objectId: actualZone.objectId,
      };
    };
    const processPropInsideZones = ({ modulePropPositions, zone }) => {
      const { position, miqModules } = zone;

      // Iterate over each module in modulePropPositions
      Object.keys(modulePropPositions).forEach(moduleName => {
        const moduleData = modulePropPositions[moduleName]; // Get the module data
        const module = miqModules.find(m => m.moduleName === moduleName); // Find the corresponding module in miqModules

        if (module) {
          const modulePosition = {
            x: module.position_x + zone.position.x,
            y: module.position_y + zone.position.y,
            z: module.position_z + zone.position.z
          };

          // Iterate over top, bottom, and inside arrays
          ['top', 'bottom', 'inside'].forEach(prop => {
            moduleData[prop].forEach(neighbor => {
              if (!zoneMap[neighbor.zoneName]) {
                zoneMap[neighbor.zoneName] = true;
                const actualZone = allZones.find(zD => zD.name === neighbor.zoneName);
                neighbor.position = {
                  x: modulePosition.x + neighbor.propRelativePosition.x,
                  y: modulePosition.y + neighbor.propRelativePosition.y,
                  z: modulePosition.z + neighbor.propRelativePosition.z
                };
                updateZoneData[actualZone.name] = {
                  position: neighbor.position,
                  scale: { ...actualZone.scale },
                  rotation: { ...actualZone.rotation },
                  objectId: actualZone.objectId,
                };
              }
            });
          });
        }
      });
    }
    const processNeighbor = (neighbors, positionKey, zoneValue, neighborValue) => {
      neighbors.forEach((z) => {
        const actualZone = allZones.find(zD => zD.name === z.zoneName);
        if (actualZone && !zoneMap[actualZone.name]) {
          zoneMap[actualZone.name] = true;
          const zoneExt = zoneExtremes(actualZone);
          const offset = zoneValue - zoneExt[neighborValue];

          adjustZonePosition(actualZone, positionKey === "x" ? offset : 0, positionKey === "z" ? offset : 0);
          const newZoneMetaData = filteredZoneMeta.find(meta => meta.zoneName === actualZone.name); // Add to queue
          if (newZoneMetaData) zoneQueue.push(newZoneMetaData);
        }
      });
    };

    // BFS traversal to process all connected zones
    while (true) {
      while (zoneQueue.length > 0) {
        const currentZoneMeta = zoneQueue.shift(); // Pick a zone from queue
        const currentZone = allZones.find(zD => zD.objectId === currentZoneMeta.objectId); //change to zoneid
        if (!currentZone) continue;

        const { left, right, front, back } = currentZoneMeta.neighbors;
        const { modulePropPositions } = currentZoneMeta;
        const cZoneUpdatedPosition = updateZoneData[currentZoneMeta.zoneName]?.position || null;
        if (cZoneUpdatedPosition) currentZone.position = cZoneUpdatedPosition;
        const { xLeft, xRight, yBottom, yTop } = zoneExtremes(currentZone);

        processNeighbor(left, "x", xLeft, "xRight");
        processNeighbor(right, "x", xRight, "xLeft");
        processNeighbor(front, "z", yTop, "yBottom");
        processNeighbor(back, "z", yBottom, "yTop");
        processPropInsideZones({ modulePropPositions, zone: currentZone })
      }

      // Check for unvisited zones and start BFS again if needed
      const unvisitedZone = filteredZoneMeta.find(zone => !zoneMap[zone.zoneName]);
      if (unvisitedZone) {
        zoneMap[unvisitedZone.zoneName] = true;
        zoneQueue.push(unvisitedZone);
      } else {
        break; // Exit loop when all zones are processed
      }
    }

    return updateZoneData;
  }catch(e){
    console.log(e);
  }
}


function* copyRoomData(action){
  const startTime = Date.now();
  const apiStats = {
    copyRoomData: { status: null },
    autoResize:   { total: 0, success: 0, failed: 0, skipped: 0, resizedZoneIds: [] },
    transforms:   { total: 0, success: 0, failed: 0 },
    lights:       { status: null },
    latencyMs:    0,
  };

  try{
      const {payload, projectDetails, objectId, scaleX, scaleY, assetDetails, cornerWallsAllignedZones, lightsPayload, keyIndex, angle} = action.data;
      const cornerWallsAllignedData = cornerWallsAllignedZones;
      const { projectId, floorId, roomId } = projectDetails;

      // Step 1 — copy room data
      let result;
      try {
        result = yield call(apiRequest, `${BASE_URL}${projectId}/floors/${floorId}/room/${roomId}/copyRoomData`, "PUT", [payload]);
        apiStats.copyRoomData.status = 200;
      } catch(e) {
        apiStats.copyRoomData.status = e?.status || 500;
        throw e;
      }

      // Step 2 — autoResize + corner transforms
      const updatedZoneMetaDataArray = getUpdatedZoneMetaData(cornerWallsAllignedData,result[0]?.unitEntries);
      for(let i=0; i < result[0]?.unitEntries?.length; i++){
        try {
            let zone = result[0]?.unitEntries[i];
            if(zone?.unitEntryType === 'FITTED_FURNITURE'){
                const zoneMetaData = updatedZoneMetaDataArray.find(zoneMeta=>zoneMeta.objectId ==zone.objectId); //update with zone objectid
                const zoneAbsRotation = Math.round(Math.abs(zone.rotation.y))
                let scaleZoneWidth = [0, 180].includes(zoneAbsRotation) ? parseInt(zone.assets.width * scaleX) : [90, 270].includes(zoneAbsRotation) ? parseInt(zone.assets.width * scaleY) : parseInt(zone.assets.width);
                let presetResizeRequest = {
                    resizeWidth:Math.round( Number((scaleZoneWidth - zone.assets.width).toFixed(2)) /50) * 50 ,
                    resizeDepth: 0
                }
                let resizedResult = {}
                if( presetResizeRequest.resizeWidth && !isCornerOrLoftZone(zoneMetaData)){
                  apiStats.autoResize.total++;
                  try {
                    resizedResult = yield call(apiRequest, `${BASE_URL}${projectId}/floor/${floorId}/room/${result[0].id}/unitEntry/${zone.objectId}/autoResize`, "PUT", presetResizeRequest);
                    apiStats.autoResize.success++;
                    apiStats.autoResize.resizedZoneIds.push(zone.objectId);
                  } catch(resizeErr) {
                    apiStats.autoResize.failed++;
                  }
                } else {
                  apiStats.autoResize.skipped++;
                }
                if(zoneMetaData?.cornerTouch?.length>0 && angle === 0){
                    const is90Or270degree = [90,270].some(angle => angle == zoneAbsRotation);

                    let differenceWidth =  (resizedResult?.widthAfterResize??zone.assets.width)/2;
                    let zonePosition = zone.position;
                    if(zoneMetaData.cornerTouch.length>0 && angle === 0){
                      const corner = zoneMetaData.cornerTouch[0];
                      const xShift = is90Or270degree?0:differenceWidth;
                      const zShift = is90Or270degree?differenceWidth:0;
                      if(corner == "back-left") {
                        zone.position.x += xShift;
                        zone.position.z += zShift;
                      }
                      if(corner == "back-right"){
                        zone.position.x -= xShift;
                        zone.position.z += zShift;
                      }
                      if(corner == "front-left"){
                        zone.position.x += xShift;
                        zone.position.z -= zShift;
                      }
                      if(corner == "front-right"){
                        zone.position.x -= xShift;
                        zone.position.z -= zShift;
                      }
                    }
                    let transformPositions = {
                            "position": zonePosition,
                            "scale": { ...zone.scale },
                            "rotation": { ...zone.rotation },
                          }
                    apiStats.transforms.total++;
                    try {
                      yield call(apiRequest, `${BASE_URL}${projectId}/floors/${floorId}/rooms/${roomId}/unitEntries/${zone.objectId}/transform`, 'PUT', transformPositions);
                      apiStats.transforms.success++;
                    } catch(tErr) {
                      apiStats.transforms.failed++;
                      console.log(tErr);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to process unit entry at index ${i}:`, error);
            continue;
        }
      }

      yield delay(500)
      const projectData = yield call(apiRequest, `${BASE_URL}${projectId}`, "GET");

          if(angle === 0){
            const currentFloor = projectData?.floors.find((i) => (i.id === floorId)) || result.floors[0];
            const targetRoom = currentFloor
            ? currentFloor.rooms.find((i) => i.id === result[0].id) || {}
            : {};
            const fittedFurniture = targetRoom?.unitEntries
            const readjustedZones = readjustZones(updatedZoneMetaDataArray,fittedFurniture,scaleX,scaleY,angle);
            console.log('readjustedZones', readjustedZones);
            if(readjustedZones && Object.keys(readjustedZones)?.length > 0){
                for(let i=0; i < Object.values(readjustedZones)?.length; i++){
                    let reZn = Object.values(readjustedZones)?.[i];
                    apiStats.transforms.total++;
                    try {
                      yield call(apiRequest, `${BASE_URL}${projectId}/floors/${floorId}/rooms/${roomId}/unitEntries/${reZn.objectId}/transform`, 'PUT', reZn);
                      apiStats.transforms.success++;
                    } catch(tErr) {
                      apiStats.transforms.failed++;
                      console.log(tErr);
                    }
                }
            }
          }

      yield delay(1500)

      if(keyIndex === 0 && lightsPayload?.lights?.length > 0){
        try {
          yield call(apiRequest, `${BASE_URL}${projectId}/floors/${floorId}/rooms/${roomId}/settings/lights`, "PUT", lightsPayload);
          apiStats.lights.status = 200;
        } catch(lErr) {
          apiStats.lights.status = lErr?.status || 500;
        }
      } else {
        apiStats.lights.status = 'skipped';
      }

      // Final GET — captures the definitive state after all transforms
      const finalProjectData = yield call(apiRequest, `${BASE_URL}${projectId}`, "GET");
      const finalFloor = finalProjectData?.floors?.find((f) => f.id === floorId);
      const finalDestRoom = finalFloor ? finalFloor.rooms?.find((r) => r.id === result[0].id) || {} : {};

      apiStats.latencyMs = Date.now() - startTime;
      if (action?.meta?.resolve) action?.meta.resolve({ destRoom: finalDestRoom, apiStats });
  }catch(e){
    console.log(e);
    apiStats.latencyMs = Date.now() - startTime;
    if (action?.meta?.reject) action?.meta.reject(e);
  }
}

function* rotateZone(action){
  try{
      const {transformPositions, projectDetails, objectId} = action.data;
      const { projectId, floorId, roomId } = projectDetails;
      yield call(apiRequest,`${BASE_URL}${projectId}/floors/${floorId}/rooms/${roomId}/unitEntries/${objectId}/transform`,'PUT',transformPositions);
  }catch(e){
    console.log(e)
  }
}

function* createRoomSaga(action) {
  try {
    const { projectId, floorId, roomType, widthMm, lengthMm, floorRooms } = action.data;
    const { wallsPayload, roomPayload } = buildRoomPayload(roomType, widthMm, lengthMm, floorRooms);

    // Step 1 — create walls
    yield call(
      apiRequest,
      `${BASE_URL}${projectId}/floor/${floorId}/walls`,
      'POST',
      wallsPayload
    );

    // Step 2 — create room (with those walls embedded)
    yield call(
      apiRequest,
      `${BASE_URL}${projectId}/floors/${floorId}/room`,
      'POST',
      roomPayload
    );

    yield put({ type: CREATE_ROOM_SUCCESS });
    if (action?.meta?.resolve) action.meta.resolve();
  } catch (e) {
    yield put({ type: CREATE_ROOM_FAILURE, payload: e?.message || 'Room creation failed' });
    if (action?.meta?.reject) action.meta.reject(e);
  }
}

export default function* rootSaga() {
  yield takeLatest(FETCH_SOURCE_PROJECT, fetchSourceProjectSaga);
  yield takeLatest(FETCH_DEST_PROJECT, fetchDestProjectSaga);

  // autofit
  yield takeLatest(CREATE_MODULE_UNITENTRIES, rotateZone);
  yield takeLatest(COPY_ZONES, copyRoomData);
  yield takeLatest(CREATE_ROOM, createRoomSaga);
}
