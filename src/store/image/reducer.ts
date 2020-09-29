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
            if (action.payload.currentImage === undefined) {
                return state;
            } else {
                return action.payload.currentImage;
            }
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
                if (landmarks[j].codeName === action.payload.landmark.codeName) {
                    landmarks.splice(j, 1);
                }
            } 

            landmarks.push(action.payload.landmark);

            return {
                ...state,
                landmark: landmarks.sort((a, b) => a.id - b.id)
            }
        }

        case Action.CLEAR_LANDMARK_POSITIONS: {
            return {
                ...state,
                landmark: state.landmark.map((each) => { each.position = undefined; return each; })
            }
        }

        case Action.DELETE_LANDMARK_POSITION: {
            let landmarks = state.landmark;
            for (var k = 0; k < landmarks.length; k++) {
                if (landmarks[k].codeName === action.payload.landmark) {
                    let landmark = landmarks[k];
                    landmark.position = undefined
                    landmarks.splice(k, 1, landmark);
                }
            } 
            return {
                ...state,
                landmark: landmarks.sort((a, b) => a.id - b.id)
            }
        }

        case Action.UPDATE_LANDMARK_FLAGS: {
            let landmarks = state.landmark;

            for (var c = 0; c < landmarks.length; c++) {
                if (landmarks[c].codeName === action.payload.codeName) {
                    let newLandmark = landmarks[c];
                    newLandmark.flags = action.payload.flags;
                    landmarks[c] = newLandmark;
                }
            }

            return {
                ...state,
                landmark: landmarks.sort((a, b) => a.id - b.id)
            }
        }

        case Action.ADD_OCR_DATA: {
            let ocr = state.ocr;

            let index = ocr.findIndex((each) => each.codeName === action.payload.ocr.codeName);
            if (index === undefined || index === -1) {
                ocr.push(action.payload.ocr);
            } else {
                let ocrData = ocr[index];
                let labels = ocrData.labels;

                if (ocrData.count < action.payload.ocr.count) {
                    action.payload.ocr.labels.forEach((each, idx) => {
                        let oldLabel = labels.find((label) => label.id === each.id);
                        if (oldLabel === undefined) {
                            labels.push(each);
                        } else {
                            if (each.value !== oldLabel.value) {
                                each.position = oldLabel.position;
                                labels.splice(idx, 1, each);
                            }
                        }
                    });
                } else if (ocrData.count > action.payload.ocr.count) {
                    labels = labels.filter((each) => each.id < action.payload.ocr.count);
                    for (let i = 0; i < labels.length; i++) {
                        let each = labels[i];
                        let newLabel = action.payload.ocr.labels.find((label) => label.id === each.id);
                        if (newLabel !== undefined) {
                            if (each.value !== newLabel.value) {
                                each.value = newLabel.value;
                                labels.splice(i, 1, each);
                            }
                        }
                    }
                } else {
                    labels.forEach((each, idx) => {
                        let newLabel = action.payload.ocr.labels.find((label) => label.id === each.id);
                        if (newLabel === undefined) {
                            labels.splice(idx, 1);
                        } else {
                            if (each.value !== newLabel.value) {
                                newLabel.position = each.position;
                                labels.splice(idx, 1, newLabel);
                            }
                        }
                    })
                }
                ocrData.count = action.payload.ocr.count;
                ocrData.labels = labels;
                ocrData.newlines = action.payload.ocr.newlines;
                ocr.splice(index, 1, ocrData);
            }

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
                if (ocr[e].codeName === action.payload.codeName) {
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

        case Action.CLEAR_OCR_POSITIONS: {
            return {
                ...state,
                ocr: state.ocr.map((each) => {each.labels = each.labels.map((lbl) => {lbl.position = undefined; return lbl;}); return each;})
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