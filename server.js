const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const csv = require('csvtojson');
const pkg = require('./package.json');
const testFolder = pkg.dbDirectory;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/build')));

const ccHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': 0
}

const fileType = {
    mykad_front_ori: '0',
    mykad_back_ori: '1',

    mykad_front_ocr: '2',
    mykad_back_ocr: '3',
    mykad_face: '4',

    face: '5',
    face_video: '6',
    face_video_still: '7'
}

Object.freeze(fileType);

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

function getFileType(filename) {
    let keys = filename.split('.')[0].split('_').slice(1);
    if (keys[0] === 'mykad') {
        switch (keys[1]) {
            case ('front'): {
                return keys[2] === 'ocr' ? fileType.mykad_front_ocr : fileType.mykad_front_ori;
            }
            case ('back'): {
                return keys[2] === 'ocr' ? fileType.mykad_back_ocr : fileType.mykad_back_ori;
            }
            case ('face'):
            default: {
                return fileType.mykad_face;
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

// transforms each image into base64 representation
function allocateFiles(sessionID, route, files) {
    var mykad_front_ori,
        mykad_back_ori,
        mykad_front_ocr,
        mykad_back_ocr,
        mykad_face,
        face,
        face_video;
    var face_video_stills = [];

    for (let i = 0; i < files.length; i++) {
        if (fs.lstatSync(route + files[i]).isDirectory()) {
            continue;
        }
        let file = fs.readFileSync(route + files[i]);
        if (file) {
            file = Buffer.alloc(file.byteLength, file, 'binary').toString('base64');
            let type = getFileType(files[i]);
            let imgPrefix = 'data:image/jpg;base64,';
            switch (type) {
                case (fileType.mykad_front_ori): mykad_front_ori = imgPrefix + file; break;
                case (fileType.mykad_back_ori): mykad_back_ori = imgPrefix + file; break;
                case (fileType.mykad_front_ocr): mykad_front_ocr = imgPrefix + file; break;
                case (fileType.mykad_back_ocr): mykad_back_ocr = imgPrefix + file; break;
                case (fileType.mykad_face): mykad_face = imgPrefix + file; break;
                case (fileType.face): face = imgPrefix + file; break;
                case (fileType.face_video): face_video = 'data:video/mp4;base64,' + file; break;
                case (fileType.face_video_still): face_video_stills.push(imgPrefix + file); break;
                default: break;
            }
        }
    }

    return {
        sessionID: sessionID,
        mykad_front_ori: mykad_front_ori,
        mykad_back_ori: mykad_back_ori,
        mykad_front_ocr: mykad_front_ocr,
        mykad_back_ocr: mykad_back_ocr,
        mykad_face: mykad_face,
        face: face,
        face_video: face_video,
        face_video_stills: face_video_stills
    }
}

// evaluate annotation status of a specific session, given sessionID and json data
function evaluateSessionState(sessionRoute, sessionID, jsonFound, json) {
    function getFilesExistence(sessionRoute) {
        var existence = {
            mykad_front_ori: false,
            mykad_back_ori: false,
            mykad_front_ocr: false,
            mykad_back_ocr: false,
            mykad_face: false,
            face: false,
            face_video: false,
            face_video_stills: 0
        }
        try {
            let files = fs.readdirSync(sessionRoute);
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    if (fs.lstatSync(sessionRoute + files[i]).isDirectory()) {
                        continue;
                    }
                    let file = fs.readFileSync(sessionRoute + files[i]);
                    if (file) {
                        let type = getFileType(files[i]);
                        switch (type) {
                            case (fileType.mykad_front_ori): existence.mykad_front_ori = true; break;
                            case (fileType.mykad_back_ori): existence.mykad_back_ori = true; break;
                            case (fileType.mykad_front_ocr): existence.mykad_front_ocr = true; break;
                            case (fileType.mykad_back_ocr): existence.mykad_back_ocr = true; break;
                            case (fileType.mykad_face): existence.mykad_face = true; break;
                            case (fileType.face): existence.face = true; break;
                            case (fileType.face_video): existence.face_video = true; break;
                            case (fileType.face_video_still): existence.face_video_stills++; break;
                            default: break;
                        }
                    }
                }
                return existence;
            } else {
                return undefined;
            }
        } catch(err) {
            console.error(err);
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
            // console.log(Object.keys(pos).every(e => pos[e] !== undefined))
            return Object.keys(pos).every(e => pos[e] !== undefined && !isNaN(pos[e]));
        }

        // check seg
        if (segData !== undefined && segData.length > 0) {
            if (segData.length === 1 && segData.IDBox === undefined) {
                // single empty entry
                skippedSeg = true;
                seg = front ? segFlags.length > 0 : (segFlags.length > 0 ? true : json.frontIDFlags.length > 0);
            } else {
                // check if coordinates are present
                seg = segData.every((each) => each.IDBox !== undefined && isValidPosition(each.IDBox.position));
            }
        } else {
            // no segData, check if got flags to justify
            skippedSeg = true;
            seg = front ? segFlags.length > 0 : (segFlags.length > 0 ? true : json.frontIDFlags.length > 0);
        }

        // go on to check landmark if seg is annotated
        if (skippedSeg) {
            landmark = true;
        } else if (seg === true) {
            let landmarkData = front ? json.landmarks.originalID: json.landmarks.backID;
            if (landmarkData !== undefined && landmarkData.length > 0 && landmarkData.length === segData.length) {
                // Q: need to check if the set of landmark is complete?????
                // religion optional
                landmark = landmarkData.every((each) => each.every((lm) => lm.codeName === 'religion' || isValidPosition(lm.position)));
            }
        }

        // go on to check ocr if landmark is annotated
        if (skippedSeg) {
            ocr = true;
        } else if (landmark === true) {
            let ocrData = front ? json.ocr.originalID : json.ocr.backID;
            if (ocrData !== undefined && ocrData.length > 0 && ocrData.length === segData.length) {
                ocr = ocrData.every((each) => {
                    let ocrs = each.filter((o) => o.codeName === 'ic_num' || o.codeName === 'name' || o.codeName === 'address');
                    if (ocrs !== undefined && ocrs.length === 3) {
                        return ocrs.every((o) => {
                            if (o.count === 1) {
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

        return { seg, landmark, ocr };
    }

    var existence = getFilesExistence(sessionRoute);
    if (existence !== undefined) {
        var phasesToCheck = {
            front: existence.mykad_front_ori,
            back: existence.mykad_back_ori,
            video: existence.face_video,
            face: existence.mykad_front_ori && (existence.face || existence.face_video_stills > 0)
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
                annotationStates.front = { seg: true, landmark: true, ocr: true };
                shouldIgnore.back = true;
                shouldIgnore.face = true;
            }

            // check back
            if (phasesToCheck.back && !shouldIgnore.back) {
                let backState = checkOCRState(false);
                annotationStates.back = backState;
            } else {
                annotationStates.back = { seg: true, landmark: true, ocr: true };
            }

            // check liveness
            annotationStates.video = phasesToCheck.liveness ? (json.videoLiveness === true || json.videoLiveness === false) : true;
    // check seg originalid exists same for ladmark and ocr
            // check face
            if (phasesToCheck.face && !shouldIgnore.face) {
                annotationStates.match = json.faceCompareMatch.length === json.segmentation.originalID.length 
                    && json.faceCompareMatch.every((each) => each === true || each === false);
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

// sending data
function updateDataWithJSON(result, data) {
    function updateOCR(ocrResults, front) {
        if (ocrResults !== undefined) {
            let landmarks = front ? data.landmarks.originalID : data.landmarks.backID;
            let ocrs = front ? data.ocr.originalID : data.ocr.backID;
            if (landmarks !== undefined && landmarks.length > 0) {
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
                }

                if (ocrResults.landmarks !== undefined) {
                    ocrResults.landmarks = landmarks.map((currLm) => {
                        let csvLm = ocrResults.landmarks;
                        if (currLm.length > csvLm.length) {
                            return currLm.map((landmark) => {
                                let lm = csvLm.find((l) => l.id === landmark.codeName);
                                if (lm !== undefined && lm.id !== undefined) {
                                    lm.coords = [landmark.position.x1, 
                                        data.imageProps.originalID.height - landmark.position.y1, 
                                        landmark.position.x2,
                                        data.imageProps.originalID.height - landmark.position.y4];
                                } else {
                                    return {
                                        id: landmark.codeName,
                                        score: 0,
                                        coords: [landmark.position.x1, 
                                            data.imageProps.originalID.height - landmark.position.y1, 
                                            landmark.position.x2,
                                            data.imageProps.originalID.height - landmark.position.y4]
                                    }
                                }
                            })
                        } else {
                            return ocrResults.landmarks.map((each) => {
                                let landmark = currLm.find((llm) => llm.codeName === each.id);
                                if (landmark !== undefined) {
                                    if (front && data.imageProps.originalID !== undefined && data.imageProps.originalID.height !== undefined) {
                                        each.coords = [landmark.position.x1, 
                                            data.imageProps.originalID.height - landmark.position.y1, 
                                            landmark.position.x2,
                                            data.imageProps.originalID.height - landmark.position.y4];
                                    } else if (!front && data.imageProps.backID !== undefined && data.imageProps.backID.height !== undefined) {
                                        each.coords = [landmark.position.x1, 
                                            data.imageProps.backID.height - landmark.position.y1, 
                                            landmark.position.x2,
                                            data.imageProps.backID.height - landmark.position.y4];
                                    }
                                }
                                return each;
                            })
                        }
                    })  
                }
            } else {
                ocrResults.glare_results = [ocrResults.glare_results];
                ocrResults.landmarks = [ocrResults.landmarks];
            }
            if (ocrs !== undefined && ocrs.length > 0 && ocrResults.ocr_results !== undefined) {
                ocrResults.ocr_results = ocrs.map((currOcr) => {
                    let csvOcr = ocrResults.ocr_results;
                    if (currOcr.length > csvOcr.length) {
                        return currOcr.map((ocr) => {
                            let each = csvOcr.find((o) => o.field === ocr.codeName);
                            if (each !== undefined && each.field !== undefined) {
                                each.text = ocr.labels.map((lbl) => lbl.value).join(" ");
                                each.coords = ocr.labels.map((lbl) => {
                                    if (lbl.position !== undefined) {
                                        if (front && data.imageProps.originalID !== undefined && data.imageProps.originalID.height !== undefined) {
                                            return [lbl.position.x1, 
                                                data.imageProps.originalID.height - lbl.position.y1, 
                                                lbl.position.x2,
                                                data.imageProps.originalID.height - lbl.position.y4];
                                        } else if (!front && data.imageProps.backID !== undefined && data.imageProps.backID.height !== undefined) {
                                            return [lbl.position.x1, 
                                                data.imageProps.backID.height - lbl.position.y1, 
                                                lbl.position.x2,
                                                data.imageProps.backID.height - lbl.position.y4];
                                        }
                                    } else {
                                        return [];
                                    }
                                });
                            } else {
                                return {
                                    field: ocr.codeName,
                                    score: 0,
                                    text: ocr.labels.map((lbl) => lbl.value).join(" "),
                                    coords: ocr.labels.map((lbl) => {
                                        if (lbl.position !== undefined) {
                                            if (front && data.imageProps.originalID !== undefined && data.imageProps.originalID.height !== undefined) {
                                                return [lbl.position.x1, 
                                                    data.imageProps.originalID.height - lbl.position.y1, 
                                                    lbl.position.x2,
                                                    data.imageProps.originalID.height - lbl.position.y4];
                                            } else if (!front && data.imageProps.backID !== undefined && data.imageProps.backID.height !== undefined) {
                                                return [lbl.position.x1, 
                                                    data.imageProps.backID.height - lbl.position.y1, 
                                                    lbl.position.x2,
                                                    data.imageProps.backID.height - lbl.position.y4];
                                            }
                                        } else {
                                            return [];
                                        }
                                    })
                                }
                            }
                            return each;
                        })
                    } else {
                        return csvOcr.map((each) => {
                            let ocr = currOcr.find((o) => o.codeName === each.field);
                            if (ocr !== undefined) {
                                each.text = ocr.labels.map((lbl) => lbl.value).join(" "),
                                each.coords = ocr.labels.map((lbl) => {
                                    if (lbl.position !== undefined) {
                                        if (front && data.imageProps.originalID !== undefined && data.imageProps.originalID.height !== undefined) {
                                            return [lbl.position.x1, 
                                                data.imageProps.originalID.height - lbl.position.y1, 
                                                lbl.position.x2,
                                                data.imageProps.originalID.height - lbl.position.y4];
                                        } else if (!front && data.imageProps.backID !== undefined && data.imageProps.backID.height !== undefined) {
                                            return [lbl.position.x1, 
                                                data.imageProps.backID.height - lbl.position.y1, 
                                                lbl.position.x2,
                                                data.imageProps.backID.height - lbl.position.y4];
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
                ocrResults.ocr_results = [ocrResults.ocr_results];
            }
            if (ocrResults.spoof_results !== undefined) {
                if (front) {
                    ocrResults.spoof_results.is_card_spoof = data.frontIDFlags !== undefined ? data.frontIDFlags.includes('spoof') : false;
                } else {
                    ocrResults.spoof_results.is_card_spoof = data.backIDFlags !== undefined ? data.backIDFlags.includes('spoof') : false;
                }
            }
            ocrResults.flags = front ? data.frontIDFlags : data.backIDFlags;
            ocrResults.imageProps = front ? data.imageProps.originalID : data.imageProps.backID;
        }
        return ocrResults
    }

    let newResult = {};
    newResult.segmentation = {
        originalID: data.segmentation.originalID !== undefined ? data.segmentation.originalID.filter((each) => each.IDBox !== null).map((each, idx) => {
            return {
                documentType: data.documentType[idx],
                passesCrop: each.passesCrop,
                coords: [each.IDBox.position.x1, 
                    data.imageProps.originalID.height - each.IDBox.position.y1, 
                    each.IDBox.position.x2,
                    data.imageProps.originalID.height - each.IDBox.position.y4]
            }
        }) : [],
        backID: data.segmentation.backID !== undefined ? data.segmentation.backID.filter((each) =>  each.IDBox !== null).map((each) => {
            if (each.passesCrop === undefined || each.IDBox === undefined) {
                return {};
            }
            return {
                passesCrop: each.passesCrop,
                coords: [each.IDBox.position.x1, 
                data.imageProps.backID.height - each.IDBox.position.y1, 
                each.IDBox.position.x2,
                data.imageProps.backID.height - each.IDBox.position.y4],
            }
        }) : []
    }

    newResult.front_ocr = updateOCR(result.front_ocr, true);
    newResult.back_ocr = updateOCR(result.back_ocr, false);
    newResult.face_compare = {
        faceCompareMatch: data.faceCompareMatch,
        liveness: data.videoLiveness,
        videoFlags: data.videoFlags
    }
    newResult.source = 'json';
    return newResult;
}

function getCSVData(filepath, session, res, rej) {9
    csv()
    .fromFile(filepath)
    .then(async (json)=>{
        let result = {};
        let sessionData = json.filter((each) => each.session_id === session.sessionID);
        // front ocr data
        // both ori and ocr images are present -> front ocr succeeded
        if (session.mykad_front_ori && session.mykad_front_ocr) {
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
        if (session.mykad_back_ori && session.mykad_back_ocr) {
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
        console.error(err);
        res(undefined);
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
                            if (updatedLm.position !== undefined) {
                                return updatedLm;
                            } else {
                                return lm;
                            }
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
                            if (updatedOCR.count !== ocr.count
                            || updatedOCR.labels.every((each) => each.position !== undefined)
                            || updatedOCR.labels.some((each, idx) => each.value !== ocr.labels[idx].value 
                                || each.position !== ocr.labels[idx].position)) {
                                return updatedOCR;
                            } else {
                                return ocr;
                            }
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
        
        processed: updated.processed,
        processStage: updated.processStage,
        documentType: updated.documentType,

        imageProps: {
            originalID: updated.imageProps !== undefined ? updated.imageProps.originalID : undefined,
            backID: updated.imageProps !== undefined ? updated.imageProps.backID : undefined
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
        faceCompareMatch: updated.faceCompareMatch !== undefined ? updated.faceCompareMatch.map((each, idx) => {
            return each !== undefined 
                ? each
                : initial.faceCompareMatch[idx];
        }) : initial.faceCompareMatch
    }
}

app.get('/testEvaluation', async (req, res) => {
    let sessionID = "5ec3872b-0c65-4e41-8fc0-f9e2b2100d6f";
    let jsonPath = testFolder + "annotation_output/db2/20200805/5ec3872b-0c65-4e41-8fc0-f9e2b2100d6f.json";
    let sessionRoute = testFolder + "db2/images/20200805/5ec3872b-0c65-4e41-8fc0-f9e2b2100d6f/";
    let jsonData = fs.readFileSync(jsonPath);
    if (jsonData) {
        let result = evaluateSessionState(sessionRoute, sessionID, JSON.parse(jsonData));
        res.status(200).send(result);
    } else {
        res.status(500).send('cant open json');
    }
})

app.post('/loadSessionData', async (req, res) => {
    let db = req.body.database;
    let date = req.body.date;
    let sessionID = req.body.sessionID;

    let route = testFolder + db + "/images/" + date + "/" + sessionID + "/";
    let files = fs.readdirSync(route);
    let session = allocateFiles(sessionID, route, files);

    let csvPath = testFolder + db + "/raw_data/" + date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8) + '.csv';
    await new Promise((res, rej) => getCSVData(csvPath, session, res, rej))
        .then((val) => {session = val;})
        .catch((err) => {console.error(err)});

    let outputPath = testFolder + "annotation_output/" + db + "/";
    let outputFiles = fs.readdirSync(outputPath);
    if (outputFiles && outputFiles.includes(date)) {
        let dateOutputPath = outputPath + date + "/";
        let jsonFilename = sessionID + ".json";
        let dateOutputFiles = fs.readdirSync(dateOutputPath);
        
        if (dateOutputFiles && dateOutputFiles.includes(jsonFilename)) {
            try {
                let jsonData = fs.readFileSync(dateOutputPath + jsonFilename);
                if (jsonData) {
                    let data = JSON.parse(jsonData);
                    let updatedData = updateDataWithJSON(session.raw_data, data);
                    session.raw_data = updatedData;
                }
            } catch (err) {
                console.error(err);
                session.raw_data = csvData;
            }
        }
    }

    res.status(200).send(session);
})

app.post('/loadDatabase', async (req, res) => {
    let db = req.body.database;
    let start = req.body.startDate;
    let end = req.body.endDate;

    let dateImgRoute = testFolder + db + '/images/';
    let dateImgs = fs.readdirSync(dateImgRoute);
    dateImgs = dateImgs.filter((each) => withinDateRange(each, start, end));

    let folders = [];

    for (let i = 0; i < dateImgs.length; i++) {
        let sessionRoute = dateImgRoute + dateImgs[i] + '/';
        let sessions = fs.readdirSync(sessionRoute);
        let sessionIDs = [];
        
        if (sessions) {
            for (let j = 0; j < sessions.length; j++) {
                let folderRoute = sessionRoute + sessions[j] + "/";
                let jsonPath = testFolder + "annotation_output/" + db + "/" + dateImgs[i] + "/" + sessions[j] + ".json";
                try {
                    let jsonData = fs.readFileSync(jsonPath);
                    if (jsonData) {
                        sessionIDs.push(evaluateSessionState(folderRoute, sessions[j], true, JSON.parse(jsonData)));
                    } else {
                        sessionIDs.push(evaluateSessionState(folderRoute, sessions[j], false));
                    }
                } catch(err) {
                    console.error(err);
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

app.get('/getDatabases', (req, res) => {
    res.set(ccHeaders);
    let folders = fs.readdirSync(testFolder);
    if (folders && folders.length) {
        let results = folders.map((each) => {
            return new Promise((res, rej) => {
                try {
                    let dates = fs.readdirSync(testFolder + each + '/images');
                    res({
                        database: each,
                        dates: dates
                    });
                } catch(err) {
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

app.post('/saveOutput', async (req, res) => {
    let { ID, database, overwrite } = req.body;
    let today = fromDateToString(new Date(), true);
    let topLevel = testFolder + "annotation_output/"
    let route = topLevel + database + "/";

    let dbs = fs.readdirSync(topLevel);
    if (dbs) {
        if (!dbs.includes(database)) {
            fs.mkdirSync(route, {recursive: true}, (err) => {
                if (err) throw err;
                res.status(500).send();
            })
        }
    } else {
        res.status(500).send();
    }

    if (!overwrite) {
        route = testFolder + "annotation_output/" + database + "/output_" + today + "/";
        fs.mkdirSync(route, {recursive: true}, (err) => {
            if (err) throw err;
        });
    }

    await new Promise((res, rej) => {
            let date = ID.dateCreated.split('T')[0].split('-').join('');
            let dateRoute = route + date + "/";
            let dates = fs.readdirSync(route);
            if (dates) {
                if (!dates.includes(date)) {
                    fs.mkdirSync(dateRoute, {recursive: true}, (err) => {
                        if (err) throw err;
                        res.status(500).send();
                    });
                }
                try {
                    let sessionRoute = dateRoute + ID.sessionID + ".json";
                    ID.lastModified = (new Date()).toLocaleString();
                    try {
                        let sessions = fs.readdirSync(dateRoute);
                        if (sessions.includes(ID.sessionID + ".json")) {
                            let data = fs.readFileSync(sessionRoute);
                            let initialData = JSON.parse(data);
                            let updatedData = mergeJSONData(initialData, ID);
                            console.log("merge " + ID.sessionID);
                            fs.writeFileSync(sessionRoute, JSON.stringify(updatedData), 'utf8');
                            res({sessionID: ID.sessionID, success: true});
                        } else {
                            console.log("new file " + ID.sessionID);
                            fs.writeFileSync(sessionRoute, JSON.stringify(ID), 'utf8');
                            res({sessionID: ID.sessionID, success: true})
                        }
                    } catch(err) {
                        throw err;
                    }
                } catch(err) {
                    console.error(err);
                    res({sessionID: ID.sessionID, success: false});
                }
            } else {
                res({sessionID: ID.sessionID, success: false});
            }
        }).then((result) => {
            res.status(200).send(result);
        }).catch((err) =>
            res.status(500).send(err)
        );
})

app.post('/saveBulkOutput', async (req, res) => {
    let { library, database, overwrite } = req.body;
    let today = fromDateToString(new Date(), true);
    let topLevel = testFolder + "annotation_output/"
    let route = topLevel + database + "/";

    let dbs = fs.readdirSync(topLevel);
    if (dbs) {
        if (!dbs.includes(database)) {
            fs.mkdirSync(route, {recursive: true}, (err) => {
                if (err) throw err;
                res.status(500).send();
            })
        }
    } else {
        res.status(500).send();
    }

    if (!overwrite) {
        route = testFolder + "annotation_output/" + database + "/output_" + today + "/";
        fs.mkdirSync(route, {recursive: true}, (err) => {
            if (err) throw err;
        });
    }

    let writes = library.map((each) => {
        return new Promise((res, rej) => {
            let date = each.dateCreated.split('T')[0].split('-').join('');
            let dateRoute = route + date + "/";
            let dates = fs.readdirSync(route);
            if (dates) {
                if (!dates.includes(date)) {
                    fs.mkdirSync(dateRoute, {recursive: true}, (err) => {
                        if (err) throw err;
                        res.status(500).send();
                    });
                }
                try {
                    let sessionRoute = dateRoute + each.sessionID + ".json";
                    each.lastModified = (new Date()).toLocaleString();
                    try {
                        let sessions = fs.readdirSync(dateRoute);
                        if (sessions.includes(each.sessionID + ".json")) {
                            let data = fs.readFileSync(sessionRoute);
                            let initialData = JSON.parse(data);
                            let updatedData = mergeJSONData(initialData, each);
                            console.log("merge " + each.sessionID);
                            fs.writeFileSync(sessionRoute, JSON.stringify(updatedData), 'utf8');
                            res({sessionID: each.sessionID, success: true});
                        } else {
                            console.log("new file " + each.sessionID);
                            fs.writeFileSync(sessionRoute, JSON.stringify(each), 'utf8');
                            res({sessionID: each.sessionID, success: true})
                        }
                    } catch(err) {
                        throw err;
                    }
                } catch(err) {
                    console.error(err);
                    res({sessionID: each.sessionID, success: false});
                }
            } else {
                res({sessionID: each.sessionID, success: false});
            }
        });
    })

    Promise.all(writes).then((results) => {
        res.status(200).send(results);
    }).catch((err) =>
        res.status(500).send(err)
    );
})

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, '/build/index.html'));
  });

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'build')));
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(port, () => console.log(`Listening on port ${port}`));