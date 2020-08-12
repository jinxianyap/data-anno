import { Action } from "../Actions";
import { ProcessType, CurrentStage } from "../../utils/enums";

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
    IDLibrary: IDFolder[];
    loadedIDs: boolean;
}

export type IDFolder = {
    originalID: File;
    croppedID?: File;
    backID?: File;
    selfieVideo?: File;
    jsonData?: File
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
        IDs: IDFolder[]
    }
}

export type GeneralActionTypes = SaveSetupOptions
    | ProgressToStage
    | LoadFromDatabase