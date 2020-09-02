import { Action } from '../Actions';
import { IDProcess, Rotation } from '../../utils/enums';
import { ImageState, IDBox } from '../image/types';

export type IDState = {
    processed: boolean;
    source: string;
    index: number;

    originalID?: ImageState;
    // croppedID?: ImageState;
    backID?: ImageState;
    selfieVideo?: File;
    jsonData?: any;

    originalIDProcessed: boolean;
    backIDsProcessed: number;

    originalIDRotation: Rotation;
    backIDRotation: Rotation;
    croppedIDRotation: Rotation;

    overallFlags?: string[];

    videoLiveness?: boolean;
    videoFlags?: string[];

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
        croppedId: boolean,
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

interface UpdateOverallFlags {
    type: typeof Action.UPDATE_OVERALL_FLAGS;
    payload: {
        flags: string[]
    }
}

interface RestoreID {
    type: typeof Action.RESTORE_ID;
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
    | UpdateOverallFlags
    | RestoreID