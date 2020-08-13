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

export function getNextID(): GeneralActionTypes {
    return {
        type: Action.GET_NEXT_ID
    }
}