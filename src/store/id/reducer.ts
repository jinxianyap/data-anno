import { IDState, IDActionTypes, InternalIDState } from './types';
import { Action } from '../Actions';
import { IDProcess, Rotation } from '../../utils/enums';
import { ImageState } from '../image/types';

const initialState: IDState = {
    processed: false,
    source: '',
    originalIDProcessed: false,
    backIDsProcessed: 0,
    originalIDRotation: Rotation.ROT0,
    backIDRotation: Rotation.ROT0,
    croppedIDRotation: Rotation.ROT0,
    index: 0,
    internalIndex: 0,
    internalIDs: [],
}

function cloneImageState(original: ImageState): ImageState {
    const getDeepCopy = (obj: any) => {
        return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
    };

    return {
        image: new File([original.image], original.image.name),
        passesCrop: getDeepCopy(original.passesCrop),
        IDBox: getDeepCopy(original.IDBox),
        croppedImage: original.croppedImage === undefined ? undefined : new File([original.croppedImage], original.croppedImage.name),
        imageProps: getDeepCopy(original.imageProps),
        landmark: getDeepCopy(original.landmark),
        currentSymbol: getDeepCopy(original.currentSymbol),
        ocr: getDeepCopy(original.ocr),
        ocrToLandmark: getDeepCopy(original.ocrToLandmark),
        currentWord: getDeepCopy(original.currentWord),
        faceCompareMatch: getDeepCopy(original.faceCompareMatch)
    }
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
                originalID: cloneImageState(state.originalID!),
                backID: cloneImageState(state.backID!),
                documentType: 'MyKad',
                processStage: IDProcess.MYKAD_FRONT
            }
            ID.originalID!.IDBox = action.payload.IDBox;
            ID.originalID!.passesCrop = action.payload.passesCrop;
            let IDs = state.internalIDs;
            IDs.push(ID);
            return {
                ...state,
                internalIDs: IDs
            }
        }
        case Action.REFRESH_IDS: {
            if (!action.payload.originalIDProcessed) {
                return {
                    ...state,
                    originalIDProcessed: action.payload.originalIDProcessed,
                    backIDsProcessed: 0,
                    internalIndex: 0,
                    internalIDs: []
                }
            } else {
                let ids = state.internalIDs;
                let internalID = state.internalIDs[state.internalIndex];
                internalID.backID!.IDBox = undefined;
                internalID.backID!.landmark = [];
                internalID.backID!.ocr = [];
                internalID.backID!.passesCrop = undefined;
                ids.splice(state.internalIndex, 1, internalID);
                return {
                    ...state,
                    originalIDProcessed: action.payload.originalIDProcessed,
                    backIDsProcessed: 0,
                    internalIDs: ids
                }
            }
        }
        case Action.SAVE_CROPPED_IMAGE: {
            let ids = state.internalIDs;

            if (!state.originalIDProcessed) {
                let id = ids[action.payload.index!];
                id.originalID!.croppedImage = action.payload.croppedImage;
            } else {
                let id = ids[state.internalIndex];
                id.backID!.croppedImage = action.payload.croppedImage;
                ids.splice(state.internalIndex, 1, id);
            }

            return {
                ...state,
                internalIDs: ids
            }
        }
        case Action.SET_ID_BOX: {
            if (state.internalIDs[state.internalIndex].processStage === IDProcess.MYKAD_BACK) {
                let IDs = state.internalIDs;
                let internalID = IDs[state.internalIndex];
                internalID.backID!.IDBox = action.payload.IDBox;
                internalID.backID!.croppedImage = action.payload.croppedImage;
                IDs.splice(state.internalIndex, 1, internalID);
                return {
                    ...state,
                    internalIDs: IDs
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
        case Action.DELETE_ID_BOX: {
            if (state.originalIDProcessed) {
                let ids = state.internalIDs;
                let id = ids[state.internalIndex];
                id.backID!.IDBox = undefined;
                ids.splice(state.internalIndex, 1, id);
                return {
                    ...state,
                    internalIDs: ids
                }
            } else {
                let internalIDs = state.internalIDs;
                internalIDs.splice(action.payload.index, 1);
                return {
                    ...state,
                    internalIDs: internalIDs
                }
            }
        }
        case Action.SAVE_DOCUMENT_TYPE: {
            let IDs = state.internalIDs;
            let internalID = state.internalIDs[action.payload.internalIndex];
            let stage = IDProcess.OTHER;
            if (action.payload.documentType === 'MyKad') {
                stage = internalID.processStage === IDProcess.MYKAD_BACK ? IDProcess.MYKAD_BACK : IDProcess.MYKAD_FRONT;
            } else if (action.payload.documentType === 'Passport') {
                stage = IDProcess.PASSPORT;
            }
            internalID.documentType = action.payload.documentType;
            internalID.processStage = stage;
            internalID.originalID!.landmark = [];
            internalID.originalID!.ocr = [];
            internalID.originalID!.currentSymbol = undefined;
            internalID.originalID!.currentWord = undefined;
            internalID.originalID!.faceCompareMatch = undefined;
            internalID.backID!.landmark = [];
            internalID.backID!.ocr = [];
            internalID.backID!.currentSymbol = undefined;
            internalID.backID!.currentWord = undefined;
            internalID.backID!.faceCompareMatch = undefined;
            IDs.splice(action.payload.internalIndex, 1, internalID);
            return {
                ...state,
                internalIDs: IDs
            }
        }
        case Action.SET_IMAGE_ROTATION: {
            if (state.originalIDProcessed && state.internalIDs[state.internalIndex].processStage === IDProcess.MYKAD_BACK) {
                if (action.payload.croppedId) {
                    state.croppedIDRotation = action.payload.idRotation;
                    state.backID!.croppedImage = action.payload.id;
                    if (state.internalIDs.length > 0) {
                        let ids = state.internalIDs;
                        return {
                            ...state,
                            internalIDs: ids.map((each) => {each.backID!.croppedImage = action.payload.id; return each})
                        }
                    }
                } else {
                    state.backIDRotation = action.payload.idRotation;
                    state.backID!.image = action.payload.id;
                    if (state.internalIDs.length > 0) {
                        let ids = state.internalIDs;
                        return {
                            ...state,
                            internalIDs: ids.map((each) => {each.backID!.image = action.payload.id; return each})
                        }
                    }
                }
            } else if (!state.originalIDProcessed ||
                (state.internalIDs[state.internalIndex] !== undefined && state.internalIDs[state.internalIndex].processStage !== IDProcess.MYKAD_BACK)) {
                if (action.payload.croppedId) {
                    state.croppedIDRotation = action.payload.idRotation;
                    state.originalID!.croppedImage = action.payload.id;
                    if (state.internalIDs.length > 0) {
                        let ids = state.internalIDs;
                        return {
                            ...state,
                            internalIDs: ids.map((each) => {each.originalID!.croppedImage = action.payload.id; return each})
                        }
                    }
                } else {
                    state.originalIDRotation = action.payload.idRotation;
                    state.originalID!.image = action.payload.id;
                    if (state.internalIDs.length > 0) {
                        let ids = state.internalIDs;
                        return {
                            ...state,
                            internalIDs: ids.map((each) => {each.originalID!.image = action.payload.id; return each})
                        }
                    }
                }
            }
            return state;
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
            let backIds = 0;
            if (internalID.processStage === IDProcess.MYKAD_BACK) {
                internalID.backID = action.payload.imageState;
                internalID.processStage = IDProcess.MYKAD_FRONT;
                state.processed = state.backIDsProcessed + 1 === state.internalIDs.length;
                backIds = state.backIDsProcessed + 1;
                internalID.processed = true;
            } else {
                internalID.originalID = action.payload.imageState;
                if (internalID.processStage === IDProcess.MYKAD_FRONT) {
                    internalID.processStage = IDProcess.MYKAD_BACK;
                    // internalID.processed = false;
                    backIds = state.backIDsProcessed;
                } else {
                    internalID.processed = true;
                    state.processed = true;
                    backIds = state.internalIndex + 1;
                }
            }
            IDs.splice(state.internalIndex, 1, internalID);

            if (action.payload.next) {
                return {
                    ...state,
                    internalIDs: IDs,
                    internalIndex: state.internalIndex + 1,
                    originalIDProcessed: true,
                    backIDsProcessed: backIds
                }
            } else {
                return {
                    ...state,
                    internalIDs: IDs,
                    originalIDProcessed: true,
                    backIDsProcessed: backIds
                }
            }   
        }
        case Action.UPDATE_OVERALL_FLAGS: {
            return {
                ...state,
                overallFlags: action.payload.flags
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