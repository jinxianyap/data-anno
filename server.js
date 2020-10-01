const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const csv = require('csvtojson');
const pkg = require('./package.json');
const testFolder = pkg.dbDirectory;
const outputFolder = 'annotation_output';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, '/build')));

const ccHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': 0
}

// acts as an enum to represent file types
const fileType = {
    front_ori: '0',
    back_ori: '1',

    front_ocr: '2',
    back_ocr: '3',
    cropped_face: '4',

    face: '5',
    face_video: '6',
    face_video_still: '7'
}

const optionalLandmarks = ['religion', 'atm_logo', 'PLogo'];

Object.freeze(fileType);

// ------------------------------------------------------
//                    DATABASE FUNCTIONS
// ------------------------------------------------------ 

function createDirectory(fp) {
    return fs.mkdirSync(fp, {
        recursive: true
    }, (err) => {
        if (err) throw err;
    });
}

function isDirectory(fp) {
    return fs.lstatSync(fp).isDirectory()
}

function readFilesInDirectory(fp) {
    return fs.readdirSync(fp);
}

function readFile(fp) {
    return fs.readFileSync(fp);
}

function writeFile(fp, content) {
    return fs.writeFileSync(fp, content, 'utf8');
}

// ------------------------------------------------------
//                    HELPER FUNCTIONS
// ------------------------------------------------------ 

function fromDateToString(dateObj, isOutput) {
    let year = dateObj.getFullYear().toString();
    let month = dateObj.getMonth() + 1 < 10 ? '0' + (dateObj.getMonth() + 1).toString() : (dateObj.getMonth() + 1).toString();
    let date = dateObj.getDate() < 10 ? '0' + dateObj.getDate().toString() : dateObj.getDate().toString();
    let dateStr = year + month + date;
    if (isOutput) {
        let hour = dateObj.getHours() < 10 ? '0' + dateObj.getHours() : dateObj.getHours();
        let minute = dateObj.getMinutes() < 10 ? '0' + dateObj.getMinutes() : dateObj.getMinutes();
        let second = dateObj.getSeconds() < 10 ? '0' + dateObj.getSeconds() : dateObj.getSeconds();
        dateStr = dateStr + "_" + hour + minute + second;
    }
    return dateStr;
}

function fromStringToDate(date) {
    return new Date(parseInt(date.slice(0, 4)), parseInt(date.slice(4, 6)), parseInt(date.slice(6, 8)));
}

function withinDateRange(date, start, end) {
    return (fromStringToDate(date) >= fromStringToDate(start) && fromStringToDate(date) <= fromStringToDate(end));
}

function getInitialDoctype(filename) {
    // gets document type based on filename
    let keys = filename.split('.')[0].split('_').slice(1);
    return keys[0];
}

function getFileType(filename) {
    let keys = filename.split('.')[0].split('_').slice(1);
    // only compatible for mykad as of now. Will need to modify to cover other document types
    if (keys[0] === 'mykad') {
        switch (keys[1]) {
            case ('front'): {
                return keys[2] === 'ocr' ? fileType.front_ocr : fileType.front_ori;
            }
            case ('back'): {
                return keys[2] === 'ocr' ? fileType.back_ocr : fileType.back_ori;
            }
            case ('face'):
            default: {
                return fileType.cropped_face;
            }
        }
    } else {
        if (keys.length === 1) {
            return fileType.face;
        } else {
            if (keys[1] === 'video') {
                return fileType.face_video;
            } else if (!isNaN(keys[1])) {
                return fileType.face_video_still;
            }
        }
    }
}

// convert from OCRData in json to string
function recomposeOCRValue(terms, newlines) {
    if (newlines.length === 0) return terms.join(' ');
    let split = [];
    let ptr = 0;
    let termPtr = 0;

    while (termPtr < terms.length) {
        if (ptr < newlines.length && termPtr === newlines[ptr]) {
            let prev = split[split.length - 1];
            if (prev.slice(-1) === ' ') {
                prev = prev.slice(0, prev.length - 1)
            }
            split[split.length - 1] = prev + '\n';
            ptr++;
        } else {
            if (termPtr === terms.length - 1) {
                split.push(terms[termPtr]);
            } else {
                split.push(terms[termPtr] + ' ');
            }
            termPtr++;
        }
    }
    return split.join('');
}

// ------------------------------------------------------
//                  READ/WRITE FUNCTIONS
// ------------------------------------------------------ 

// transforms each image file into base64 representation
function allocateFiles(sessionID, route, files) {
    var front_ori,
        back_ori,
        front_ocr,
        back_ocr,
        cropped_face,
        face,
        face_video,
        doc_type,
        doc_faces;
    var face_video_stills = [];

    for (let i = 0; i < files.length; i++) {
        if (isDirectory(route + files[i])) {
            continue;
        }
        let file = readFile(route + files[i]);
        if (file) {
            file = Buffer.alloc(file.byteLength, file, 'binary').toString('base64');
            let type = getFileType(files[i]);
            let imgPrefix = 'data:image/jpg;base64,';
            switch (type) {
                case (fileType.front_ori):
                    front_ori = imgPrefix + file;
                    doc_type = getInitialDoctype(files[i]);
                    break;
                case (fileType.back_ori):
                    back_ori = imgPrefix + file;
                    break;
                case (fileType.front_ocr):
                    front_ocr = imgPrefix + file;
                    break;
                case (fileType.back_ocr):
                    back_ocr = imgPrefix + file;
                    break;
                case (fileType.cropped_face):
                    cropped_face = imgPrefix + file;
                    break;
                case (fileType.face):
                    face = imgPrefix + file;
                    break;
                case (fileType.face_video):
                    face_video = 'data:video/mp4;base64,' + file;
                    break;
                case (fileType.face_video_still):
                    face_video_stills.push(imgPrefix + file);
                    break;
                default:
                    break;
            }
        }
    }

    if (doc_type === 'mykad') {
        doc_faces = 2;
    } else {
        doc_faces = 1;
    }

    return {
        sessionID: sessionID,
        doc_type: doc_type,
        doc_faces: doc_faces,
        front_ori: front_ori,
        back_ori: back_ori,
        front_ocr: front_ocr,
        back_ocr: back_ocr,
        cropped_face: cropped_face,
        face: face,
        face_video: face_video,
        face_video_stills: face_video_stills
    }
}

