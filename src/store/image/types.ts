import { Action } from "../Actions";

export type ImageState = {
    image: File;

    // Seg Check
    passesCrop?: boolean;
    IDBox?: IDBox,
    croppedImage?: File;
    imageProps?: ImageProps;

    landmark: LandmarkData[];
    currentSymbol?: string;

    // OCR
    ocr: OCRData[];
    ocrToLandmark?: string;
    currentWord?: OCRWord;

    // FR Compare (for each cropped internal ID)
    faceCompareMatch?: boolean
}

export type IDBox = {
    id: number;
    position: Position;
}

export type LandmarkData = {
    id: number,
    type: 'landmark',
    name: string,
    position: Position,
    flags: string[]
}

export type OCRData = {
    id: number,
    type: 'OCR',
    name: string,
    mapToLandmark: string,
    count: number,
    labels: OCRWord[]
}

export type LandmarkOCRData = LandmarkData | OCRData;

export type ImageProps = {
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
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

interface DeleteLandmarkData {
    type: typeof Action.DELETE_LANDMARK_DATA;
    payload: {
        landmark: string
    }
}

interface UpdateLandmarkFlags {
    type: typeof Action.UPDATE_LANDMARK_FLAGS;
    payload: {
        name: string,
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
        word: OCRWord
    }
}

interface UpdateOCRData {
    type: typeof Action.UPDATE_OCR_DATA;
    payload: {
        id: number,
        name: string,
        value: string,
        position?: Position
    }
}

interface SetFaceCompareMatch {
    type: typeof Action.SET_FACE_COMPARE_MATCH;
    payload: {
        match: boolean
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
    | DeleteLandmarkData
    | UpdateLandmarkFlags
    | AddOCRData
    | UpdateOCRData
    | SetCurrentWord
    | SetFaceCompareMatch
    | RestoreImage