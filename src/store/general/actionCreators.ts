import { SetupOptions, GeneralActionTypes } from "./types";
import { Action } from "../Actions";
import { CurrentStage } from "../../utils/enums";
import { IDState } from "../id/types";

export function saveSetupOptions(setupOptions: SetupOptions): GeneralActionTypes {
    return {
        type: Action.SAVE_SETUP_OPTIONS,
        payload: {
            setupOptions
        }
    }
}

export function progressNextStage(nextStage: CurrentStage): GeneralActionTypes {
    return {
        type: Action.PROGRESS_NEXT_STAGE,
        payload: {
            nextStage
        }
    }
}

export function loadFromDatabase(IDs: IDState[]): GeneralActionTypes {
    return {
        type: Action.LOAD_FROM_DATABASE,
        payload: {
            IDs
        }
    }
}

export function getPreviousID(res?: any): GeneralActionTypes {
    return {
        type: Action.GET_PREV_ID,
        payload: res !== undefined ? {
            sessionID: res.sessionID, 
            success: res.success, 
            annotationState: 
            res.annotationState, 
            phasesChecked: res.phasesChecked
        } : undefined
    }
}

export function getNextID(res?: any): GeneralActionTypes {
    return {
        type: Action.GET_NEXT_ID,
        payload: res !== undefined ? {
            sessionID: res.sessionID, 
            success: res.success, 
            annotationState: 
            res.annotationState, 
            phasesChecked: res.phasesChecked
        } : undefined
    }
}

export function getSelectedID(index: number, res?: any): GeneralActionTypes {
    return {
        type: Action.GET_SELECTED_ID,
        payload: res !== undefined ? {
            sessionID: res.sessionID, 
            success: res.success, 
            index: index,
            annotationState: res.annotationState, 
            phasesChecked: res.phasesChecked
        } : {index: index}
    }
}

export function saveToLibrary(id: IDState): GeneralActionTypes {
    return {
        type: Action.SAVE_TO_LIBRARY,
        payload: {
            id: id
        }
    }
}

export function restoreGeneral(): GeneralActionTypes {
    return {
        type: Action.RESTORE_GENERAL
    }
}