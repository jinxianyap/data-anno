import { SetupOptions, GeneralActionTypes, IDFolder } from "./types";
import { Action } from "../Actions";
import { CurrentStage } from "../../utils/enums";

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

export function loadFromDatabase(IDs: IDFolder[]): GeneralActionTypes {
    return {
        type: Action.LOAD_FROM_DATABASE,
        payload: {
            IDs
        }
    }
}

export function getNextImage(): GeneralActionTypes {
    return {
        type: Action.GET_NEXT_IMAGE
    }
}