// evaluate annotation status of a specific session, given sessionID and json data
function evaluateSessionState(sessionRoute, sessionID, jsonFound, json) {
    function getFilesExistence(sessionRoute) {
        var existence = {
            front_ori: false,
            back_ori: false,
            front_ocr: false,
            back_ocr: false,
            cropped_face: false,
            face: false,
            face_video: false,
            face_video_stills: 0
        }
        try {
            let files = readFilesInDirectory(sessionRoute);
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    if (isDirectory(sessionRoute + files[i])) {
                        continue;
                    }
                    let file = readFile(sessionRoute + files[i]);
                    if (file) {
                        let type = getFileType(files[i]);
                        switch (type) {
                            case (fileType.front_ori):
                                existence.front_ori = true;
                                break;
                            case (fileType.back_ori):
                                existence.back_ori = true;
                                break;
                            case (fileType.front_ocr):
                                existence.front_ocr = true;
                                break;
                            case (fileType.back_ocr):
                                existence.back_ocr = true;
                                break;
                            case (fileType.cropped_face):
                                existence.cropped_face = true;
                                break;
                            case (fileType.face):
                                existence.face = true;
                                break;
                            case (fileType.face_video):
                                existence.face_video = true;
                                break;
                            case (fileType.face_video_still):
                                existence.face_video_stills++;
                                break;
                            default:
                                break;
                        }
                    }
                }
                return existence;
            } else {
                return undefined;
            }
        } catch (err) {
            console.error('Session ID: ' + sessionID + ' - Failed to read session files.');
            return undefined;
        }
    }

    function checkOCRState(front) {
        let seg = false;
        let landmark = false;
        let ocr = false;
        let skippedSeg = false;
        let segData = front ? json.segmentation.originalID : json.segmentation.backID;
        let segFlags = front ? json.frontIDFlags : json.backIDFlags;

        function isValidPosition(pos) {
            if (pos === undefined) return false;
            return Object.keys(pos).every((e) => pos[e] !== undefined && !isNaN(pos[e]));
        }

        // check seg
        if (segData !== undefined && segData.length > 0) {
            if (segData.length === 1 && segData[0].IDBox === undefined) {
                // single empty entry
                skippedSeg = true;
                if (front) {
                    seg = segFlags.length > 0;
                } else {
                    seg = segFlags.length > 0 ? true : (json.frontIDFlags.length > 0 ||
                        (json.processStage[0] !== undefined && json.processStage[0] === ''));
                }
            } else {
                // check if coordinates are present
                seg = segData.every((each) => each.IDBox !== undefined && isValidPosition(each.IDBox.position));
            }
        } else {
            // no segData, check if got flags to justify
            skippedSeg = true;
            if (front) {
                seg = segFlags.length > 0;
            } else {
                seg = segFlags.length > 0 ? true : (json.frontIDFlags.length > 0 ||
                    (json.processStage[0] !== undefined && json.processStage[0] === ''));
            }
        }

        // go on to check landmark if seg is annotated
        if (skippedSeg) {
            landmark = true;
        } else if (seg === true) {
            let landmarkData = front ? json.landmarks.originalID : json.landmarks.backID;
            if (landmarkData !== undefined && landmarkData.length > 0 && landmarkData.length === segData.length &&
                landmarkData.every((e) => e.length > 0)) {
                // Q: need to check if the set of landmark is complete?????
                // religion optional
                landmark = landmarkData.every((each) => {
                    if (each.length > 0) {
                        return each.every((lm) => optionalLandmarks.includes(lm.codeName) || isValidPosition(lm.position))
                    }
                    return false;
                });
            }
        }

        // go on to check ocr if landmark is annotated
        if (skippedSeg) {
            ocr = true;
        } else if (landmark === true) {
            let ocrData = front ? json.ocr.originalID : json.ocr.backID;
            if (ocrData !== undefined && ocrData.length > 0 && ocrData.length === segData.length &&
                ocrData.every((e) => e.length > 0)) {
                ocr = ocrData.every((ocrs) => {
                    if (ocrs !== undefined) {
                        return ocrs.every((o) => {
                            if (optionalLandmarks.includes(o.mapToLandmark)) {
                                return true;
                            } else if (o.count === 1) {
                                return o.labels.length === 1 && o.labels[0].value !== '' && o.labels[0].value !== undefined;
                            } else if (o.count > 1) {
                                return o.labels.length === o.count && o.labels.every((lbl) => lbl.value !== '' && lbl.value !== undefined && isValidPosition(lbl.position));
                            } else {
                                return false;
                            }
                        });
                    } else {
                        return false;
                    }
                })
            }
        }

        return {
            seg,
            landmark,
            ocr
        };
    }

    var existence = getFilesExistence(sessionRoute);
    if (existence !== undefined) {
        var phasesToCheck = {
            front: existence.front_ori,
            back: existence.back_ori,
            video: existence.face_video,
            face: existence.front_ori && existence.face
        }
        var annotationStates = {
            front: {
                seg: false,
                landmark: false,
                ocr: false
            },
            back: {
                seg: false,
                landmark: false,
                ocr: false
            },
            video: false,
            match: false
        }
        var shouldIgnore = {
            back: false,
            face: false
        }

        if (jsonFound) {
            // check front
            if (phasesToCheck.front) {
                let frontState = checkOCRState(true);
                annotationStates.front = frontState;
            } else {
                annotationStates.front = {
                    seg: true,
                    landmark: true,
                    ocr: true
                };
                shouldIgnore.back = true;
                shouldIgnore.face = true;
            }

            // check back
            if (phasesToCheck.back && !shouldIgnore.back) {
                let backState = checkOCRState(false);
                annotationStates.back = backState;
            } else {
                annotationStates.back = {
                    seg: true,
                    landmark: true,
                    ocr: true
                };
            }

            // check liveness
            annotationStates.video = phasesToCheck.video ? (json.videoLiveness === true || json.videoLiveness === false) : true;
            // check seg originalid exists same for ladmark and ocr
            // check face
            if (phasesToCheck.face && !shouldIgnore.face) {
                // first case where segmentation has been done
                // second case where it hasn't but a face only process was done before
                annotationStates.match = (json.faceCompareMatch.length === json.segmentation.originalID.length &&
                        json.faceCompareMatch.every((each) => each === true || each === false)) ||
                    (json.faceCompareMatch.length === 1 && json.faceCompareMatch[0]);
            } else {
                annotationStates.match = true;
            }
        }
        return {
            sessionID: sessionID,
            phasesChecked: phasesToCheck,
            annotationState: annotationStates
        }
    } else {
        return undefined;
    }
}

