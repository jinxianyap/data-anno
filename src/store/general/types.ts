import { Action } from "../Actions";
import { ProcessType, CurrentStage } from "../../utils/enums";
import { IDState } from "../id/types";

export type SetupOptions = {
    user: string;
    database: string,
    startDate: Date,
    endDate: Date,
    processType: ProcessType
}

export type GeneralState = {
    currentStage: CurrentStage;
    setupOptions: SetupOptions;
    IDLibrary: IDState[];
    loadedIDs: boolean;
    currentIndex: number;
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

interface GetNextID {
    type: typeof Action.GET_NEXT_ID;
}

export type GeneralActionTypes = SaveSetupOptions
    | ProgressToStage
    | LoadFromDatabase
    | GetNextID