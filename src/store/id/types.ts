import { Action } from '../Actions';
import { IDProcess } from '../../utils/enums';
import { ImageState } from '../image/types';

export type IDState = {
    processed: boolean;
    source: string;
    index: number;
    documentType: string,
    processStage?: IDProcess,

    originalID?: ImageState;
    croppedID?: ImageState;
    backID?: ImageState;
    selfieVideo?: File;
    jsonData?: File;

    // FR Liveness
    videoLiveness?: boolean;
    videoFlags?: string[];
};

interface SaveDocumentType {
    type: typeof Action.SAVE_DOCUMENT_TYPE;
    payload: {
        documentType: string
    }
}

interface LoadNextID {
    type: typeof Action.LOAD_NEXT_ID;
    payload: {
        ID: IDState
    }
}

interface UpdateVideoData {
    type: typeof Action.UPDATE_VIDEO_DATA;
    payload: {
        liveness: boolean,
        flags: string[]
    }
}

export type IDActionTypes = SaveDocumentType
    | LoadNextID
    | UpdateVideoData