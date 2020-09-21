import { IDActionTypes, IDState } from "./types";
import { Action } from "../Actions";
import { ImageState, IDBox, LandmarkData } from "../image/types";
import { Rotation } from "../../utils/enums";

export function loadNextID(ID: IDState): IDActionTypes {
    return {
        type: Action.LOAD_NEXT_ID,
        payload: {
            ID
        }
    }
}

export function createNewID(IDBox: IDBox, passesCrop?: boolean, documentType?: string): IDActionTypes {
    return {
        type: Action.CREATE_NEW_ID,
        payload: {
            IDBox: IDBox,
            passesCrop: passesCrop,
            documentType: documentType
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

export function saveCroppedImage(image: File, index?: number, landmarks?: LandmarkData[]): IDActionTypes {
    return {
        type: Action.SAVE_CROPPED_IMAGE,
        payload: {
            index: index,
            croppedImage: image,
            landmarks: landmarks
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

export function setImageRotation(id: File, idRotation: Rotation): IDActionTypes {
    return {
        type: Action.SET_IMAGE_ROTATION,
        payload: {
            id: id,
            idRotation: idRotation
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

export function saveToInternalID(image: ImageState, next: boolean): IDActionTypes {
    return {
        type: Action.SAVE_TO_INTERNAL_ID,
        payload: {
            imageState: image,
            next: next
        }
    }
}

export function updateFrontIDFlags(flags: string[]): IDActionTypes {
    return {
        type: Action.UPDATE_FRONT_ID_FLAGS,
        payload: {
            flags: flags
        }
    }
}

export function updateBackIDFlags(flags: string[]): IDActionTypes {
    return {
        type: Action.UPDATE_BACK_ID_FLAGS,
        payload: {
            flags: flags
        }
    }
}

export function restoreID(): IDActionTypes {
    return {
        type: Action.RESTORE_ID
    }
}

export function setIDFaceMatch(match: boolean): IDActionTypes {
    return {
        type: Action.SET_ID_FACE_MATCH,
        payload: {
            match: match
        }
    }
}

export function clearInternalIDs(): IDActionTypes {
    return {
        type: Action.CLEAR_INTERNAL_IDS
    }
}

export function backToOriginal(): IDActionTypes {
    return {
        type: Action.BACK_TO_ORIGINAL
    }
}

export function setFaceCompareMatch(match: boolean): IDActionTypes {
    return {
        type: Action.SET_FACE_COMPARE_MATCH,
        payload: {
            match: match
        }
    }
}