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
    loadedIDs: false,
    currentIndex: 0
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
                currentStage: state.loadedIDs ? action.payload.nextStage : state.currentStage
            }
        }
        case Action.LOAD_FROM_DATABASE: {
            return {
                ...state,
                IDLibrary: action.payload.IDs,
                loadedIDs: true
            }
        }
        case Action.GET_PREV_ID: {
            if (state.IDLibrary[state.currentIndex - 1] !== undefined) {
                state.IDLibrary[state.currentIndex - 1].dirty = true;
            }
            return {
                ...state,
                currentIndex: state.currentIndex - 1
            }
        }
        case Action.GET_NEXT_ID: {
            if (state.IDLibrary[state.currentIndex + 1] !== undefined) {
                state.IDLibrary[state.currentIndex + 1].dirty = true;
            }
            return {
                ...state,
                currentIndex: state.currentIndex + 1
            }
        }
        case Action.SAVE_TO_LIBRARY: {
            let lib = state.IDLibrary;
            let id = action.payload.id;
            let idx = lib.findIndex((each) => each.index === id.index);
            lib.splice(idx, 1, id);
            return {
                ...state,
                IDLibrary: lib
            }
        }
        case Action.RESTORE_GENERAL: {
            return {
                ...initialState
            }
        }
        default:
            return state;
    }
}