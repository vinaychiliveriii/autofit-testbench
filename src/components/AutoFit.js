import { calculateNewModulePosition, calculateNewPosition, getRelativeZonePositions, identifyZoneWallAndCorner, mapWalls, mapWallsWithRotation } from "./AutoFitAlgorithm";

export const getRelativePositionsWrapper = (sourceRoomData, targetRoomData, sourceProjectData, destinationProjectData, angle = 0) => {
  const floorData = destinationProjectData?.floors?.[0];
  const sourceProjectRoomWalls = Object.values(sourceProjectData?.floors?.[0]?.floorWalls); 
  const targetProjectRoomWalls = Object.values(destinationProjectData?.floors?.[0]?.floorWalls);
  let sourceRoomDimension = {};
  let targetRoomDimension = {};
  let projectDetails ={};
  let zoneData = [];
  let assetDetails = [];
  let wallMapping = {};

    let asset = [];

    let sourceRoomNode = sourceRoomData;
    sourceRoomDimension = {
      center: { x: sourceRoomNode.loc.x * 20, y: 1500, z: sourceRoomNode.loc.y * 20 },
      roomWidth: sourceRoomNode.breadth * 20,
      roomHeight: 3000,
      roomLength: sourceRoomNode.length * 20,
      roomId: sourceRoomNode.id,
    };

    let sourceProjectDetails = {
      roomId: sourceRoomNode.id,
      floorId: sourceProjectData?.floors?.[0]?.id,
      projectId: sourceProjectData?.floors?.[0]?.projectId
    }

    const sourceRoomWalls = (sourceRoomNode?.boundaryWalls || []).map(wall => sourceProjectRoomWalls.find(wallItem => wallItem.key === wall.key)).filter(Boolean);

    let targetRoomNode = targetRoomData;
    let roomId = targetRoomNode.id;
    projectDetails = {
      roomId,
      floorId: floorData.id,
      projectId: floorData.projectId
    };
    
    targetRoomDimension = {
      center: { x: targetRoomNode.loc.x * 20, y: 1500, z: targetRoomNode.loc.y * 20 },
      roomWidth: [90, 270].includes(angle) ? targetRoomNode.length * 20 : targetRoomNode.breadth * 20,
      roomHeight: 3000,
      roomLength:[90, 270].includes(angle) ? targetRoomNode.breadth * 20 : targetRoomNode.length * 20,
      roomId: targetRoomNode.id
    };

    const targetRoomWalls = (targetRoomNode?.boundaryWalls || []).map(wall => targetProjectRoomWalls.find(wallItem => wallItem.key === wall.key)).filter(Boolean);
    console.log('sourceRoomWalls,targetRoomWalls', sourceRoomWalls, targetRoomWalls);
    
    if(angle !== 0){
      wallMapping = mapWallsWithRotation(sourceRoomWalls, targetRoomWalls, angle);
    }else{
      wallMapping = mapWalls(sourceRoomWalls, targetRoomWalls);
    }

    const lightsAlignment = alignLightsToNewRoom(sourceRoomDimension, targetRoomDimension, sourceRoomNode?.roomSettings?.lights || []);
    const lightsPayload = {
      bloomStrength: sourceRoomNode?.roomSettings?.bloomStrength || 0,
      exposure: sourceRoomNode?.roomSettings?.exposure || 0,
      lights: lightsAlignment,
      wallLights: sourceRoomNode?.roomSettings?.wallLights || [],
    }
    
    let assetNodes = sourceRoomNode?.unitEntries;
    zoneData = assetNodes;
    assetNodes?.map(item => {
      let allModuleIds = [];
      let modulesData = [];
      if (item?.unitEntryType === 'FITTED_FURNITURE' || item?.unitEntryType === 'DUMMY_MODEL') {
        let maxZoneHeight = 0;
        let zoneMinPosition = item.miqModules.length == 0 ? item.position.y : item.miqModules[0].position_y;
        
        item.miqModules.forEach((module, i) => {
          let moduleDimension = module.dimension.split(' X ');
          allModuleIds.push({ moduleId: module.moduleId, dimension: module.dimension });
          
          maxZoneHeight = Math.max(maxZoneHeight,module.position_y+parseInt(moduleDimension[2]));
          zoneMinPosition = Math.min(maxZoneHeight,module.position_y)
          
          modulesData.push({
            'name': module.moduleName,
            'dimension': { width: moduleDimension[0], length: moduleDimension[1], height: moduleDimension[2] },
            'position': { x: module.position_x, y: module.position_y, z: module.position_z },
            'objectId': module.objectId,
            'modelId': module.modelId,
            'moduleId': module.moduleId,
            'moduleRotation': { x: module.orientation_x, y: module.orientation_y, z: module.orientation_z }
          });
        });
        
        const allModulePositions = modulesData.length>0?modulesData.map(data=>data.position):[];
        const medianYValue = allModulePositions.length>0?medianY(allModulePositions):item.position.y //median value to add have correct zone position
        
        asset.push({
          'zoneName': item.name,
          'objectId': item.objectId,
          'zoneModuleMinPosition' : medianYValue,
          'position': { x: item.position.x, y: item.position.y, z: item.position.z },
          'dimension': { width: item.assets.width, height: Math.min(maxZoneHeight,item.assets.height), length: item.assets.length },     
          'zoneRotation': item.rotation.y + angle,
          'modules': modulesData,
        });
        
        // if(item?.unitEntryType === 'FITTED_FURNITURE'){
        //   dispatch(fetchModuleData({
        //     categoryId: item.categoryId,
        //     subCategoryId: item.subCategoryId,
        //     moduleIds: allModuleIds,
        //     objectId: item.objectId,
        //     unitEntryData: assetNodes, 
        //     type: sourceRoomNode.roomType,
        //     isDoowUp: sourceRoomNode.isDoowUp,
        //     zoneId: item.zoneId,
        //     projectData,
        //   }));
        // }
      }
    });
    assetDetails = asset;

    if (assetDetails && sourceRoomDimension && targetRoomDimension && projectDetails) {
      const data = identifyZoneWallAndCorner(sourceRoomDimension, assetDetails) || [];
      console.log('Zone Data', data)
      
      const resultantNormalizedZoneValues = getRelativeZonePositions(sourceRoomDimension, data);
      console.log('assetDetails', assetDetails, resultantNormalizedZoneValues)
      
      let adjustedZones = placeZonesWithPivot(resultantNormalizedZoneValues, sourceRoomDimension, targetRoomDimension, "center", angle);
      console.log('adjustedZones', adjustedZones);
      
     // inter changing length and width for scaling when angle is 90/270
      const scaleX = [90, 270].includes(angle) ? targetRoomDimension.roomLength / sourceRoomDimension.roomWidth :  targetRoomDimension.roomWidth / sourceRoomDimension.roomWidth;
      const scaleY = [90, 270].includes(angle) ? targetRoomDimension.roomWidth / sourceRoomDimension.roomLength :  targetRoomDimension.roomLength / sourceRoomDimension.roomLength;
      const scaleZ = targetRoomDimension.roomHeight / sourceRoomDimension.roomHeight;

      const cornerWallsAllignedZones = data;

      let unitEntryDataList = {};
      for (const [name, info] of Object.entries(adjustedZones)) {
        let customZoneData = {}
        let zoneDimensions = {};
        let zone = zoneData?.filter(zone => zone.objectId === info.objectId)?.[0];
        let miqModulesData = {};
        unitEntryDataList = {
          ...unitEntryDataList,
          [zone.objectId]: {
              assets:{
                ...zone.assets, 
                "angle": parseInt(zone.assets.rotationAngle) + angle,
                "width": info.dimensions.width,
                "height": info.dimensions.height,
                "length": info.dimensions.length,
                "location": info.adjusted_position.x + ' ' + info.adjusted_position.z
              },
              "position": {
                "x": info.adjusted_position.x,
                "y": info.adjusted_position.y,
                "z": info.adjusted_position.z
              },
              "rotation": {
                "x": 0,
                "y": zone.rotation.y - angle,
                "z": 0
              },
              "scale": zone.scale,
              miqModulesData: {}
          }
        }
        customZoneData = {
          "zoneType": zone.zoneType,
          "zoneName": zone.zoneType + new Date().getTime(),
          "categoryId": zone?.categoryId,
          "subCategoryId": zone?.subCategoryId,
          "categoryName": zone.categoryName,
          "subCategoryName": zone.subCategoryName,
          "position": {
            "x": info.adjusted_position.x,
            "y": info.adjusted_position.y,
            "z": info.adjusted_position.z
          },
          "rotation": {
            "x": 0,
            "y": (1) * info.zoneRotation,
            "z": 0
          },
        }
        zoneDimensions = {
          "width": info.dimensions.width,
          "height": info.dimensions.height,
          "length": info.dimensions.length,
        }
        
        info.modules?.map(module => {
          let scaledWidth = [0, 180].includes(Math.abs(info.zoneRotation)) ? parseInt(module.dimension.width * scaleX) : [90, 270].includes(Math.abs(info.zoneRotation)) ? parseInt(module.dimension.width * scaleY) : parseInt(module.dimension.width);
          miqModulesData = {
            ...miqModulesData,
            [module.objectId] : {
              "orientation_x": module.moduleRotation.x,
              "orientation_y": module.moduleRotation.y,
              "orientation_z": module.moduleRotation.z,
              "position_x": module.adjusted_position.x,
              "position_y": module.adjusted_position.y,
              "position_z": module.adjusted_position.z,
              // "scale": {
              //   "x": 0.0,
              //   "y": 0.0,
              //   "z": 0.0
              // },
              "dimension": module.dimension.width + " X " + module.dimension.length + " X " + module.dimension.height
            }
          } 
        })
        unitEntryDataList = {
          ...unitEntryDataList, 
          [zone.objectId] : {
            ...unitEntryDataList[zone.objectId], 
            'miqModulesData':{
              ...unitEntryDataList[zone.objectId][miqModulesData],
              ...miqModulesData
            }
          }
        }
     }
      let payload = {
        "sourceProjectId": sourceProjectDetails?.projectId,
        "sourceRoomId": sourceRoomDimension?.roomId,
        "sourceFloorId": sourceProjectDetails?.floorId,
        "sToDWallNameMapping": {
          ...wallMapping
        },
        "unitEntryData": {...unitEntryDataList}
      }

      return {
        payload,
        projectDetails,
        objectId: targetRoomDimension?.roomId,
        scaleX,
        scaleY,
        assetDetails,
        cornerWallsAllignedZones,
        lightsPayload,
        angle
      };
    }
};


