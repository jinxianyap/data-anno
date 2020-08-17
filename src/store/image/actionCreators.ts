import { Action } from "../Actions";
import { ImageState, ImageActionTypes, IDBox, ImageProps, Position, LandmarkData } from "./types";
import { id } from "date-fns/locale";

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

export function setImageProps(props: ImageProps): ImageActionTypes {
    return {
        type: Action.SET_IMAGE_PROPS,
        payload: {
            props: props
        }
    }
}

export function addIDBox(box: IDBox, croppedID: File): ImageActionTypes {
    return {
        type: Action.ADD_ID_BOX,
        payload: {
            IDBox: box,
            croppedID: croppedID
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

export function setCurrentLandmark(landmark: string): ImageActionTypes {
    return {
        type: Action.SET_CURRENT_LANDMARK,
        payload: {
            landmark: landmark
        }
    }
}

export function addLandmarkData(index: number, landmark: LandmarkData): ImageActionTypes {
    return {
        type: Action.ADD_LANDMARK_DATA,
        payload: {
            index: index,
            landmark: landmark
        }
    }
}