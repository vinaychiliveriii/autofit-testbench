export const FETCH_SOURCE_PROJECT = 'FETCH_SOURCE_PROJECT';
export const FETCH_SOURCE_PROJECT_SUCCESS = 'FETCH_SOURCE_PROJECT_SUCCESS';
export const FETCH_SOURCE_PROJECT_FAILURE = 'FETCH_SOURCE_PROJECT_FAILURE';

export const FETCH_DEST_PROJECT = 'FETCH_DEST_PROJECT';
export const FETCH_DEST_PROJECT_SUCCESS = 'FETCH_DEST_PROJECT_SUCCESS';
export const FETCH_DEST_PROJECT_FAILURE = 'FETCH_DEST_PROJECT_FAILURE';

export const SELECT_ROOM = 'SELECT_ROOM';
export const SELECT_DEST_ROOM = 'SELECT_DEST_ROOM';

export const COPY_ZONES = 'COPY_ZONES';
export const CREATE_MODULE_UNITENTRIES = 'CREATE_MODULE_UNITENTRIES';

export const fetchSourceProject = (projectId) => ({
  type: FETCH_SOURCE_PROJECT,
  payload: projectId,
});

export const fetchDestProject = (projectId) => ({
  type: FETCH_DEST_PROJECT,
  payload: projectId,
});

export const selectRoom = (roomDetails) => ({
  type: SELECT_ROOM,
  payload: roomDetails,
});

export const selectDestRoom = (roomDetails) => ({
  type: SELECT_DEST_ROOM,
  payload: roomDetails,
});

export const copyZones = (data, meta) => ({
  type: COPY_ZONES,
  data,
  meta,
});
