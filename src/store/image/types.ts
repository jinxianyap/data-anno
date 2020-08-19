import { Action } from "../Actions";

export type ImageState = {
    image: File;
    // Seg Check
    passesCrop: boolean;

    segEdit: {
        IDBoxes: IDBox[],
        internalIDProcessed: boolean[],
        croppedIDs: File[],
    }

    imageProps: ImageProps[];

    // Landmarks for each internal id if more than 1
    landmark: LandmarkData[][];
    currentSymbol?: string;

    // OCR
    ocr: OCRData[][];
    currentValue?: string,
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
    count: number,
    labels: {
        value: string,
        position?: Position
    }[]
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

interface LoadImageState {
    type: typeof Action.LOAD_IMAGE_STATE;
    payload: {
        currentImage: ImageState
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

interface AddIDBox {
    type: typeof Action.ADD_ID_BOX;
    payload: {
        IDBox: IDBox,
        croppedID: File
    }
}
interface DeleteIDBox {
    type: typeof Action.DELETE_ID_BOX;
    payload: {
        id: number
    }
}

interface SetCurrentSymbol {
    type: typeof Action.SET_CURRENT_SYMBOL;
    payload: {
        symbol: string
    }
}

interface AddLandmarkData {
    type: typeof Action.ADD_LANDMARK_DATA;
    payload: {
        index: number,
        landmark: LandmarkData
    }
}

interface DeleteLandmarkData {
    type: typeof Action.DELETE_LANDMARK_DATA;
    payload: {
        index: number,
        landmark: string
    }
}

interface UpdateLandmarkFlags {
    type: typeof Action.UPDATE_LANDMARK_FLAGS;
    payload: {
        index: number,
        name: string,
        flags: string[]
    }
}

interface AddOCRData {
    type: typeof Action.ADD_OCR_DATA;
    payload: {
        index: number,
        ocr: OCRData
    }
}

interface SetCurrentValue {
    type: typeof Action.SET_CURRENT_VALUE;
    payload: {
        value: string
    }
}

interface UpdateOCRData {
    type: typeof Action.UPDATE_OCR_DATA;
    payload: {
        index: number,
        name: string,
        value: string,
        position?: Position
    }
}

export type ImageActionTypes = LoadImageState
    | SaveSegCheck
    | AddIDBox
    | DeleteIDBox
    | SetImageProps
    | SetCurrentSymbol
    | AddLandmarkData
    | DeleteLandmarkData
    | UpdateLandmarkFlags
    | AddOCRData
    | UpdateOCRData
    | SetCurrentValue