import { ImageState, ImageActionTypes } from "./types";
import { Action } from "../Actions";

const initialState: ImageState = {
    image: new File([], ''),
    passesCrop: false,
    imageProps: {
        height: 0,
        width: 0,
        offsetX: 0,
        offsetY: 0
    },
    segEdit: {
        IDBoxes: [],
        internalIDProcessed: [],
        croppedIDs: []
    },
    landmark: []
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
                passesCrop: action.payload.passesCrop
            }
        }
        case Action.SET_IMAGE_PROPS: {
            return {
                ...state,
                imageProps: {
                    width: action.payload.width,
                    height: action.payload.height,
                    offsetX: action.payload.offsetX,
                    offsetY: action.payload.offsetY
                }
            }
        }
        case Action.ADD_ID_BOX: {
            let newIDList = state.segEdit.IDBoxes;
            newIDList.push(action.payload.IDBox);
            let newProcessedList = state.segEdit.internalIDProcessed;
            newProcessedList.push(false);
            let newCroppedList = state.segEdit.croppedIDs;
            newCroppedList.push(action.payload.croppedID);
            return {
                ...state,
                segEdit: {
                    IDBoxes: newIDList,
                    internalIDProcessed: newProcessedList,
                    croppedIDs: newCroppedList
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
    }
    return state
}