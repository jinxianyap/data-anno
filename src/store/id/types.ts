import { Action } from '../Actions';
import { IDProcess, Rotation } from '../../utils/enums';
import { ImageState, IDBox, LandmarkData, OCRData, ImageProps } from '../image/types';

export type IDState = {
    dirty: boolean;
    processed: boolean;
    dateCreated: string;
    sessionID: string;
    index: number;

    // indicates which phases need to be annotated
    phasesChecked: PhasesChecked;
    // records state of annotation
    annotationState: AnnotationState;

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

// created after segmentation, keeps track of landmark, ocr, face compare match
export type InternalIDState = {
    processed: boolean;
    source: string;
    documentType?: string,
    processStage?: IDProcess,

    originalID?: ImageState;
    backID?: ImageState;
    faceCompareMatch?: boolean;
}

// store ocr results loaded from csv OR data from previously created json
export type GivenData = {
    originalID?: {
        originalImageProps?: ImageProps;
        croppedImageProps?: ImageProps;
        spoof: boolean;
        flags: string[];
        segmentation?: ({documentType: string, passesCrop: boolean, IDBox: IDBox} | undefined)[],
        landmark: LandmarkData[][],
        ocr: OCRData[][],
    },
    backID?: {
        originalImageProps?: ImageProps;
        croppedImageProps?: ImageProps;
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

export type PhasesChecked = {
    front: boolean,
    back: boolean,
    video: boolean,
    face: boolean
}

export type AnnotationState = {
    front: {seg: boolean, landmark: boolean, ocr: boolean},
    back: {seg: boolean, landmark: boolean, ocr: boolean},
    video: boolean,
    match: boolean
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

// loads given IDState object to the current IDState
interface LoadNextID {
    type: typeof Action.LOAD_NEXT_ID;
    payload: {
        ID: IDState
    }
}

// creates new InternalIDState
interface CreateNewID {
    type: typeof Action.CREATE_NEW_ID;
    payload: {
        IDBox: IDBox,
        passesCrop?: boolean,
        documentType?: string,
    }
}

// restores the current IDState to its initial state prior to making annotations
interface RefreshIDs {
    type: typeof Action.REFRESH_IDS;
    payload: {
        originalIDProcessed: boolean
    }
}

// modify IDBox of the current InternalIDState
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
        croppedImage: File,
        landmarks?: LandmarkData[]
    }
}

interface UpdateVideoData {
    type: typeof Action.UPDATE_VIDEO_DATA;
    payload: {
        liveness: boolean,
        flags: string[]
    }
}

// save current ImageState back to the current InternalIDState
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

// only for double-faced IDs: used to move to the front side
interface BackToOriginal {
    type: typeof Action.BACK_TO_ORIGINAL;
}

// only for ProcessType.FACE: saving face compare match
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