// load data from json (if available)
function updateDataWithJSON(result, data) {
    function updateOCR(ocrResults, front) {
        // for landmarks and ocrs
        if (ocrResults !== undefined) {
            // if csv data found
            let landmarks = front ? data.landmarks.originalID : data.landmarks.backID;
            let ocrs = front ? data.ocr.originalID : data.ocr.backID;

            // updating landmarks using json data
            if (landmarks !== undefined && landmarks.length > 0 && !(landmarks.length === 1 && landmarks[0].length === 0)) {
                if (ocrResults.glare_results !== undefined) {
                    ocrResults.glare_results = landmarks.map((lm) => {
                        return ocrResults.glare_results.map((each) => {
                            let landmark = lm.find((llm) => llm.codeName === each.field);
                            if (landmark !== undefined) {
                                each.glare = landmark.flags.includes('glare');
                            }
                            return each;
                        })
                    });
                } else {
                    ocrResults.glare_results = landmarks.map((lm) => {
                        return lm.map((each) => {
                            return {
                                field: each.codeName,
                                glare: each.flags.includes('glare')
                            }
                        })
                    })
                }

                if (ocrResults.landmarks !== undefined) {
                    // json data takes precedence over csv data
                    ocrResults.landmarks = landmarks.map((currLm) => {
                        if (currLm.length > 0) {
                            return currLm.map((landmark) => {
                                let hgt = front ? data.croppedImageProps.originalID.height : data.croppedImageProps.backID.height;
                                if (landmark.position === undefined) {
                                    return undefined;
                                }
                                return {
                                    id: landmark.codeName,
                                    score: 0,
                                    coords: [landmark.position.x1,
                                        hgt - landmark.position.y1,
                                        landmark.position.x2,
                                        hgt - landmark.position.y4
                                    ]
                                }
                            }).filter((each) => each !== undefined);
                        } else {
                            return ocrResults.landmarks.map((each) => {
                                let landmark = currLm.find((llm) => llm.codeName === each.id);
                                if (landmark !== undefined) {
                                    if (front && data.croppedImageProps.originalID !== undefined && data.croppedImageProps.originalID.height !== undefined) {
                                        each.coords = [landmark.position.x1,
                                            data.croppedImageProps.originalID.height - landmark.position.y1,
                                            landmark.position.x2,
                                            data.croppedImageProps.originalID.height - landmark.position.y4
                                        ];
                                    } else if (!front && data.croppedImageProps.backID !== undefined && data.croppedImageProps.backID.height !== undefined) {
                                        each.coords = [landmark.position.x1,
                                            data.croppedImageProps.backID.height - landmark.position.y1,
                                            landmark.position.x2,
                                            data.croppedImageProps.backID.height - landmark.position.y4
                                        ];
                                    }
                                }
                                return each;
                            })
                        }
                    })
                } else {
                    ocrResults.landmarks = landmarks.map((currLm, idx) => {
                        let hgt = 0;
                        if (front && data.croppedImageProps.originalID !== undefined && data.croppedImageProps.originalID.height !== undefined) {
                            if (data.croppedImageProps.originalID.height === -1) {
                                segCrop = data.segmentation.originalID;
                                if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                    hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                                }
                            } else {
                                hgt = data.croppedImageProps.originalID.height;
                            }
                        } else if (!front && data.croppedImageProps.backID !== undefined && data.croppedImageProps.backID.height !== undefined) {
                            if (data.croppedImageProps.backID.height === -1) {
                                segCrop = data.segmentation.backID;
                                if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                    hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                                }
                            } else {
                                hgt = data.croppedImageProps.backID.height;
                            }
                        }
                        return currLm.map((landmark) => {
                            if (landmark.position === undefined) return undefined;
                            return {
                                id: landmark.codeName,
                                score: 0,
                                coords: [landmark.position.x1,
                                    hgt - landmark.position.y1,
                                    landmark.position.x2,
                                    hgt - landmark.position.y4
                                ]
                            }
                        }).filter((each) => each !== undefined);
                    })
                }
            } else {
                // if json has no landmark data
                ocrResults.glare_results = [ocrResults.glare_results];
                ocrResults.landmarks = [ocrResults.landmarks];
            }

            // updating ocrs using json data
            if (ocrs !== undefined && ocrs.length > 0 && !(ocrs.length === 1 && ocrs[0].length === 0)) {
                if (ocrResults.ocr_results !== undefined) {
                    // if csv has ocr results
                    ocrResults.ocr_results = ocrs.map((currOcr) => {
                        if (currOcr.length > 0) {
                            // json data takes precedence over csv data
                             return currOcr.map((ocr) => {
                                let text = '';
                                if (ocr.codeName === 'name' || ocr.codeName === 'address') {
                                    text = recomposeOCRValue(ocr.labels.map((lbl) => lbl.value), ocr.newlines);
                                } else {
                                    text = ocr.labels.map((lbl) => lbl.value).join(' ');
                                }
                                return {
                                    field: ocr.codeName,
                                    score: 0,
                                    text: text,
                                    coords: ocr.labels.map((lbl) => {
                                        if (lbl.position !== undefined) {
                                            if (front && data.croppedImageProps.originalID !== undefined && data.croppedImageProps.originalID.height !== undefined) {
                                                return [lbl.position.x1,
                                                    data.croppedImageProps.originalID.height - lbl.position.y1,
                                                    lbl.position.x2,
                                                    data.croppedImageProps.originalID.height - lbl.position.y4
                                                ];
                                            } else if (!front && data.croppedImageProps.backID !== undefined && data.croppedImageProps.backID.height !== undefined) {
                                                return [lbl.position.x1,
                                                    data.croppedImageProps.backID.height - lbl.position.y1,
                                                    lbl.position.x2,
                                                    data.croppedImageProps.backID.height - lbl.position.y4
                                                ];
                                            }
                                        } else {
                                            return [];
                                        }
                                    })
                                }
                            })
                        } else {
                            return csvOcr.map((each) => {
                                let ocr = currOcr.find((o) => o.codeName === each.field);
                                if (ocr !== undefined) {
                                    let text = '';
                                    if (ocr.codeName === 'name' || ocr.codeName === 'address') {
                                        text = recomposeOCRValue(ocr.labels.map((lbl) => lbl.value), ocr.newlines);
                                    } else {
                                        text = ocr.labels.map((lbl) => lbl.value).join(' ');
                                    }
                                    each.text = text,
                                        each.coords = ocr.labels.map((lbl) => {
                                            if (lbl.position !== undefined) {
                                                if (front && data.croppedImageProps.originalID !== undefined && data.croppedImageProps.originalID.height !== undefined) {
                                                    return [lbl.position.x1,
                                                        data.croppedImageProps.originalID.height - lbl.position.y1,
                                                        lbl.position.x2,
                                                        data.croppedImageProps.originalID.height - lbl.position.y4
                                                    ];
                                                } else if (!front && data.croppedImageProps.backID !== undefined && data.croppedImageProps.backID.height !== undefined) {
                                                    return [lbl.position.x1,
                                                        data.croppedImageProps.backID.height - lbl.position.y1,
                                                        lbl.position.x2,
                                                        data.croppedImageProps.backID.height - lbl.position.y4
                                                    ];
                                                }
                                            } else {
                                                return [];
                                            }
                                        })
                                }
                                return each;
                            })
                        }
                    })
                } else {
                    // csv has no ocr data
                    ocrResults.ocr_results = ocrs.map((currOcr, idx) => {
                        let hgt = 0;
                        if (front && data.croppedImageProps.originalID !== undefined && data.croppedImageProps.originalID.height !== undefined) {
                            if (data.croppedImageProps.originalID.height === -1) {
                                segCrop = data.segmentation.originalID;
                                if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                    hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                                }
                            } else {
                                hgt = data.croppedImageProps.originalID.height;
                            }
                        } else if (!front && data.croppedImageProps.backID !== undefined && data.croppedImageProps.backID.height !== undefined) {
                            if (data.croppedImageProps.backID.height === -1) {
                                segCrop = data.segmentation.backID;
                                if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                    hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                                }
                            } else {
                                hgt = data.croppedImageProps.backID.height;
                            }
                        }
                        return currOcr.map((ocr) => {
                            let text = '';
                            if (ocr.codeName === 'name' || ocr.codeName === 'address') {
                                text = recomposeOCRValue(ocr.labels.map((lbl) => lbl.value), ocr.newlines);
                            } else {
                                text = ocr.labels.map((lbl) => lbl.value).join(' ');
                            }
                            return {
                                field: ocr.codeName,
                                score: 0,
                                text: text,
                                coords: ocr.labels.map((lbl) => {
                                    if (lbl.position !== undefined) {
                                        return [lbl.position.x1,
                                            hgt - lbl.position.y1,
                                            lbl.position.x2,
                                            hgt - lbl.position.y4
                                        ];
                                    } else {
                                        return [];
                                    }
                                })
                            }
                        })
                    })
                }
            } else {
                // if json has no ocr data
                ocrResults.ocr_results = [ocrResults.ocr_results];
            }

            // updating spoof results
            if (ocrResults.spoof_results !== undefined) {
                if (front) {
                    ocrResults.spoof_results.is_card_spoof = data.frontIDFlags !== undefined ? data.frontIDFlags.includes('spoof') : false;
                } else {
                    ocrResults.spoof_results.is_card_spoof = data.backIDFlags !== undefined ? data.backIDFlags.includes('spoof') : false;
                }
            } else {
                if (front) {
                    ocrResults.spoof_results = {
                        is_card_spoof: data.frontIDFlags !== undefined ? data.frontIDFlags.includes('spoof') : false
                    }
                } else {
                    ocrResults.spoof_results = {
                        is_card_spoof: data.backIDFlags !== undefined ? data.backIDFlags.includes('spoof') : false
                    }
                }
            }
        } else {
            // if no csv but has json
            ocrResults = {};
            let landmarks = front ? data.landmarks.originalID : data.landmarks.backID;
            let ocrs = front ? data.ocr.originalID : data.ocr.backID;

            // landmarks
            if (landmarks !== undefined && landmarks.length > 0 && !(landmarks.length === 1 && landmarks[0].length === 0)) {
                ocrResults.glare_results = landmarks.map((lm) => {
                    return lm.map((each) => {
                        return {
                            field: each.codeName,
                            glare: each.flags.includes('glare')
                        }
                    })
                })

                ocrResults.landmarks = landmarks.map((currLm, idx) => {
                    let hgt = front ? data.croppedImageProps.originalID.height : data.croppedImageProps.backID.height;

                    if (hgt === -1) {
                        if (front) {
                            segCrop = data.segmentation.originalID;
                            if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                            }
                        } else {
                            segCrop = data.segmentation.backID;
                            if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                            }
                        }
                    }
                    return currLm.map((landmark) => {
                        if (landmark.position === undefined) return undefined;
                        return {
                            id: landmark.codeName,
                            score: 0,
                            coords: [landmark.position.x1,
                                hgt - landmark.position.y1,
                                landmark.position.x2,
                                hgt - landmark.position.y4
                            ]
                        }
                    }).filter((each) => each !== undefined);
                })
            }

            // ocrs
            if (ocrs !== undefined && ocrs.length > 0 && !(ocrs.length === 1 && ocrs[0].length === 0)) {
                ocrResults.ocr_results = ocrs.map((currOcr, idx) => {
                    let hgt = front ? data.croppedImageProps.originalID.height : data.croppedImageProps.backID.height;
                    if (hgt === -1) {
                        if (front) {
                            segCrop = data.segmentation.originalID;
                            if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                            }
                        } else {
                            segCrop = data.segmentation.backID;
                            if (segCrop[idx] !== undefined && segCrop[idx].IDBox !== undefined) {
                                hgt = segCrop[idx].IDBox.position.y1 - segCrop[idx].IDBox.position.y4;
                            }
                        }
                    }
                    return currOcr.map((ocr) => {
                        let text = '';
                        if (ocr.codeName === 'name' || ocr.codeName === 'address') {
                            text = recomposeOCRValue(ocr.labels.map((lbl) => lbl.value), ocr.newlines);
                        } else {
                            text = ocr.labels.map((lbl) => lbl.value).join(' ');
                        }
                        return {
                            field: ocr.codeName,
                            score: 0,
                            text: text,
                            coords: ocr.labels.map((lbl) => {
                                if (lbl.position !== undefined) {
                                    return [lbl.position.x1,
                                        hgt - lbl.position.y1,
                                        lbl.position.x2,
                                        hgt - lbl.position.y4
                                    ];
                                } else {
                                    return [];
                                }
                            })
                        }
                    })
                })
            }

            // spoof results
            if (front) {
                ocrResults.spoof_results = {
                    is_card_spoof: data.frontIDFlags !== undefined ? data.frontIDFlags.includes('spoof') : false
                }
            } else {
                ocrResults.spoof_results = {
                    is_card_spoof: data.backIDFlags !== undefined ? data.backIDFlags.includes('spoof') : false
                }
            }
        }

        ocrResults.flags = front ? data.frontIDFlags : data.backIDFlags;
        ocrResults.croppedImageProps = front ? data.croppedImageProps.originalID : data.croppedImageProps.backID;
        ocrResults.originalImageProps = front ? data.originalImageProps.originalID : data.originalImageProps.backID;

        return ocrResults;
    }

    let newResult = {};
    // segmentation
    newResult.segmentation = {
        originalID: data.segmentation.originalID !== undefined ? data.segmentation.originalID.filter((each) => each.IDBox !== null).map((each, idx) => {
            return {
                documentType: data.documentType[idx],
                passesCrop: each.passesCrop,
                coords: [each.IDBox.position.x1,
                    each.IDBox.position.y1,
                    each.IDBox.position.x2,
                    each.IDBox.position.y2,
                    each.IDBox.position.x3,
                    each.IDBox.position.y3,
                    each.IDBox.position.x4,
                    each.IDBox.position.y4
                ]
            }
        }) : [],
        backID: data.segmentation.backID !== undefined ? data.segmentation.backID.filter((each) => each.IDBox !== null).map((each) => {
            if (each.IDBox === undefined) {
                return {};
            }
            return {
                passesCrop: each.passesCrop !== undefined ? each.passesCrop : false,
                coords: [each.IDBox.position.x1,
                    each.IDBox.position.y1,
                    each.IDBox.position.x2,
                    each.IDBox.position.y2,
                    each.IDBox.position.x3,
                    each.IDBox.position.y3,
                    each.IDBox.position.x4,
                    each.IDBox.position.y4
                ]
            }
        }) : []
    }
    // front ocr
    newResult.front_ocr = updateOCR(result !== undefined ? result.front_ocr : undefined, true);
    // back ocr
    newResult.back_ocr = updateOCR(result !== undefined ? result.back_ocr : undefined, false);
    // face comparison
    newResult.face_compare = {
        faceCompareMatch: data.faceCompareMatch,
        liveness: data.videoLiveness,
        videoFlags: data.videoFlags
    }
    newResult.source = 'json';
    return newResult;
}

