import { IDState, IDActionTypes, InternalIDState } from './types';
import { Action } from '../Actions';
import { IDProcess, Rotation } from '../../utils/enums';
import { ImageState, IDBox, LandmarkData } from '../image/types';
import { GeneralUtil } from '../../utils/GeneralUtil';
import options from '../../options.json';

const initialState: IDState = {
    dirty: false,
    processed: false,
    dateCreated: '',
    sessionID: '',
    dataLoaded: false,
    originalIDProcessed: false,
    backIDsProcessed: 0,
    originalIDRotation: Rotation.ROT0,
    backIDRotation: Rotation.ROT0,
    annotationState: {
        front: {seg: false, landmark: false, ocr: false},
        back: {seg: false, landmark: false, ocr: false},
        match: false,
        video: false
    },
    phasesChecked: {front: false, back: false, video: false, face: false},
    index: 0,
    internalIndex: 0,
    internalIDs: [],
}

function cloneImageState(original: ImageState, IDBox?: IDBox, passesCrop?: boolean): ImageState {
    const getDeepCopy = (obj: any) => {
        return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
    };
    return {
        image: new File([original.image], original.image.name),
        passesCrop: passesCrop !== undefined ? passesCrop : getDeepCopy(original.passesCrop),
        IDBox: IDBox !== undefined ? IDBox : getDeepCopy(original.IDBox),
        croppedImage: original.croppedImage === undefined ? undefined : new File([original.croppedImage], original.croppedImage.name),
        imageProps: getDeepCopy(original.imageProps),
        landmark: getDeepCopy(original.landmark),
        currentSymbol: getDeepCopy(original.currentSymbol),
        ocr: getDeepCopy(original.ocr),
        ocrToLandmark: getDeepCopy(original.ocrToLandmark),
        currentWord: getDeepCopy(original.currentWord),
    }
}

