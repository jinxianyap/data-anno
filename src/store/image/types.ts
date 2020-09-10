import { Action } from "../Actions";

export type ImageState = {
    image: File;
    croppedImage?: File;
    imageProps?: ImageProps;
    croppedImageProps?: ImageProps;

    // Seg Check
    passesCrop?: boolean;
    IDBox?: IDBox,

    // landmark
    landmark: LandmarkData[];
    currentSymbol?: string;

    // OCR
    ocr: OCRData[];
    ocrToLandmark?: string;
    currentWord?: OCRWord;
}

export type IDBox = {
    id: number;
    position: Position;
}

export type LandmarkData = {
    id: number,
    type: 'landmark',
    codeName: string,
    name: string,
    position?: Position,
    flags: string[]
}

export type OCRData = {
    id: number,
    type: 'OCR',
    codeName: string,
    name: string,
    mapToLandmark: string,
    count: number,
    labels: OCRWord[]
}

export type LandmarkOCRData = LandmarkData | OCRData;

export type ImageProps = {
    width: number,
    height: number,
}

export type Position = {
    x1: number,
    x2: number,
    x3: number,
    x4: number,
    y1: number,
    y2: number,
    y3: number,
    y4: number
}

export type OCRWord = {
    id: number,
    value: string,
    position?: Position
}

interface LoadImageState {
    type: typeof Action.LOAD_IMAGE_STATE;
    payload: {
        currentImage: ImageState,
        passesCrop?: boolean
    }
}

interface SaveSegCheck {
    type: typeof Action.SAVE_SEG_CHECK;
    payload: {
        passesCrop: boolean;
    }
}

interface SetImageProps {
    type: typeof Action.SET_IMAGE_PROPS;
    payload: {
        props: ImageProps
    }
}

// interface SetIDBox {
//     type: typeof Action.SET_ID_BOX;
//     payload: {
//         IDBox: IDBox,
//         croppedImage: File
//     }
// }

interface SetCurrentSymbol {
    type: typeof Action.SET_CURRENT_SYMBOL;
    payload: {
        symbol?: string,
        mapToLandmark?: string,
    }
}

interface AddLandmarkData {
    type: typeof Action.ADD_LANDMARK_DATA;
    payload: {
        landmark: LandmarkData
    }
}

interface ClearLandmarkData {
    type: typeof Action.CLEAR_LANDMARK_DATA;
}

interface DeleteLandmarkPosition {
    type: typeof Action.DELETE_LANDMARK_POSITION;
    payload: {
        landmark: string
    }
}

interface UpdateLandmarkFlags {
    type: typeof Action.UPDATE_LANDMARK_FLAGS;
    payload: {
        codeName: string,
        flags: string[]
    }
}

interface AddOCRData {
    type: typeof Action.ADD_OCR_DATA;
    payload: {
        ocr: OCRData
    }
}

interface SetCurrentWord {
    type: typeof Action.SET_CURRENT_VALUE;
    payload: {
        mapToLandmark?: string,
        word: OCRWord
    }
}

interface UpdateOCRData {
    type: typeof Action.UPDATE_OCR_DATA;
    payload: {
        id: number,
        codeName: string,
        value: string,
        position?: Position
    }
}

interface RestoreImage {
    type: typeof Action.RESTORE_IMAGE;
}

export type ImageActionTypes = LoadImageState
    | SaveSegCheck
    // | SetIDBox
    | SetImageProps
    | SetCurrentSymbol
    | AddLandmarkData
    | ClearLandmarkData
    | DeleteLandmarkPosition
    | UpdateLandmarkFlags
    | AddOCRData
    | UpdateOCRData
    | SetCurrentWord
    | RestoreImage