import { Action } from "../Actions";
import { ProcessType, CurrentStage } from "../../utils/enums";


export type IDFolder = {
    processed: boolean;
    source: string;
    index: number;
    originalID?: File;
    croppedID?: File;
    backID?: File;
    selfieVideo?: File;
    jsonData?: File;
}

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
        IDs: IDFolder[]
    }
}

interface GetNextImage {
    type: typeof Action.GET_NEXT_IMAGE;
}

export type GeneralActionTypes = SaveSetupOptions
    | ProgressToStage
    | LoadFromDatabase
    | GetNextImage