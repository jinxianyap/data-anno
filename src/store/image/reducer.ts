import { ImageState, ImageActionTypes } from "./types";
import { Action } from "../Actions";

const initialState: ImageState = {
    image: new File([], ''),
    landmark: [],
    ocr: [],
}

export function imageReducer(
    state = initialState,
    action: ImageActionTypes
): ImageState {
    switch (action.type) {
        case Action.LOAD_IMAGE_STATE: {
            if (action.payload.passesCrop !== undefined) {
                action.payload.currentImage.passesCrop = action.payload.passesCrop;
            }
            return action.payload.currentImage;
        }
        case Action.SAVE_SEG_CHECK: {
            return {
                ...state,
                passesCrop: action.payload.passesCrop,
            }
        }
        case Action.SET_IMAGE_PROPS: {
            return {
                ...state,
                imageProps: action.payload.props
            }
        }
        // case Action.SET_ID_BOX: {
        //     return {
        //         ...state,
        //         IDBox: action.payload.IDBox,
        //         croppedImage: action.payload.croppedImage
        //     }
        // }
        case Action.SET_CURRENT_SYMBOL: {
            return {
                ...state,
                currentSymbol: action.payload.symbol,
                ocrToLandmark: action.payload.mapToLandmark
            }
        }

        case Action.ADD_LANDMARK_DATA: {
            let landmarks = state.landmark;

            for (var j = 0; j < landmarks.length; j++) {
                if (landmarks[j].name === action.payload.landmark.name) {
                    landmarks.splice(j, 1);
                }
            } 

            landmarks.push(action.payload.landmark);

            return {
                ...state,
                landmark: landmarks
            }
        }

        case Action.DELETE_LANDMARK_DATA: {
            let landmarks = state.landmark;

            for (var k = 0; k < landmarks.length; k++) {
                if (landmarks[k].name === action.payload.landmark) {
                    landmarks.splice(k, 1);
                }
            } 

            return {
                ...state,
                landmark: landmarks
            }
        }

        case Action.UPDATE_LANDMARK_FLAGS: {
            let landmarks = state.landmark;

            for (var c = 0; c < landmarks.length; c++) {
                if (landmarks[c].name === action.payload.name) {
                    let newLandmark = landmarks[c];
                    newLandmark.flags = action.payload.flags;
                    landmarks[c] = newLandmark;
                }
            }

            return {
                ...state,
                landmark: landmarks
            }
        }

        case Action.ADD_OCR_DATA: {
            let ocr = state.ocr;
            
            for (var d = 0; d < ocr.length; d++) {
                if (ocr[d].name === action.payload.ocr.name) {
                    ocr.splice(d, 1);
                }
            } 

            ocr.push(action.payload.ocr);

            return {
                ...state,
                ocr: ocr
            }
        }

        case Action.SET_CURRENT_VALUE: {
            return {
                ...state,
                currentWord: action.payload.word
            }
        }

        case Action.UPDATE_OCR_DATA: {
            let ocr = state.ocr;

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

            return {
                ...state,
                ocr: ocr
            }
        }

        case Action.SET_FACE_COMPARE_MATCH: {
            return {
                ...state,
                faceCompareMatch: action.payload.match
            }
        }
        case Action.RESTORE_IMAGE: {
            return {
                ...initialState
            }
        }
    }
    return state
}