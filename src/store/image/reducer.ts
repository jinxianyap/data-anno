import { ImageState, ImageActionTypes } from "./types";
import { Action } from "../Actions";

const initialState: ImageState = {
    currentImage: {
        processed: false,
        source: '',
        index: 0
    },
    documentType: '',
    passesCrop: false
}

export function imageReducer(
    state = initialState,
    action: ImageActionTypes
): ImageState {
    switch (action.type) {
        case Action.LOAD_IMAGE_STATE: {
            let folder = action.payload.IDFolder;
            return {
                ...state,
                currentImage: folder
            }
        }
    }
    return state
}