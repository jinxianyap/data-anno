import { Action } from "../Actions";

export type ImageState = {
    image: File;
    croppedImage?: File;

    // image height and width
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
    labels: OCRWord[],
    // keeps track of where newlines should be inserted
    newlines: number[],
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

// load the given ImageState object into the ImageState
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

// set the landmark/ocr currently selected
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

interface ClearLandmarkPositions {
    type: typeof Action.CLEAR_LANDMARK_POSITIONS;
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

// set the individual ocr word currently selected and its corresponding landmark
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

interface ClearOCRPositions {
    type: typeof Action.CLEAR_OCR_POSITIONS;
}

interface RestoreImage {
    type: typeof Action.RESTORE_IMAGE;
}

export type ImageActionTypes = LoadImageState
    | SaveSegCheck
    | SetImageProps
    | SetCurrentSymbol
    | AddLandmarkData
    | ClearLandmarkPositions
    | DeleteLandmarkPosition
    | UpdateLandmarkFlags
    | AddOCRData
    | UpdateOCRData
    | ClearOCRPositions
    | SetCurrentWord
    | RestoreImage