// load data from csv
function getCSVData(filepath, session, res, rej) {
    csv()
        .fromFile(filepath)
        .then(async (json) => {
            let result = {};
            let sessionData = json.filter((each) => each.session_id === session.sessionID);
            // front ocr data
            // both ori and ocr images are present -> front ocr succeeded
            if (session.front_ori && session.front_ocr) {
                let frontEntries = sessionData.filter((each) => each.doc_type === 'MYKAD_FRONT');
                if (frontEntries.length === 6) {
                    // this means a selfie video was uploaded
                    // result_ocr field are all equivalent, but liveness & confidence section differs among entries
                    let result_ocr = JSON.parse(frontEntries[0].result_ocr);
                    result.front_ocr = {
                        glare_results: result_ocr.glare_results,
                        landmarks: result_ocr.landmarks,
                        ocr_results: result_ocr.ocr_results,
                        spoof_results: result_ocr.spoof_results
                    };
                    let faceResults = frontEntries.filter((each) => each.type === 'FACE_VS_MYKAD').map((each) => JSON.parse(each.result_face)).filter((each) => each.success);
                    let liveness = frontEntries.find((each) => each.type === 'FACE_LIVENESS');
                    result.face_compare = {
                        success: faceResults.length === 5,
                        confidence: faceResults.map((each) => each.collection[0].confidence).reduce((a, b) => Math.max(a, b)),
                        liveness: liveness !== undefined && JSON.parse(liveness.result_face).status.code === 0 ? liveness.liveness_probability : undefined
                    }
                } else if (frontEntries.length > 0) {
                    // this means no selfie video was uploaded
                    await new Promise((res, rej) => {
                        if (frontEntries.length === 1) {
                            let result_ocr = JSON.parse(frontEntries[0].result_ocr);
                            result.front_ocr = {
                                glare_results: result_ocr.glare_results,
                                landmarks: result_ocr.landmarks,
                                ocr_results: result_ocr.ocr_results,
                                spoof_results: result_ocr.spoof_results
                            };
                            if (frontEntries[0].type === 'FACE_VS_MYKAD') {
                                let faceResult = JSON.parse(frontEntries[0].result_face);
                                result.face_compare = {
                                    success: faceResult.success,
                                    confidence: faceResult.collection[0].confidence
                                }
                            }
                            res();
                        } else {
                            // multiple tries, take most recent entry
                            let frontDone = false;
                            let mostRecentFound = false;
                            let mostRecent = undefined;
                            for (let i = frontEntries.length - 1; i >= 0; i--) {
                                if (!frontDone && parseInt(frontEntries[i].code) === 0) {
                                    frontDone = true;
                                    let result_ocr = JSON.parse(frontEntries[i].result_ocr);
                                    result.front_ocr = {
                                        glare_results: result_ocr.glare_results,
                                        landmarks: result_ocr.landmarks,
                                        ocr_results: result_ocr.ocr_results,
                                        spoof_results: result_ocr.spoof_results
                                    };
                                }
                                if (!mostRecentFound && frontEntries[i].type === 'FACE_VS_MYKAD') {
                                    mostRecentFound = true;
                                    mostRecent = frontEntries[i];
                                }
                                if (i === 0 && frontDone && mostRecentFound) {
                                    let faceResult = JSON.parse(mostRecent.result_face);
                                    result.face_compare = {
                                        success: faceResult.success,
                                        confidence: faceResult.collection[0].confidence
                                    }
                                    res();
                                } else if (i === 0 && frontDone) {
                                    res();
                                }
                            }
                        }
                    })
                }
            } else {
                result.front_ocr = {};
            }

            // back ocr data
            // both ori and ocr images are present -> back ocr succeeded
            if (session.back_ori && session.back_ocr) {
                let backEntries = sessionData.filter((each) => each.doc_type === 'MYKAD_BACK');
                if (backEntries.length > 0) {
                    // all back ids have the same result_ocr
                    result_ocr = JSON.parse(backEntries[0].result_ocr);
                    result.back_ocr = {
                        glare_results: result_ocr.glare_results,
                        landmarks: result_ocr.landmarks,
                        ocr_results: result_ocr.ocr_results,
                        spoof_results: result_ocr.spoof_results
                    }
                }
            } else {
                result.back_ocr = {};
            }
            result.source = 'csv';
            session.raw_data = result;
            res(session);
        })
        .catch((err) => {
            console.error('Session ID: ' + session.sessionID + ' - Error reading csv');
            res(session);
        })
}

