import { ImageState, ImageActionTypes } from "./types";
import { Action } from "../Actions";

const initialState: ImageState = {
    image: new File([], ''),
    segEdit: {
        IDBoxes: [],
        internalIDProcessed: [],
        croppedIDs: []
    },
    currentIndex: 0,
    imageProps: [],
    landmark: [],
    ocr: [],
    faceCompareMatch: []
}

export function imageReducer(
    state = initialState,
    action: ImageActionTypes
): ImageState {
    switch (action.type) {
        case Action.LOAD_IMAGE_STATE: {
            return {
                ...action.payload.currentImage
            }
        }
        case Action.SAVE_SEG_CHECK: {
            return {
                ...state,
                passesCrop: action.payload.passesCrop,
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                currentIndex: 0,
                landmark: [],
                ocr: [],
            }
        }
        case Action.SET_IMAGE_PROPS: {
            let props = state.imageProps;
            props.push(action.payload.props);
            return {
                ...state,
                imageProps: props
            }
        }
        case Action.ADD_ID_BOX: {
            let newIDList = state.segEdit.IDBoxes;
            newIDList.push(action.payload.IDBox);
            let newProcessedList = state.segEdit.internalIDProcessed;
            newProcessedList.push(false);
            let newCroppedList = state.segEdit.croppedIDs;
            newCroppedList.push(action.payload.croppedID);
            let landmark = state.landmark;
            landmark.push([]);
            let ocr = state.ocr;
            ocr.push([]);
            return {
                ...state,
                landmark: landmark,
                ocr: ocr,
                segEdit: {
                    IDBoxes: newIDList,
                    internalIDProcessed: newProcessedList,
                    croppedIDs: newCroppedList,
                }
            }
        }
        case Action.DELETE_ID_BOX: {
            let id = action.payload.id;
            let boxes = state.segEdit.IDBoxes;
            let internalIDs = state.segEdit.internalIDProcessed;
            let croppedIDs = state.segEdit.croppedIDs;
            let landmark = state.landmark;
            let ocr = state.ocr;

            if (id === -1) {
                id = boxes.length - 1;
            }

            for (var i = 0; i < boxes.length; i++) {
                if (boxes[i].id === id) {
                    boxes.splice(i, 1);
                    internalIDs.splice(i, 1);
                    croppedIDs.splice(i, 1);
                    landmark.splice(i ,1);
                    ocr.splice(i, 1);
                }
            }

            return {
                ...state,
                segEdit: {
                    IDBoxes: boxes,
                    internalIDProcessed: internalIDs,
                    croppedIDs: croppedIDs
                },
                landmark: landmark,
                ocr: ocr
            }
        }

        case Action.SET_CURRENT_SYMBOL: {
            return {
                ...state,
                currentSymbol: action.payload.symbol
            }
        }

        case Action.ADD_LANDMARK_DATA: {
            let allLandmarks = state.landmark;
            let landmarks = allLandmarks[action.payload.index];

            for (var j = 0; j < landmarks.length; j++) {
                if (landmarks[j].name === action.payload.landmark.name) {
                    landmarks.splice(j, 1);
                }
            } 

            landmarks.push(action.payload.landmark);
            allLandmarks[action.payload.index] = landmarks;

            return {
                ...state,
                landmark: allLandmarks
            }
        }

        case Action.DELETE_LANDMARK_DATA: {
            let allLandmarks = state.landmark;
            let landmarks = allLandmarks[action.payload.index];

            for (var k = 0; k < landmarks.length; k++) {
                if (landmarks[k].name === action.payload.landmark) {
                    landmarks.splice(k, 1);
                }
            } 

            allLandmarks[action.payload.index] = landmarks;

            return {
                ...state,
                landmark: allLandmarks
            }
        }

        case Action.UPDATE_LANDMARK_FLAGS: {
            let allLandmarks = state.landmark;
            let landmarks = allLandmarks[action.payload.index];

            for (var c = 0; c < landmarks.length; c++) {
                if (landmarks[c].name === action.payload.name) {
                    let newLandmark = landmarks[c];
                    newLandmark.flags = action.payload.flags;
                    landmarks[c] = newLandmark;
                }
            }

            allLandmarks[action.payload.index] = landmarks;

            return {
                ...state,
                landmark: allLandmarks
            }
        }

        case Action.ADD_OCR_DATA: {
            let allOCR = state.ocr;
            let ocr = allOCR[action.payload.index];
            
            for (var d = 0; d < ocr.length; d++) {
                if (ocr[d].name === action.payload.ocr.name) {
                    ocr.splice(d, 1);
                }
            } 

            ocr.push(action.payload.ocr);
            allOCR[action.payload.index] = ocr;

            return {
                ...state,
                ocr: allOCR
            }
        }

        case Action.SET_CURRENT_VALUE: {
            return {
                ...state,
                currentWord: action.payload.word
            }
        }

        case Action.UPDATE_OCR_DATA: {
            let allOCR = state.ocr;
            let ocr = allOCR[action.payload.index];
            for (var e = 0; e < ocr.length; e++) {
                if (ocr[e].name === action.payload.name) {
                    let currentOcr = ocr[e];
                    let labels = currentOcr.labels;
                    for (var f = 0; f < labels.length; f++) {
                        if (labels[f].value === action.payload.value && labels[f].id === action.payload.id) {
                            let label = labels[f];
                            labels.splice(f, 1);
                            label.position = action.payload.position;
                            labels.push(label);
                            break;
                        }
                    }
                    currentOcr.labels = labels;
                    ocr.splice(e, 1);
                    ocr.push(currentOcr);
                    break;
                }
            }
            allOCR[action.payload.index] = ocr;
            return {
                ...state,
                ocr: allOCR
            }
        }

        case Action.SET_FACE_COMPARE_MATCH: {
            let matches = state.faceCompareMatch;
            matches[action.payload.index] = action.payload.match;
            return {
                ...state,
                faceCompareMatch: matches
            }
        }

        case Action.INCREMENT_INTERNAL_INDEX: {
            return {
                ...state,
                currentIndex: state.currentIndex + 1
            }
        }
    }
    return state
}