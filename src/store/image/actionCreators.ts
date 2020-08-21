import { Action } from "../Actions";
import { ImageState, ImageActionTypes, IDBox, ImageProps, LandmarkData, OCRData, Position, OCRWord } from "./types";

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

export function setCurrentSymbol(symbol?: string): ImageActionTypes {
    return {
        type: Action.SET_CURRENT_SYMBOL,
        payload: {
            symbol: symbol
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

export function deleteLandmarkData(index: number, landmark: string): ImageActionTypes {
    return {
        type: Action.DELETE_LANDMARK_DATA,
        payload: {
            index: index,
            landmark: landmark
        }
    }
}

export function updateLandmarkFlags(index: number, name: string, flags: string[]): ImageActionTypes {
    return {
        type: Action.UPDATE_LANDMARK_FLAGS,
        payload: {
            index: index,
            name: name,
            flags: flags
        }
    }
}

export function addOCRData(index: number, ocr: OCRData): ImageActionTypes {
    return {
        type: Action.ADD_OCR_DATA,
        payload: {
            index: index,
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

export function updateOCRData(index: number, id: number, name: string, value: string, position?: Position): ImageActionTypes {
    return {
        type: Action.UPDATE_OCR_DATA,
        payload: {
            index: index,
            id: id,
            name: name,
            value: value,
            position: position
        }
    }
}

export function setFaceCompareMatch(index: number, match: boolean): ImageActionTypes {
    return {
        type: Action.SET_FACE_COMPARE_MATCH,
        payload: {
            index: index,
            match: match
        }
    }
}

export function incrementInternalIndex(): ImageActionTypes {
    return {
        type: Action.INCREMENT_INTERNAL_INDEX
    }
}