// saving data
function mergeJSONData(initial, updated) {
    function mergeLandmarks(originalLandmarks, updatedLandmarks) {
        if (originalLandmarks.length === 0 || originalLandmarks.length < updatedLandmarks.length) {
            return updatedLandmarks;
        } else {
            return originalLandmarks.map((each, idx) => {
                if (updatedLandmarks[idx] === undefined) {
                    return each;
                } else if (updatedLandmarks[idx] !== undefined && each.length < updatedLandmarks[idx].length) {
                    return updatedLandmarks[idx];
                } else {
                    return each.map((lm) => {
                        let updatedLm = updatedLandmarks[idx].find((llm) => llm.codeName === lm.codeName);
                        if (updatedLm === undefined) {
                            return lm;
                        } else {
                            return updatedLm;
                        }
                    })
                }
            })
        }
    }

    function mergeOCRs(originalOCRs, updatedOCRs) {
        if (originalOCRs === undefined && updatedOCRs === undefined) {
            return [];
        } else if (originalOCRs === undefined) {
            return updatedOCRs;
        } else if (updatedOCRs === undefined) {
            return originalOCRs;
        } else if (originalOCRs.length === 0 || originalOCRs.length < updatedOCRs.length) {
            originalOCRs = updatedOCRs;
        } else {
            return originalOCRs.map((each, idx) => {
                if (updatedOCRs[idx] === undefined) {
                    return each;
                } else if (updatedOCRs[idx] !== undefined && each.length < updatedOCRs[idx].length) {
                    return updatedOCRs[idx];
                } else {
                    return each.map((ocr) => {
                        let updatedOCR = updatedOCRs[idx].find((uocr) => uocr.codeName === ocr.codeName);
                        if (!updatedOCR) {
                            return ocr;
                        } else {
                            // if (updatedOCR.count !== ocr.count
                            // || updatedOCR.labels.every((each) => each.position !== undefined)
                            // || updatedOCR.labels.some((each, idx) => each.value !== ocr.labels[idx].value 
                            //     || each.position !== ocr.labels[idx].position)) {
                            return updatedOCR;
                            // } else {
                            //     return ocr;
                            // }
                        }
                    })
                }
            })
        }
    }

    return {
        dateCreated: initial.dateCreated,
        sessionID: initial.sessionID,
        originalIDRotation: updated.originalIDRotation,
        backIDRotation: updated.backIDRotation,
        frontIDFlags: updated.frontIDFlags,
        backIDFlags: updated.backIDFlags,

        processed: updated.processed.length != updated.segmentation.originalID.length ? updated.processed : initial.processed,
        processStage: updated.processStage.length != updated.segmentation.originalID.length ? updated.processStage : initial.processStage,
        documentType: updated.documentType.length != updated.segmentation.originalID.length ? updated.documentType : initial.documentType,

        originalImageProps: {
            originalID: updated.originalImageProps !== undefined ? updated.originalImageProps.originalID : initial.originalImageProps.originalID,
            backID: updated.originalImageProps !== undefined ? updated.originalImageProps.backID : initial.originalImageProps.backID
        },
        croppedImageProps: {
            originalID: updated.croppedImageProps !== undefined ? updated.croppedImageProps.originalID : initial.croppedImageProps.originalID,
            backID: updated.croppedImageProps !== undefined ? updated.croppedImageProps.backID : initial.croppedImageProps.backID
        },
        segmentation: updated.segmentation !== undefined ? {
            originalID: updated.segmentation.originalID.length > 0 ? updated.segmentation.originalID : initial.segmentation.originalID,
            backID: updated.segmentation.backID.length > 0 ? updated.segmentation.backID : initial.segmentation.backID
        } : initial.segmentation,
        landmarks: updated.landmarks !== undefined ? {
            originalID: mergeLandmarks(initial.landmarks.originalID, updated.landmarks.originalID),
            backID: mergeLandmarks(initial.landmarks.backID, updated.landmarks.backID)
        } : initial.landmarks,
        ocr: updated.ocr !== undefined ? {
            originalID: mergeOCRs(initial.ocr.originalID, updated.ocr.originalID),
            backID: mergeOCRs(initial.ocr.backID, updated.ocr.backID),
        } : initial.ocr,

        videoLiveness: updated.videoLiveness !== undefined ? updated.videoLiveness : initial.videoLiveness,
        videoFlags: updated.videoFlags !== undefined ? updated.videoFlags : initial.videoFlags,
        faceCompareMatch: updated.faceCompareMatch !== undefined && updated.faceCompareMatch.length > 0 ?
            updated.faceCompareMatch.map((each, idx) => {
                return each !== undefined && each !== null ?
                    each :
                    initial.faceCompareMatch[idx];
            }).filter((each) => each !== undefined && each !== null) : initial.faceCompareMatch.filter((each) => each !== undefined || each !== null)
    }
}

