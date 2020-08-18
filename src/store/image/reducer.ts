import { ImageState, ImageActionTypes } from "./types";
import { Action } from "../Actions";

const initialState: ImageState = {
    image: new File([], ''),
    passesCrop: false,
    segEdit: {
        IDBoxes: [],
        internalIDProcessed: [],
        croppedIDs: []
    },
    imageProps: [],
    landmark: [],
}

export function imageReducer(
    state = initialState,
    action: ImageActionTypes
): ImageState {
    switch (action.type) {
        case Action.LOAD_IMAGE_STATE: {
            return {
                ...action.payload.currentImage
            }
        }
        case Action.SAVE_SEG_CHECK: {
            return {
                ...state,
                passesCrop: action.payload.passesCrop,
                landmark: action.payload.passesCrop ? [[]] : [],
            }
        }
        case Action.SET_IMAGE_PROPS: {
            let props = state.imageProps;
            props.push(action.payload.props);
            return {
                ...state,
                imageProps: props
            }
        }
        case Action.ADD_ID_BOX: {
            let newIDList = state.segEdit.IDBoxes;
            newIDList.push(action.payload.IDBox);
            let newProcessedList = state.segEdit.internalIDProcessed;
            newProcessedList.push(false);
            let newCroppedList = state.segEdit.croppedIDs;
            newCroppedList.push(action.payload.croppedID);
            let landmark = state.landmark;
            landmark.push([]);
            return {
                ...state,
                landmark: landmark,
                segEdit: {
                    IDBoxes: newIDList,
                    internalIDProcessed: newProcessedList,
                    croppedIDs: newCroppedList,
                }
            }
        }
        case Action.DELETE_ID_BOX: {
            let id = action.payload.id;
            let boxes = state.segEdit.IDBoxes;
            let internalIDs = state.segEdit.internalIDProcessed;
            let croppedIDs = state.segEdit.croppedIDs;

            for (var i = 0; i < boxes.length; i++) {
                if (boxes[i].id === id) {
                    boxes.splice(i, 1);
                    internalIDs.splice(i, 1);
                    croppedIDs.splice(i, 1);
                }
            }

            return {
                ...state,
                segEdit: {
                    IDBoxes: boxes,
                    internalIDProcessed: internalIDs,
                    croppedIDs: croppedIDs
                }
            }
        }

        case Action.SET_CURRENT_LANDMARK: {
            return {
                ...state,
                currentLandmark: action.payload.landmark
            }
        }

        case Action.ADD_LANDMARK_DATA: {
            let allLandmarks = state.landmark;
            let landmarks = allLandmarks[action.payload.index];

            for (var j = 0; j < landmarks.length; j++) {
                if (landmarks[j].name === action.payload.landmark.name) {
                    landmarks.splice(j, 1);
                }
            } 

            landmarks.push(action.payload.landmark);
            allLandmarks[action.payload.index] = landmarks;

            return {
                ...state,
                landmark: allLandmarks
            }
        }

        case Action.DELETE_LANDMARK_DATA: {
            let allLandmarks = state.landmark;
            let landmarks = allLandmarks[action.payload.index];

            for (var k = 0; k < landmarks.length; k++) {
                if (landmarks[k].name === action.payload.landmark) {
                    landmarks.splice(k, 1);
                }
            } 

            allLandmarks[action.payload.index] = landmarks;

            return {
                ...state,
                landmark: allLandmarks
            }
        }

        case Action.UPDATE_LANDMARK_FLAGS: {
            let allLandmarks = state.landmark;
            let landmarks = allLandmarks[action.payload.index];

            for (var c = 0; c < landmarks.length; c++) {
                if (landmarks[c].name === action.payload.name) {
                    let newLandmark = landmarks[c];
                    newLandmark.flags = action.payload.flags;
                    landmarks[c] = newLandmark;
                }
            }

            allLandmarks[action.payload.index] = landmarks;

            return {
                ...state,
                landmark: allLandmarks
            }
        }
    }
    return state
}