export const alignLightsToNewRoom = (originalRoom, newRoom, originalLights) => {
  const { center: origTop, roomWidth: origWidth, roomLength: origLength } = originalRoom;
  const { center: newTop, roomWidth: newWidth, roomLength: newLength } = newRoom;

  const alignedLights = originalLights.map(light => {
    const origX = light.lightPosition3D.x;
    const origZ = light.lightPosition3D.z;

    // Calculate relative position (0–1) within original room
    const relativeX = (origX - origTop.x) / origWidth;
    const relativeZ = (origZ - origTop.z) / origLength;

    // Apply same relative position to new room
    const newX = newTop.x + relativeX * newWidth;
    const newZ = newTop.z + relativeZ * newLength;

    // Return transformed light
    return {
      ...light,
      lightPosition3D: {
        ...light.lightPosition3D,
        x: newX,
        z: newZ,
      }
    };
  });

  return alignedLights;
}


const medianY = (points) => {
  if (!points || points.length === 0) return null;

  // Extract y values
  const ys = points.map(p => p.y);

  // Sort
  ys.sort((a, b) => a - b);

  const n = ys.length;
  const mid = Math.floor(n / 2);

  if (n % 2 === 0) {
    // even
    return (ys[mid - 1] + ys[mid]) / 2;
  } else {
    // odd
    return ys[mid];
  }
}


