import {
  FETCH_SOURCE_PROJECT,
  FETCH_SOURCE_PROJECT_SUCCESS,
  FETCH_SOURCE_PROJECT_FAILURE,
  FETCH_DEST_PROJECT,
  FETCH_DEST_PROJECT_SUCCESS,
  FETCH_DEST_PROJECT_FAILURE,
  SELECT_ROOM,
  SELECT_DEST_ROOM,
  CREATE_ROOM,
  CREATE_ROOM_SUCCESS,
  CREATE_ROOM_FAILURE,
} from './actions';

const initialState = {
  sourceProjectDetails: null,
  selectedSourceRoom: null,
  sourceLoading: false,
  sourceError: null,
  destProjectDetails: null,
  selectedDestRoom: null,
  destLoading: false,
  destError: null,
  roomCreating: false,
  roomCreateError: null,
};

const projectReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_SOURCE_PROJECT:
      return { ...state, sourceLoading: true, sourceError: null, sourceProjectDetails: null, selectedSourceRoom: null };
    case FETCH_SOURCE_PROJECT_SUCCESS:
      return { ...state, sourceLoading: false, sourceProjectDetails: action.payload };
    case FETCH_SOURCE_PROJECT_FAILURE:
      return { ...state, sourceLoading: false, sourceError: action.payload };
    case SELECT_ROOM:
      return { ...state, selectedSourceRoom: action.payload };

    case FETCH_DEST_PROJECT:
      // silent=true (post-room-creation refetch): keep existing data visible so UI doesn't flash
      if (action.silent) return { ...state, destLoading: true, destError: null };
      return { ...state, destLoading: true, destError: null, destProjectDetails: null, selectedDestRoom: null };
    case FETCH_DEST_PROJECT_SUCCESS:
      return { ...state, destLoading: false, destProjectDetails: action.payload };
    case FETCH_DEST_PROJECT_FAILURE:
      return { ...state, destLoading: false, destError: action.payload };
    case SELECT_DEST_ROOM:
      return { ...state, selectedDestRoom: action.payload };

    case CREATE_ROOM:
      return { ...state, roomCreating: true, roomCreateError: null };
    case CREATE_ROOM_SUCCESS:
      return { ...state, roomCreating: false };
    case CREATE_ROOM_FAILURE:
      return { ...state, roomCreating: false, roomCreateError: action.payload };

    default:
      return state;
  }
};

export default projectReducer;