// ------------------------------------------------------
//                      API METHODS
// ------------------------------------------------------ 

// returns session files and ocr results
app.post('/loadSessionData', async (req, res) => {
    let db = req.body.database;
    let date = req.body.date;
    let sessionID = req.body.sessionID;

    let route = testFolder + db + "/images/" + date + "/" + sessionID + "/";
    let files = readFilesInDirectory(route);
    let session = allocateFiles(sessionID, route, files);

    let csvPath = testFolder + db + "/raw_data/" + date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8) + '.csv';
    await new Promise((res, rej) => getCSVData(csvPath, session, res, rej))
        .then((val) => {
            session = val;
        })
        .catch((err) => {
            console.error(err)
        });
    let outputPath = testFolder + outputFolder + "/" + db + "/";
    try {
        let outputFiles = readFilesInDirectory(outputPath);
        if (outputFiles && outputFiles.includes(date)) {
            let dateOutputPath = outputPath + date + "/";
            let jsonFilename = sessionID + ".json";
            let dateOutputFiles = readFilesInDirectory(dateOutputPath);
            if (dateOutputFiles && dateOutputFiles.includes(jsonFilename)) {
                try {
                    let jsonData = readFile(dateOutputPath + jsonFilename);
                    if (jsonData) {
                        let data = JSON.parse(jsonData);
                        let updatedData = updateDataWithJSON(session.raw_data, data);
                        session.raw_data = updatedData;
                    }
                } catch (err) {
                    console.error(err);
                    console.error('Session ID: ' + sessionID + ' - No output json found.');
                }
            }
        }
    } catch (err) {
        console.error(err);
        console.error('Session ID: ' + sessionID + ' - No output json DB folder found.');
    }

    res.status(200).send(session);
})