const placeZonesWithPivot = (sampleData, sourceRoomDimension, newRoomDimensions, pivotPoint = "center", angle = 0) =>{
    const placedZones = {};

  for (const [objectId, zoneInfo] of Object.entries(sampleData)) {
    const {dimensions: zoneDimensions, modules, zoneRotation,zoneName } = zoneInfo;
    const { x, y, z } = calculateNewPosition({sourceRoomDimension, targetRoomDimensions:newRoomDimensions,zoneInfo, angle});

    // Calculate new positions for all modules in the zone
    const adjustedModules = Object.values(modules).map(module => {
      const moduleNormalizedPosition = module.normalized_position; // Assuming normalized_position is available
      const modulePosition = module.position;
      return {
        name: module.name,
        adjusted_position: calculateNewModulePosition(moduleNormalizedPosition, newRoomDimensions, module.dimension, { x, y, z }, zoneDimensions, module.position),
        dimension: module.dimension,
        modelId: module.modelId,
        moduleId: module.moduleId,
        moduleRotation: module.moduleRotation,
        objectId: module.objectId,
        normalized_position: moduleNormalizedPosition,
      };
    });

    placedZones[objectId] = {
      adjusted_position: { x, y, z },
      dimensions: zoneDimensions,
      zoneRotation,
      objectId,
      zoneName,
      modules: adjustedModules // Include adjusted module positions
    };
  }

  return placedZones;
}