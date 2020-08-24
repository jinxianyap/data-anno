import { IDState, IDActionTypes, InternalIDState } from './types';
import { Action } from '../Actions';
import { IDProcess } from '../../utils/enums';

const initialState: IDState = {
    processed: false,
    source: '',
    originalIDProcessed: false,
    backIDProcessed: false,
    index: 0,
    internalIndex: 0,
    internalIDs: [],
}

export function IDReducer(
    state = initialState,
    action: IDActionTypes
): IDState {
    switch (action.type) {
        case Action.LOAD_NEXT_ID: {
            return {
                ...action.payload.ID
            }
        }
        case Action.CREATE_NEW_ID: {
            let ID: InternalIDState = {
                processed: false,
                source: state.source,
                originalID: {...state.originalID!},
                backID: {...state.backID!},
                croppedID: {...state.croppedID!},
                documentType: 'MyKad',
                processStage: IDProcess.MYKAD_FRONT
            }
            ID.originalID!.IDBox = action.payload.IDBox;
            ID.originalID!.croppedImage = action.payload.croppedImage;
            let IDs = state.internalIDs;
            IDs.push(ID);
            return {
                ...state,
                internalIDs: IDs
            }
        }
        case Action.REFRESH_IDS: {
            return {
                ...state,
                originalIDProcessed: false,
                backIDProcessed: false,
                internalIndex: 0,
                internalIDs: []
            }
        }
        case Action.SET_ID_BOX: {
            if (state.originalIDProcessed) {
                let IDs = state.internalIDs;
                let idx = state.internalIDs.findIndex((each) => {
                    if (each.backID!.IDBox !== undefined) {
                        return each.backID!.IDBox!.id === action.payload.IDBox.id;
                    }
                    return false;
                });
                if (idx >= 0 && idx !== undefined) {
                    let internalID = IDs[idx];
                    internalID.backID!.IDBox = action.payload.IDBox;
                    internalID.backID!.croppedImage = action.payload.croppedImage;
                    IDs.splice(idx, 1, internalID);
                    return {
                        ...state,
                        internalIDs: IDs
                    }
                } else {
                    let internalID = IDs[state.internalIndex];
                    internalID.backID!.IDBox = action.payload.IDBox;
                    internalID.backID!.croppedImage = action.payload.croppedImage;
                    IDs.splice(state.internalIndex, 1, internalID);
                    return {
                        ...state,
                        internalIDs: IDs
                    }
                }
            } else {
                let IDs = state.internalIDs;
                let idx = state.internalIDs.findIndex((each) => each.originalID!.IDBox!.id === action.payload.IDBox.id)!;
                let internalID = IDs[idx];
                internalID.originalID!.IDBox = action.payload.IDBox;
                IDs.splice(idx, 1, internalID);
                return {
                    ...state,
                    internalIDs: IDs
                }            }
        }
        case Action.SAVE_DOCUMENT_TYPE: {
            let IDs = state.internalIDs;
            let internalID = state.internalIDs[action.payload.internalIndex];
            let stage = IDProcess.OTHER;
            if (action.payload.documentType === 'MyKad') {
                stage = IDProcess.MYKAD_FRONT;
            } else if (action.payload.documentType === 'Passport') {
                stage = IDProcess.PASSPORT;
            }
            internalID.documentType = action.payload.documentType;
            internalID.processStage = stage;
            IDs.splice(action.payload.internalIndex, 1, internalID);
            return {
                ...state,
                internalIDs: IDs
            }
        }
        case Action.UPDATE_VIDEO_DATA: {
            return {
                ...state,
                videoLiveness: action.payload.liveness,
                videoFlags: action.payload.flags
            }
        }
        case Action.SAVE_TO_INTERNAL_ID: {
            let IDs = state.internalIDs;
            let internalID = state.internalIDs[state.internalIndex];
            let index = state.internalIndex + 1;
            if (internalID.processStage === IDProcess.MYKAD_BACK) {
                internalID.backID = action.payload.imageState;
                internalID.processed = true;
            } else {
                internalID.originalID = action.payload.imageState;
                internalID.processed = true;
                if (internalID.processStage === IDProcess.MYKAD_FRONT) {
                    internalID.processStage = IDProcess.MYKAD_BACK;
                    internalID.processed = false;
                    index--;
                }
            }
            IDs.splice(state.internalIndex, 1, internalID);
            return {
                ...state,
                internalIDs: IDs,
                internalIndex: index,
                originalIDProcessed: true,
                backIDProcessed: internalID.processed
            }
        }
        case Action.RESTORE_ID: {
            return {
                ...initialState
            }
        }
        default:
            return state;
    }
}