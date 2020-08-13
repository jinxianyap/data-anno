import { Action } from "../Actions";
import { ImageState, ImageActionTypes, IDBox } from "./types";

export function loadImageState(currentImage: ImageState): ImageActionTypes {
    return {
        type: Action.LOAD_IMAGE_STATE,
        payload: {
            currentImage: currentImage
        }
    }
}

export function saveSegCheck(passesCrop: boolean): ImageActionTypes {
    return {
        type: Action.SAVE_SEG_CHECK,
        payload: {
            passesCrop: passesCrop
        }
    }
}

export function setImageProps(props: any): ImageActionTypes {
    return {
        type: Action.SET_IMAGE_PROPS,
        payload: {
            ...props
        }
    }
}

export function addIDBox(box: IDBox): ImageActionTypes {
    return {
        type: Action.ADD_ID_BOX,
        payload: {
            IDBox: box
        }
    }
}

export function deleteIDBox(id: number): ImageActionTypes {
    return {
        type: Action.DELETE_ID_BOX,
        payload: {
            id: id
        }
    }
}