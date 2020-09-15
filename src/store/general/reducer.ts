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
    currentIndex: 0,
    saveResults: []
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
            let results = state.saveResults;
            let currentID = state.IDLibrary[state.currentIndex];

            if (state.IDLibrary[state.currentIndex - 1] !== undefined) {
                state.IDLibrary[state.currentIndex - 1].dirty = true;
            }
            if (action.payload !== undefined) {
                let idx = results.findIndex((each) => each.sessionID === action.payload!.sessionID);
                let response = {
                    sessionID: action.payload.sessionID,
                    success: action.payload.success
                }
                if (idx >= 0) {
                    results.splice(idx, 1, response);
                } else {
                    results.push(response);
                }

                if (action.payload.annotationState !== undefined) {
                    currentID.annotationState = action.payload.annotationState;
                }
                if (action.payload.phasesChecked !== undefined) {
                    currentID.phasesChecked = action.payload.phasesChecked;
                }
            }
            return {
                ...state,
                // IDLibrary: state.IDLibrary.splice(state.currentIndex, 1, currentID),
                saveResults: results,
                currentIndex: state.currentIndex - 1
            }
        }
        case Action.GET_NEXT_ID: {
            let results = state.saveResults;
            let currentID = state.IDLibrary[state.currentIndex];

            if (state.IDLibrary[state.currentIndex + 1] !== undefined) {
                state.IDLibrary[state.currentIndex + 1].dirty = true;
            }
            if (action.payload !== undefined) {
                let idx = results.findIndex((each) => each.sessionID === action.payload!.sessionID);
                let response = {
                    sessionID: action.payload.sessionID,
                    success: action.payload.success
                }
                if (idx >= 0) {
                    results.splice(idx, 1, response);
                } else {
                    results.push(response);
                }

                if (action.payload.annotationState !== undefined) {
                    currentID.annotationState = action.payload.annotationState;
                }
                if (action.payload.phasesChecked !== undefined) {
                    currentID.phasesChecked = action.payload.phasesChecked;
                }
            }
            return {
                ...state,
                // IDLibrary: state.IDLibrary.splice(state.currentIndex, 1, currentID),
                saveResults: results,
                currentIndex: state.currentIndex + 1
            }
        }
        case Action.GET_SELECTED_ID: {
            let results = state.saveResults;
            let currentID = state.IDLibrary[state.currentIndex];

            if (state.IDLibrary[action.payload.index] !== undefined) {
                state.IDLibrary[action.payload.index].dirty = true;
            }
            if (action.payload.sessionID !== undefined && action.payload.success) {
                let idx = results.findIndex((each) => each.sessionID === action.payload.sessionID);
                let response = {
                    sessionID: action.payload.sessionID,
                    success: action.payload.success
                }
                if (idx >= 0) {
                    results.splice(idx, 1, response);
                } else {
                    results.push(response);
                }

                if (action.payload.annotationState !== undefined) {
                    currentID.annotationState = action.payload.annotationState;
                }
                if (action.payload.phasesChecked !== undefined) {
                    currentID.phasesChecked = action.payload.phasesChecked;
                }
            }
            return {
                ...state,
                // IDLibrary: state.IDLibrary.splice(state.currentIndex, 1, currentID),
                saveResults: results,
                currentIndex: action.payload.index
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