// loads all available sessions and its annotation state
app.post('/loadDatabase', async (req, res) => {
    let db = req.body.database;
    let start = req.body.startDate;
    let end = req.body.endDate;

    let dateImgRoute = testFolder + db + '/images/';
    let dateImgs = readFilesInDirectory(dateImgRoute);
    dateImgs = dateImgs.filter((each) => withinDateRange(each, start, end));

    let folders = [];

    for (let i = 0; i < dateImgs.length; i++) {
        let sessionRoute = dateImgRoute + dateImgs[i] + '/';
        let sessions = readFilesInDirectory(sessionRoute);
        let sessionIDs = [];

        if (sessions) {
            for (let j = 0; j < sessions.length; j++) {
                let folderRoute = sessionRoute + sessions[j] + "/";
                let jsonPath = testFolder + outputFolder + "/" + db + "/" + dateImgs[i] + "/" + sessions[j] + ".json";
                try {
                    let jsonData = readFile(jsonPath);
                    if (jsonData) {
                        sessionIDs.push(evaluateSessionState(folderRoute, sessions[j], true, JSON.parse(jsonData)));
                    } else {
                        sessionIDs.push(evaluateSessionState(folderRoute, sessions[j], false));
                    }
                } catch (err) {
                    console.error('Session ID: ' + sessions[j] + ' - No output json found.');
                    sessionIDs.push(evaluateSessionState(folderRoute, sessions[j], false));
                }
            }

            let folder = {
                date: dateImgs[i],
                sessions: sessionIDs,
            };
            folders.push(folder);
        } else {
            res.status(500).send();
            return;
        }
    }

    res.status(200).send(folders);
})

