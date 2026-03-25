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

export const CREATE_ROOM = 'CREATE_ROOM';
export const CREATE_ROOM_SUCCESS = 'CREATE_ROOM_SUCCESS';
export const CREATE_ROOM_FAILURE = 'CREATE_ROOM_FAILURE';

export const fetchSourceProject = (projectId) => ({
  type: FETCH_SOURCE_PROJECT,
  payload: projectId,
});

export const fetchDestProject = (projectId, { silent = false } = {}) => ({
  type: FETCH_DEST_PROJECT,
  payload: projectId,
  silent,
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

export const createRoom = (data, meta) => ({
  type: CREATE_ROOM,
  data,
  meta,
});
