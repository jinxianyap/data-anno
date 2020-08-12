import { GeneralState, GeneralActionTypes } from "./types";
import { CurrentStage, ProcessType } from "../../utils/enums";
import { Action } from "../Actions";

const initialState: GeneralState = {
    currentStage: CurrentStage.SETUP,
    setupOptions: {
        user: '',
        database: '',
        startDate: new Date(),
        endDate: new Date(),
        processType: ProcessType.WHOLE
    },
    IDLibrary: [],
    loadedIDs: false
}

export function generalReducer(
    state = initialState,
    action: GeneralActionTypes
): GeneralState {
    switch (action.type) {
        case Action.SAVE_SETUP_OPTIONS: {
            return {
                ...state,
                setupOptions: action.payload.setupOptions
            }
        }
        case Action.PROGRESS_NEXT_STAGE: {
            return {
                ...state,
                currentStage: action.payload.nextStage
            }
        }
        case Action.LOAD_FROM_DATABASE: {
            return {
                ...state,
                IDLibrary: action.payload.IDs,
                loadedIDs: true
            }
        }
        default:
            return state;
    }
}