export function IDReducer(
    state = initialState,
    action: IDActionTypes
): IDState {
    switch (action.type) {
        case Action.LOAD_NEXT_ID: {
            return {
                ...action.payload.ID,
                internalIndex: 0,
                internalIDs: action.payload.ID.internalIDs.map((each) => {
                    if (each.processStage === IDProcess.DOUBLE_BACK) {
                        each.processStage = IDProcess.DOUBLE_FRONT;
                    }
                    return each;
                }),
                dirty: true,
            }
        }
        case Action.CREATE_NEW_ID: {
            let docType = action.payload.documentType !== undefined ? action.payload.documentType : 'mykad';
            let ID: InternalIDState = {
                processed: false,
                source: state.sessionID,
                originalID: cloneImageState(state.originalID!, action.payload.IDBox, action.payload.passesCrop),
                backID: cloneImageState(state.backID!),
                documentType: docType,
                processStage: GeneralUtil.getInitialIDProcess(docType)
            }
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
                if (action.payload.landmarks !== undefined) {
                    let landmarks: LandmarkData[] = [];
                    if (id.originalID!.landmark.length === 0) {
                        landmarks = action.payload.landmarks;
                    } else {
                        landmarks = id.originalID!.landmark.map((each) => {
                            let acLm = action.payload.landmarks!.find((lm) => lm.codeName === each.codeName);
                            if (acLm === undefined) {
                                return each;
                            } else {
                                return acLm;
                            }
                        })
                    }
                    
                    // append missing (usually optional) landmarks
                    if (id.documentType !== undefined && id.processStage !== undefined) {
                        let docIndex = options.landmark.keys.findIndex((each) => each === id.documentType! + id.processStage!);
                        if (docIndex !== -1) {
                            let comp = options.landmark.compulsory.codeNames[docIndex];
                            let opt = options.landmark.optional.codeNames[docIndex];
                            if (landmarks.length < comp.length + opt.length) {
                                comp.forEach((each, idx) => {
                                    if (landmarks.find((lm) => lm.codeName === each) === undefined) {
                                        landmarks.push({
                                            id: landmarks.length,
                                            type: 'landmark',
                                            codeName: each,
                                            name: options.landmark.compulsory.displayNames[docIndex][idx],
                                            flags: []
                                        })
                                    }
                                })
                                opt.forEach((each, idx) => {
                                    if (landmarks.find((lm) => lm.codeName === each) === undefined) {
                                        landmarks.push({
                                            id: landmarks.length,
                                            type: 'landmark',
                                            codeName: each,
                                            name: options.landmark.optional.displayNames[docIndex][idx],
                                            flags: []
                                        })
                                    }
                                })
                            }
                        }
                    }
                    id.originalID!.landmark = landmarks;
                }
                ids.splice(action.payload.index!, 1, id);
            } else {
                let id = ids[state.internalIndex];
                id.backID!.croppedImage = action.payload.croppedImage;
                if (action.payload.landmarks !== undefined) {
                    let landmarks: LandmarkData[] = [];
                    if (id.backID!.landmark.length === 0) {
                        landmarks = action.payload.landmarks;
                    } else {
                        landmarks = id.backID!.landmark.map((each) => {
                            let acLm = action.payload.landmarks!.find((lm) => lm.codeName === each.codeName);
                            if (acLm === undefined) {
                                return each;
                            } else {
                                return acLm;
                            }
                        })
                    }

                    if (id.documentType !== undefined && id.processStage !== undefined) {
                        let docIndex = options.landmark.keys.findIndex((each) => each === id.documentType! + id.processStage!);
                        if (docIndex !== -1) {
                            let comp = options.landmark.compulsory.codeNames[docIndex];
                            let opt = options.landmark.optional.codeNames[docIndex];
                            if (landmarks.length < comp.length + opt.length) {
                                comp.forEach((each, idx) => {
                                    if (landmarks.find((lm) => lm.codeName === each) === undefined) {
                                        landmarks.push({
                                            id: landmarks.length,
                                            type: 'landmark',
                                            codeName: each,
                                            name: options.landmark.compulsory.displayNames[docIndex][idx],
                                            flags: []
                                        })
                                    }
                                })
                                opt.forEach((each, idx) => {
                                    if (landmarks.find((lm) => lm.codeName === each) === undefined) {
                                        landmarks.push({
                                            id: landmarks.length,
                                            type: 'landmark',
                                            codeName: each,
                                            name: options.landmark.optional.displayNames[docIndex][idx],
                                            flags: []
                                        })
                                    }
                                })
                            }
                        }
                    }
                    id.backID!.landmark = landmarks;
                }
                
                ids.splice(state.internalIndex, 1, id);
            }

            return {
                ...state,
                internalIDs: ids
            }
        }
        case Action.SET_ID_BOX: {
            if (state.internalIDs[state.internalIndex].processStage === IDProcess.DOUBLE_BACK) {
                let IDs = state.internalIDs;
                let internalID = IDs[state.internalIndex];
                internalID.backID!.IDBox = action.payload.IDBox;
                internalID.backID!.croppedImage = action.payload.croppedImage;
                if (JSON.stringify(action.payload.IDBox.position) !== JSON.stringify(internalID.backID!.IDBox)) {
                    internalID.backID!.landmark = [];
                    internalID.backID!.ocr = [];
                }
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
                if (JSON.stringify(action.payload.IDBox.position) !== JSON.stringify(internalID.originalID!.IDBox)) {
                    internalID.originalID!.landmark = [];
                    internalID.originalID!.ocr = [];
                }
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
            let stage = GeneralUtil.getInitialIDProcess(action.payload.documentType);
            if (stage === IDProcess.DOUBLE_FRONT) {
                stage = internalID.processStage === IDProcess.DOUBLE_BACK ? IDProcess.DOUBLE_BACK : IDProcess.DOUBLE_FRONT;
            }
            if (internalID.documentType !== action.payload.documentType) {
                internalID.faceCompareMatch = undefined;
                internalID.originalID!.landmark = [];
                internalID.originalID!.ocr = [];
                internalID.originalID!.currentSymbol = undefined;
                internalID.originalID!.currentWord = undefined;
                internalID.backID!.landmark = [];
                internalID.backID!.ocr = [];
                internalID.backID!.currentSymbol = undefined;
                internalID.backID!.currentWord = undefined;
            }
            internalID.documentType = action.payload.documentType;
            internalID.processStage = stage;
           
            IDs.splice(action.payload.internalIndex, 1, internalID);
            return {
                ...state,
                internalIDs: IDs
            }
        }
        case Action.SET_IMAGE_ROTATION: {
            if (state.originalIDProcessed && state.internalIDs[state.internalIndex].processStage === IDProcess.DOUBLE_BACK) {
                state.backIDRotation = action.payload.idRotation;
                state.backID!.image = action.payload.id;
                if (state.givenData !== undefined && state.givenData.backID !== undefined) {
                    if (state.givenData.backID.originalImageProps !== undefined) {
                        state.givenData.backID.originalImageProps = {
                            width: state.givenData.backID.originalImageProps.height,
                            height: state.givenData.backID.originalImageProps.width
                        }
                    }
                }
                if (state.internalIDs.length > 0) {
                    let ids = state.internalIDs;
                    return {
                        ...state,
                        internalIDs: ids.map((each) => {each.backID!.image = action.payload.id; return each})
                    }
                }
            } else if (!state.originalIDProcessed ||
                (state.internalIDs[state.internalIndex] !== undefined && state.internalIDs[state.internalIndex].processStage !== IDProcess.DOUBLE_BACK)) {
                state.originalIDRotation = action.payload.idRotation;
                state.originalID!.image = action.payload.id;
                if (state.givenData !== undefined && state.givenData.originalID !== undefined) {
                    if (state.givenData.originalID.originalImageProps !== undefined) {
                        state.givenData.originalID.originalImageProps = {
                            width: state.givenData.originalID.originalImageProps.height,
                            height: state.givenData.originalID.originalImageProps.width
                        }
                    }
                }
                if (state.internalIDs.length > 0) {
                    let ids = state.internalIDs;
                    return {
                        ...state,
                        internalIDs: ids.map((each) => {each.originalID!.image = action.payload.id; return each})
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
            if (internalID.processStage === IDProcess.DOUBLE_BACK) {
                internalID.backID = action.payload.imageState;
                internalID.processStage = IDProcess.DOUBLE_FRONT;
                state.processed = state.backIDsProcessed + 1 === state.internalIDs.length;
                backIds = state.backIDsProcessed + 1;
                internalID.processed = true;
            } else {
                internalID.originalID = action.payload.imageState;
                if (internalID.processStage === IDProcess.DOUBLE_FRONT) {
                    internalID.processStage = IDProcess.DOUBLE_BACK;
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
        case Action.UPDATE_FRONT_ID_FLAGS: {
            return {
                ...state,
                frontIDFlags: action.payload.flags
            }
        }
        case Action.UPDATE_BACK_ID_FLAGS: {
            return {
                ...state,
                backIDFlags: action.payload.flags
            }
        }
        case Action.RESTORE_ID: {
            return {
                ...initialState
            }
        }
        case Action.SET_ID_FACE_MATCH: {
            return {
                ...state,
                faceCompareMatch: action.payload.match
            }
        }
        case Action.CLEAR_INTERNAL_IDS: {
            return {
                ...state,
                internalIDs: [],
                internalIndex: 0
            }
        }
        case Action.BACK_TO_ORIGINAL: {
            let idx = state.internalIndex;
            let ids = state.internalIDs;
            let intId = ids[idx];
            if (intId.processStage === IDProcess.DOUBLE_BACK) {
                intId.processStage = IDProcess.DOUBLE_FRONT;
                ids.splice(idx, 1, intId);
            }
            return {
                ...state,
                internalIDs: ids
            }
        }
        case Action.SET_FACE_COMPARE_MATCH: {
            let idx = state.internalIndex;
            let ids = state.internalIDs;
            let intId = ids[idx];
            if (intId !== undefined) {
                intId.faceCompareMatch = action.payload.match;
                ids.splice(idx, 1, intId);
            }
            return {
                ...state,
                internalIDs: ids
            }
        }
        default:
            return state;
    }
}