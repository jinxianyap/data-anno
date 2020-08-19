import { IDState, IDActionTypes } from './types';
import { Action } from '../Actions';
import { IDProcess } from '../../utils/enums';

const initialState: IDState = {
    processed: false,
    source: '',
    index: 0,
    documentType: ''
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
        case Action.SAVE_DOCUMENT_TYPE: {
            let stage = IDProcess.OTHER;
            if (action.payload.documentType === 'MyKad') {
                stage = IDProcess.MYKAD_FRONT;
            } else if (action.payload.documentType === 'Passport') {
                stage = IDProcess.PASSPORT;
            }
            return {
                ...state,
                documentType: action.payload.documentType,
                processStage: stage
            }
        }
        case Action.UPDATE_VIDEO_DATA: {
            return {
                ...state,
                videoLiveness: action.payload.liveness,
                videoFlags: action.payload.flags
            }
        }
        default:
            return state;
    }
}