// load specific date-session
app.post('/loadDatabaseSelective', async (req, res) => {
    let db = req.body.database;
    let sessions = req.body.sessions;
    let folders = [];

    for (let i = 0; i < sessions.length; i++) {
        let dateRoute = testFolder + db + '/images/' + sessions[i].date + "/";
        try {
            let dateFolder = readFilesInDirectory(dateRoute);
            if (dateFolder && dateFolder.includes(sessions[i].sessionID)) {
                let folderRoute = dateRoute + sessions[i].sessionID + "/";
                let jsonPath = testFolder + outputFolder + "/" + db + "/" + sessions[i].date + "/" + sessions[i].sessionID + ".json";
                try {
                    let jsonData = readFile(jsonPath);
                    if (jsonData) {
                        folders.push({
                            success: true,
                            date: sessions[i].date,
                            session: evaluateSessionState(folderRoute, sessions[i].sessionID, true, JSON.parse(jsonData))
                        });
                    } else {
                        folders.push({
                            success: true,
                            date: sessions[i].date,
                            session: evaluateSessionState(folderRoute, sessions[i].sessionID, false)
                        });
                    }
                } catch (err) {
                    console.error('Session ID: ' + sessions[i].sessionID + ' - No output json found.');
                    folders.push({
                        success: true,
                        date: sessions[i].date,
                        session: evaluateSessionState(folderRoute, sessions[i].sessionID, false)
                    });
                }
            }
        } catch(err) {
            console.error('Cannot find date folder');
            folders.push({
                success: false,
                date: sessions[i].date,
                session: {
                    sessionID: sessions[i].sessionID
                } 
            });
        }
    }

    res.status(200).send(folders);
})

// loads all databases present
app.get('/getDatabases', (req, res) => {
    res.set(ccHeaders);
    let folders = readFilesInDirectory(testFolder);
    if (folders && folders.length) {
        let results = folders.filter((each) => each !== outputFolder).map((each) => {
            return new Promise((res, rej) => {
                try {
                    let dates = readFilesInDirectory(testFolder + each + '/images');
                    res({
                        database: each,
                        dates: dates
                    });
                } catch (err) {
                    res({
                        database: each,
                        err: err
                    });
                }
            });
        });

        Promise.all(results).then((dbs) => {
            let filtered = dbs.filter((each) => each.dates !== undefined);
            res.status(200).send(filtered);
        }).catch((err) => res.status(500).send(err));

    } else {
        res.status(500).err('No databases found');
    }
})

// overwrite/create annotation output file for the specified session
app.post('/saveOutput', async (req, res) => {
    let {
        ID,
        database,
        overwrite
    } = req.body;
    let today = fromDateToString(new Date(), true);
    let topLevel = testFolder + outputFolder + "/"
    let route = topLevel + database + "/";

    // creating required folders if not present
    let dbs = readFilesInDirectory(topLevel);
    if (dbs) {
        if (!dbs.includes(database)) {
            try {
                createDirectory(route);
            } catch(err) {
                console.error(err);
                res.status(500).send();
            }
        }
    } else {
        res.status(500).send();
    }

    if (!overwrite) {
        route = testFolder + outputFolder + "/" + database + "/output_" + today + "/";
        try {
            createDirectory(route);
        } catch(err) {
            console.error(err);
            res.status(500).send();
        }
    }

    await new Promise((res, rej) => {
        let date = ID.dateCreated.split('T')[0].split('-').join('');
        let dateRoute = route + date + "/";
        let dates = readFilesInDirectory(route);
        if (dates) {
            if (!dates.includes(date)) {
                try {
                    createDirectory(route);
                } catch(err) {
                    console.error(err);
                    res.status(500).send();
                }
            }
            try {
                let sessionOutputRoute = dateRoute + ID.sessionID + ".json";
                ID.lastModified = (new Date()).toLocaleString();
                try {
                    let sessions = readFilesInDirectory(dateRoute);
                    let sessionImageRoute = testFolder + database + "/images/" + ID.dateCreated + "/" + ID.sessionID + "/";

                    // json already exists
                    if (sessions.includes(ID.sessionID + ".json")) {
                        let data = readFile(sessionOutputRoute);
                        let initialData = JSON.parse(data);
                        let updatedData = mergeJSONData(initialData, ID);

                        console.log("merge " + ID.sessionID);
                        writeFile(sessionOutputRoute, JSON.stringify(updatedData));

                        let result = evaluateSessionState(sessionImageRoute, ID.sessionID, true, updatedData);
                        result.success = true;
                        res(result);
                    } else {
                        // first time annotation
                        console.log("new file " + ID.sessionID);
                        writeFile(sessionOutputRoute, JSON.stringify(ID));
                        let result = evaluateSessionState(sessionImageRoute, ID.sessionID, true, ID);
                        result.success = true;
                        res(result);
                    }
                } catch (err) {
                    throw err;
                }
            } catch (err) {
                console.error('Session ID: ' + ID.sessionID + ' - Failed to save output json.')
                res({
                    sessionID: ID.sessionID,
                    success: false
                });
            }
        } else {
            res({
                sessionID: ID.sessionID,
                success: false
            });
        }
    }).then((result) => {
        res.status(200).send(result);
    }).catch((err) =>
        res.status(500).send(err)
    );
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/build/index.html'));
});

if (process.env.NODE_ENV === 'production') {
    // Serve any static files
    app.use(express.static(path.join(__dirname, 'build')));
    // Handle React routing, return all requests to React app
    app.get('*', function (req, res) {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

app.listen(port, () => console.log(`Listening on port ${port}`));