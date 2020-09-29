import { Action } from "../Actions";
import { ProcessType, CurrentStage } from "../../utils/enums";
import { IDState, AnnotationState, PhasesChecked } from "../id/types";

export type SetupOptions = {
    user: string;
    database: string,
    startDate?: Date,
    endDate?: Date,
    processType: ProcessType
}

export type GeneralState = {
    currentStage: CurrentStage;
    setupOptions: SetupOptions;
    IDLibrary: IDState[];
    loadedIDs: boolean;
    currentIndex: number;
    saveResults: {
        sessionID: string,
        success: boolean
    }[];
}

interface SaveSetupOptions {
    type: typeof Action.SAVE_SETUP_OPTIONS;
    payload: {
        setupOptions: SetupOptions
    }
}

interface ProgressToStage {
    type: typeof Action.PROGRESS_NEXT_STAGE;
    payload: {
        nextStage: CurrentStage
    }
}

interface LoadFromDatabase {
    type: typeof Action.LOAD_FROM_DATABASE;
    payload: {
        IDs: IDState[]
    }
}

interface GetPreviousID {
    type: typeof Action.GET_PREV_ID;
    payload?: {
        sessionID: string,
        success: boolean,
        annotationState?: AnnotationState,
        phasesChecked?: PhasesChecked
    }
}
interface GetNextID {
    type: typeof Action.GET_NEXT_ID;
    payload?: {
        sessionID: string,
        success: boolean,
        annotationState?: AnnotationState,
        phasesChecked?: PhasesChecked
    }
}

interface GetSelectedID {
    type: typeof Action.GET_SELECTED_ID;
    payload: {
        index: number,
        sessionID?: string,
        success?: boolean,
        annotationState?: AnnotationState,
        phasesChecked?: PhasesChecked
    }
}

interface SaveToLibrary {
    type: typeof Action.SAVE_TO_LIBRARY;
    payload: {
        id: IDState
    }
}

interface RestoreGeneral {
    type: typeof Action.RESTORE_GENERAL;
}

export type GeneralActionTypes = SaveSetupOptions
    | ProgressToStage
    | LoadFromDatabase
    | GetPreviousID
    | GetNextID
    | GetSelectedID
    | SaveToLibrary
    | RestoreGeneral