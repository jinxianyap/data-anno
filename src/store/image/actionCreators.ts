import { Action } from "../Actions";
import { ImageState, ImageActionTypes, ImageProps, LandmarkData, OCRData, Position, OCRWord } from "./types";

export function loadImageState(currentImage: ImageState, passesCrop?: boolean): ImageActionTypes {
    return {
        type: Action.LOAD_IMAGE_STATE,
        payload: {
            currentImage: currentImage,
            passesCrop: passesCrop
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

export function setCurrentSymbol(symbol?: string, mapToLandmark?: string): ImageActionTypes {
    return {
        type: Action.SET_CURRENT_SYMBOL,
        payload: {
            symbol: symbol,
            mapToLandmark: mapToLandmark
        }
    }
}

export function addLandmarkData(landmark: LandmarkData): ImageActionTypes {
    return {
        type: Action.ADD_LANDMARK_DATA,
        payload: {
            landmark: landmark
        }
    }
}

export function clearLandmarkPositions(): ImageActionTypes {
    return {
        type: Action.CLEAR_LANDMARK_POSITIONS
    }
}

export function deleteLandmarkPosition(landmark: string): ImageActionTypes {
    return {
        type: Action.DELETE_LANDMARK_POSITION,
        payload: {
            landmark: landmark
        }
    }
}

export function updateLandmarkFlags(codeName: string, flags: string[]): ImageActionTypes {
    return {
        type: Action.UPDATE_LANDMARK_FLAGS,
        payload: {
            codeName: codeName,
            flags: flags
        }
    }
}

export function addOCRData(ocr: OCRData): ImageActionTypes {
    return {
        type: Action.ADD_OCR_DATA,
        payload: {
            ocr: ocr
        }
    }
}

export function setCurrentWord(word: OCRWord): ImageActionTypes {
    return {
        type: Action.SET_CURRENT_VALUE,
        payload: {
            word: word
        }
    }
}

export function updateOCRData(id: number, codeName: string, value: string, position?: Position): ImageActionTypes {
    return {
        type: Action.UPDATE_OCR_DATA,
        payload: {
            id: id,
            codeName: codeName,
            value: value,
            position: position
        }
    }
}

export function clearOCRPositions(): ImageActionTypes {
    return {
        type: Action.CLEAR_OCR_POSITIONS
    }
}

export function restoreImage(): ImageActionTypes {
    return {
        type: Action.RESTORE_IMAGE
    }
}