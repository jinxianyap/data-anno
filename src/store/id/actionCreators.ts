import { IDActionTypes, IDState } from "./types";
import { Action } from "../Actions";

export function loadNextID(ID: IDState): IDActionTypes {
    return {
        type: Action.LOAD_NEXT_ID,
        payload: {
            ID
        }
    }
}

export function saveDocumentType(documentType: string): IDActionTypes {
    return {
        type: Action.SAVE_DOCUMENT_TYPE,
        payload: {
            documentType: documentType
        }
    }
}