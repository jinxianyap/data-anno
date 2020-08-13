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

    generatedCrops?: ImageState[];
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

export type IDActionTypes = SaveDocumentType
    | LoadNextID;