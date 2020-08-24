import { Action } from '../Actions';
import { IDProcess } from '../../utils/enums';
import { ImageState, IDBox } from '../image/types';

export type IDState = {
    processed: boolean;
    source: string;
    index: number;

    originalID?: ImageState;
    croppedID?: ImageState;
    backID?: ImageState;
    selfieVideo?: File;
    jsonData?: File;

    originalIDProcessed: boolean;
    backIDProcessed: boolean;

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
    croppedID?: ImageState;
    backID?: ImageState;
}

interface SaveDocumentType {
    type: typeof Action.SAVE_DOCUMENT_TYPE;
    payload: {
        internalIndex: number,
        documentType: string
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
        croppedImage: File
    }
}

interface RefreshIDs {
    type: typeof Action.REFRESH_IDS;
}

interface SetIDBox {
    type: typeof Action.SET_ID_BOX;
    payload: {
        IDBox: IDBox,
        croppedImage?: File
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
        imageState: ImageState
    }
}

interface RestoreID {
    type: typeof Action.RESTORE_ID;
}

export type IDActionTypes = SaveDocumentType
    | LoadNextID
    | CreateNewID
    | RefreshIDs
    | SetIDBox
    | UpdateVideoData
    | SaveToInternalID
    | RestoreID