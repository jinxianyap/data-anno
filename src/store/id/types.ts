import { Action } from '../Actions';
import { IDProcess, Rotation } from '../../utils/enums';
import { ImageState, IDBox, LandmarkData, OCRData, ImageProps } from '../image/types';

export type IDState = {
    dirty: boolean;
    processed: boolean;
    dateCreated: string;
    sessionID: string;
    index: number;

    dataLoaded: boolean;
    originalID?: ImageState;
    backID?: ImageState;
    croppedFace?: File;
    selfieImage?: File;
    selfieVideo?: File;
    videoStills?: File[];
    givenData?: GivenData;

    originalIDProcessed: boolean;
    backIDsProcessed: number;

    originalIDRotation: Rotation;
    backIDRotation: Rotation;

    frontIDFlags?: string[];
    backIDFlags?: string[];

    videoLiveness?: boolean;
    videoFlags?: string[];
    faceCompareMatch?: boolean; // only for ProcessType.FACE

    internalIndex: number;
    internalIDs: InternalIDState[];
};

export type InternalIDState = {
    processed: boolean;
    source: string;
    documentType?: string,
    processStage?: IDProcess,

    originalID?: ImageState;
    // croppedID?: ImageState;
    backID?: ImageState;
    faceCompareMatch?: boolean;
}

export type GivenData = {
    originalID?: {
        imageProps?: ImageProps;
        spoof: boolean;
        flags: string[];
        segmentation?: ({documentType: string, passesCrop: boolean, IDBox: IDBox} | undefined)[],
        landmark: LandmarkData[][],
        ocr: OCRData[][],
    },
    backID?: {
        imageProps?: ImageProps;
        spoof: boolean;
        flags: string[];
        segmentation?: ({passesCrop: boolean, IDBox: IDBox} | undefined)[],
        landmark: LandmarkData[][],
        ocr: OCRData[][]
    },
    face?: {
        liveness?: boolean,
        videoFlags?: string[],
        match?: boolean[]
    }
}

interface SaveDocumentType {
    type: typeof Action.SAVE_DOCUMENT_TYPE;
    payload: {
        internalIndex: number,
        documentType: string
    }
}

interface SetImageRotation {
    type: typeof Action.SET_IMAGE_ROTATION;
    payload: {
        id: File,
        idRotation: Rotation
    }
}

interface LoadNextID {
    type: typeof Action.LOAD_NEXT_ID;
    payload: {
        ID: IDState
    }
}

interface CreateNewID {
    type: typeof Action.CREATE_NEW_ID;
    payload: {
        IDBox: IDBox,
        passesCrop?: boolean
    }
}

interface RefreshIDs {
    type: typeof Action.REFRESH_IDS;
    payload: {
        originalIDProcessed: boolean
    }
}

interface SetIDBox {
    type: typeof Action.SET_ID_BOX;
    payload: {
        IDBox: IDBox,
        croppedImage?: File
    }
}

interface DeleteIDBox {
    type: typeof Action.DELETE_ID_BOX;
    payload: {
        index: number
    }
}

interface SaveCroppedImages {
    type: typeof Action.SAVE_CROPPED_IMAGE;
    payload: {
        index?: number,
        croppedImage: File
    }
}

interface UpdateVideoData {
    type: typeof Action.UPDATE_VIDEO_DATA;
    payload: {
        liveness: boolean,
        flags: string[]
    }
}

interface SaveToInternalID {
    type: typeof Action.SAVE_TO_INTERNAL_ID;
    payload: {
        imageState: ImageState,
        next: boolean,
    }
}

interface UpdateFrontIDFlags {
    type: typeof Action.UPDATE_FRONT_ID_FLAGS;
    payload: {
        flags: string[]
    }
}

interface UpdateBackIDFlags {
    type: typeof Action.UPDATE_BACK_ID_FLAGS;
    payload: {
        flags: string[]
    }
}

interface RestoreID {
    type: typeof Action.RESTORE_ID;
}

interface SetIDFaceMatch {
    type: typeof Action.SET_ID_FACE_MATCH;
    payload: {
        match: boolean
    }
}

interface ClearInternalIDs {
    type: typeof Action.CLEAR_INTERNAL_IDS;
}


interface BackToOriginal {
    type: typeof Action.BACK_TO_ORIGINAL;
}

interface SetFaceCompareMatch {
    type: typeof Action.SET_FACE_COMPARE_MATCH;
    payload: {
        match: boolean
    }
}


export type IDActionTypes = SaveDocumentType
    | SetImageRotation
    | LoadNextID
    | CreateNewID
    | DeleteIDBox
    | RefreshIDs
    | SetIDBox
    | SaveCroppedImages
    | UpdateVideoData
    | SaveToInternalID
    | UpdateFrontIDFlags
    | UpdateBackIDFlags
    | RestoreID
    | SetIDFaceMatch
    | ClearInternalIDs
    | BackToOriginal
    | SetFaceCompareMatch