import { IDActionTypes, IDState } from "./types";
import { Action } from "../Actions";
import { IDBox, ImageState } from "../image/types";

export function loadNextID(ID: IDState): IDActionTypes {
    return {
        type: Action.LOAD_NEXT_ID,
        payload: {
            ID
        }
    }
}

export function createNewID(IDBox: IDBox, croppedImage: File): IDActionTypes {
    return {
        type: Action.CREATE_NEW_ID,
        payload: {
            IDBox: IDBox,
            croppedImage: croppedImage
        }
    }
}

export function deleteIDBox(index: number): IDActionTypes {
    return {
        type: Action.DELETE_ID_BOX,
        payload: {
            index: index
        }
    }
}

export function refreshIDs(originalIDProcessed: boolean): IDActionTypes {
    return {
        type: Action.REFRESH_IDS,
        payload: {
            originalIDProcessed: originalIDProcessed
        }
    }
}

export function setIDBox(IDBox: IDBox, croppedImage?: File): IDActionTypes {
    return {
        type: Action.SET_ID_BOX,
        payload: {
            IDBox: IDBox,
            croppedImage: croppedImage
        }
    }
}

export function saveDocumentType(internalIndex: number, documentType: string): IDActionTypes {
    return {
        type: Action.SAVE_DOCUMENT_TYPE,
        payload: {
            internalIndex: internalIndex,
            documentType: documentType
        }
    }
}

export function updateVideoData(liveness: boolean, flags: string[]): IDActionTypes {
    return {
        type: Action.UPDATE_VIDEO_DATA,
        payload: {
            liveness: liveness,
            flags: flags
        }
    }
}

export function saveToInternalID(image: ImageState): IDActionTypes {
    return {
        type: Action.SAVE_TO_INTERNAL_ID,
        payload: {
            imageState: image
        }
    }
}

export function restoreID(): IDActionTypes {
    return {
        type: Action.RESTORE_ID
    }
}