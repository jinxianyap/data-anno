import { IDState, GivenData, PhasesChecked, AnnotationState } from '../store/id/types';
import { ImageState, LandmarkData, OCRData, OCRWord, ImageProps, IDBox } from '../store/image/types';
import { Rotation, IDProcess, AnnotationStatus, ProcessType } from './enums';
import { DummyImage } from './dummy';
import options from '../options.json';
import { GeneralUtil } from './GeneralUtil';

export class DatabaseUtil {

    // initialize ID before loading session data
    public static initializeID(session: any, date: string, index: number): IDState {
        let id = session.sessionID;
        return {
            originalID: {
                image: this.dataURLtoFile(session.front_ori, id + "_init_front_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.front_ocr, id + "_init_front_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            backID: {
                image: this.dataURLtoFile(session.back_ori, id + "_init_back_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.back_ocr, id + "init_back_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            croppedFace: this.dataURLtoFile(session.face, id + "_init_face.jpg"),
            selfieImage: this.dataURLtoFile(session.face, id + "_face.jpg"),
            selfieVideo: this.dataURLtoFile(session.face_video, id + "_face_video.mp4"),
            videoStills: session.face_video_stills !== undefined ? session.face_video_stills.map((each: any, idx: number) => 
                this.dataURLtoFile(each, id + "_face_" + (idx + 1) + ".jpg")
            ) : undefined,
            dirty: false,
            dataLoaded: false,
            processed: false,
            index: index,
            phasesChecked: session.phasesChecked,
            annotationState: session.annotationState,
            dateCreated: date,
            sessionID: id,
            originalIDProcessed: false,
            backIDsProcessed: 0,
            originalIDRotation: Rotation.ROT0,
            backIDRotation: Rotation.ROT0,
            internalIDs: [],
            internalIndex: 0
        }
    }

    // initialize ImageState with session data
    private static loadImageState(session: any, id: string, front: boolean): ImageState | undefined {
        if (session.doc_faces === 1 && !front) {
            return undefined;
        }

        let oriSrc = front ? session.front_ori : session.back_ori;
        let ocrSrc = front ? session.front_ocr : session.back_ocr;

        let oriSrcName = front ? "_" + session.doc_type + "_front_ori.jpg" : "_" + session.doc_type + "_back_ori.jpg";
        let ocrSrcName = front ? "_" + session.doc_type + "_front_ocr.jpg" : "_" + session.doc_type + "_back_ocr.jpg";

        let ID: ImageState = {
            image: this.dataURLtoFile(oriSrc, id + oriSrcName),
            croppedImage: this.dataURLtoFile(ocrSrc, id + ocrSrcName),
            landmark: [],
            ocr: [],
        }

        return ID;
    }

    // loads session.raw_data into IDState's GivenData field
    private static loadGivenData(session: any): Promise<GivenData> {
        let result: GivenData = {};

        const load = async (docKey: string, given: GivenData, back?: boolean) => {
            let frontSeg: {documentType: string, IDBox: IDBox, passesCrop: boolean}[] = [];
            let backSeg: {IDBox: IDBox, passesCrop: boolean}[] = [];
            let frontOriProps: ImageProps = {height: -1, width: -1};
            let backOriProps: ImageProps = {height: -1, width: -1};
            let frontOcrProps: ImageProps = {height: -1, width: -1};
            let backOcrProps: ImageProps = {height: -1, width: -1};
            let landmarks = [];
            let ocr = [];

            if (session.raw_data !== undefined) {
                let ocrData = back ? session.raw_data.back_ocr : session.raw_data.front_ocr;
                if (ocrData !== undefined) {
                    let oriSrc = back ? session.back_ori : session.front_ori;
                    let oriProps: ImageProps = {height: -1, width: -1};
                    if (ocrData.originalImageProps !== undefined) {
                        oriProps.height = ocrData.originalImageProps.height;
                        oriProps.width = ocrData.originalImageProps.width;
                    } else if (oriSrc !== undefined) {
                        oriProps = await new Promise((res, rej) => {
                            let img = new Image();
                            img.onload = () => {
                                let props: ImageProps = {
                                    height: img.height,
                                    width: img.width
                                }
                                res(props);
                            }
                            img.src = oriSrc;
                        })
                    }

                    if (back) {
                        backOriProps = oriProps;
                    } else {
                        frontOriProps = oriProps;
                    }

                    let segData = session.raw_data.segmentation !== undefined ? 
                        (back ? session.raw_data.segmentation.backID : session.raw_data.segmentation.originalID) : undefined;
                    if (segData !== undefined) {
                        if (!back) {
                            frontSeg = segData.map((e: any, idx: number) => {
                                let each = e.coords;
                                if (each === undefined) {
                                    return undefined;
                                }
                                return {
                                    documentType: e.documentType !== undefined ? e.documentType : '',
                                    passesCrop: e.passesCrop,
                                    IDBox: {
                                        id: idx,
                                        position: {
                                            x1: each[0],
                                            x2: each[2],
                                            x3: each[4],
                                            x4: each[6],
                                            y1: each[1],
                                            y2: each[3],
                                            y3: each[5],
                                            y4: each[7],
                                        }
                                    }
                                }
                            })
                        } else {
                            backSeg = segData.map((e: any, idx: number) => {
                                let each = e.coords;
                                if (each === undefined) {
                                    return undefined;
                                }
                                return {
                                    passesCrop: e.passesCrop,
                                    IDBox: {
                                        id: idx,
                                        position: {
                                            x1: each[0],
                                            x2: each[2],
                                            x3: each[4],
                                            x4: each[6],
                                            y1: each[1],
                                            y2: each[3],
                                            y3: each[5],
                                            y4: each[7],
                                        }
                                    }
                                }
                            })
                        }
                    }
                }

                if (ocrData !== undefined) {
                    let ocrSrc = !back ? session.front_ocr : session.back_ocr;
                    let imgProps: ImageProps = {height: -1, width: -1};
                    if (ocrData.croppedImageProps !== undefined) {
                        imgProps.height = ocrData.croppedImageProps.height;
                        imgProps.width = ocrData.croppedImageProps.width;
                    } else if (ocrSrc !== undefined) {
                        imgProps = await new Promise((res, rej) => {
                            let img = new Image();
                            img.onload = () => {
                                let props: ImageProps = {
                                    height: img.height,
                                    width: img.width
                                }
                                res(props);
                            }
                            img.src = ocrSrc;
                        })
                    }

                    if (!back) {
                        frontOcrProps = imgProps;
                    } else {
                        backOcrProps = imgProps;
                    }

                    const handleLandmarks = (each: any, segIndex?: number) => {
                        if (each === null) return null;
                        return each.filter((lm: any) => lm !== null).map((lm: any, idx: number) => {
                            let flags: string[] = [];
                            let glare = ocrData.glare_results.find((glare: any) => glare.field === lm.id);
                            if (glare !== undefined) {
                                if (glare.glare) {
                                    flags = ['glare'];
                                }
                            }

                            if (imgProps.height === -1 || imgProps.width === -1) {
                                if (!back && frontSeg[idx] !== undefined) {
                                    imgProps = {
                                        height: frontSeg[idx].IDBox.position.y1 - frontSeg[idx].IDBox.position.y4, 
                                        width: frontSeg[idx].IDBox.position.x2 - frontSeg[idx].IDBox.position.x1
                                    }
                                } else if (back && backSeg[idx] !== undefined) {
                                    imgProps = {
                                        height: backSeg[idx].IDBox.position.y1 - backSeg[idx].IDBox.position.y4, 
                                        width: backSeg[idx].IDBox.position.x2 - backSeg[idx].IDBox.position.x1
                                    }
                                }
                            }
                            
                            let rDocKey = undefined;
                            if (segIndex !== undefined) {
                                if (back) {
                                    if (given.originalID !== undefined && given.originalID.segmentation !== undefined && given.originalID.segmentation[segIndex] !== undefined) {
                                        rDocKey = given.originalID.segmentation[segIndex]!.documentType + "Back";
                                    }
                                } else {
                                    if (frontSeg[segIndex] !== undefined) {
                                        rDocKey = frontSeg[segIndex].documentType;
                                        if (options.documentTypes.double.includes(rDocKey)) {
                                            rDocKey += "Front";
                                        }
                                    }
                                }
                            }
                            let landmark: LandmarkData = {
                                id: idx,
                                type: 'landmark',
                                codeName: lm.id,
                                name: this.translateTermFromCodeName(rDocKey !== undefined ? rDocKey : docKey, 'landmark', lm.id),
                                flags: flags,
                                position: {
                                    x1: lm.coords[0],
                                    x2: lm.coords[2],
                                    x3: lm.coords[2],
                                    x4: lm.coords[0],
                                    y1: imgProps.height - lm.coords[1],
                                    y2: imgProps.height - lm.coords[1],
                                    y3: imgProps.height - lm.coords[3],
                                    y4: imgProps.height - lm.coords[3]
                                }
                            }
                            return landmark;
                        }).filter((each: LandmarkData) => each.name !== '');
                    }

                    const handleOCRs = (each: any, segIndex?: number) => {
                        if (each === null) return null;
                        return each.filter((lm: any) => lm !== null).map((o: any, idx: number) => {
                            let newlines: number[] = [];
                            let text: string[] = [];

                            if (o.field === 'name' || o.field === 'address') {
                                let processed = GeneralUtil.processOCRValue(o.text);
                                newlines = processed.newlines;
                                text = processed.terms;
                            } else {
                                text = o.text.split('\n').join(' ').split(' ');
                            }

                            let rDocKey = undefined;
                            if (segIndex !== undefined) {
                                if (back) {
                                    if (given.originalID !== undefined && given.originalID.segmentation !== undefined && given.originalID.segmentation[segIndex] !== undefined) {
                                        rDocKey = given.originalID.segmentation[segIndex]!.documentType + "Back";
                                    }
                                } else {
                                    if (frontSeg[segIndex] !== undefined) {
                                        rDocKey = frontSeg[segIndex].documentType;
                                        if (options.documentTypes.double.includes(rDocKey)) {
                                            rDocKey += 'Front';
                                        }
                                    }
                                }
                            }

                            let ocr: OCRData = {
                                id: idx,
                                type: 'OCR',
                                codeName: o.field,
                                mapToLandmark: this.translateTermFromCodeName(rDocKey !== undefined ? rDocKey : docKey, 'ocr', o.field, false, true),
                                name: this.translateTermFromCodeName(rDocKey !== undefined ? rDocKey : docKey, 'ocr', o.field),
                                labels: text.map((lbl, idx) => { 
                                    let pos = undefined;
                                    if (o.coords !== undefined && o.coords[idx] !== undefined && o.coords[idx].length > 0) {
                                        pos = {
                                            x1: o.coords[idx][0],
                                            x2: o.coords[idx][2],
                                            x3: o.coords[idx][2],
                                            x4: o.coords[idx][0],
                                            y1: imgProps.height - o.coords[idx][1],
                                            y2: imgProps.height - o.coords[idx][1],
                                            y3: imgProps.height - o.coords[idx][3],
                                            y4: imgProps.height - o.coords[idx][3],
                                        }
                                    }
                                    let word: OCRWord = {
                                        id: idx,
                                        value: lbl,
                                        position: pos
                                    };
                                    return word;
                                }),
                                newlines: newlines,
                                count: text.length
                            }
                            return ocr;
                        }).filter((each: OCRData) => each.name !== '' && each.mapToLandmark !== '');
                    }

                    if (ocrData.landmarks !== undefined && ocrData.ocr_results !== undefined) {
                        if (session.raw_data.source === 'json') {
                            landmarks = ocrData.landmarks.map((each: any, idx: number) => handleLandmarks(each, idx)).filter((each: any) => each !== null);
                            ocr = ocrData.ocr_results.map((each: any, idx: number) => handleOCRs(each, idx)).filter((each: any) => each !== null);
                        } else if (session.raw_data.source === 'csv') {
                            landmarks = [handleLandmarks(ocrData.landmarks)].filter((each: any) => each !== null);
                            ocr = [handleOCRs(ocrData.ocr_results)].filter((each: any) => each !== null);
                        }
                    }
                }

                if (!back) {
                    given.originalID = {
                        originalImageProps: frontOriProps,
                        croppedImageProps: frontOcrProps,
                        spoof: ocrData !== undefined && ocrData.spoof_results !== undefined ? ocrData.spoof_results.is_card_spoof : false,
                        flags: ocrData !== undefined && ocrData.flags !== undefined ? ocrData.flags : [],
                        segmentation: frontSeg,
                        landmark: landmarks,
                        ocr: ocr,
                    }
                } else {
                    given.backID = {
                        originalImageProps: backOriProps,
                        croppedImageProps: backOcrProps,
                        spoof: ocrData !== undefined && ocrData.spoof_results !== undefined ? ocrData.spoof_results.is_card_spoof : false,
                        flags: ocrData !== undefined && ocrData.flags !== undefined ? ocrData.flags : [],
                        segmentation: backSeg,
                        landmark: landmarks,
                        ocr: ocr
                    }
                }

                if (session.raw_data.face_compare !== undefined) {
                    given.face = {
                        liveness: session.raw_data.face_compare.liveness,
                        videoFlags: session.raw_data.face_compare.videoFlags,
                        match: session.raw_data.face_compare.faceCompareMatch
                    }
                }
            } else {
                // if no raw_data, this means there is no csv OR json associated
                // only load imageprops
                let oriSrc = back ? session.back_ori : session.front_ori;
                let oriProps: ImageProps = {height: -1, width: -1};
                if (oriSrc !== undefined) {
                    oriProps = await new Promise((res, rej) => {
                        let img = new Image();
                        img.onload = () => {
                            let props: ImageProps = {
                                height: img.height,
                                width: img.width
                            }
                            res(props);
                        }
                        img.src = oriSrc;
                    })
                }

                if (back) {
                    backOriProps = oriProps;
                } else {
                    frontOriProps = oriProps;
                }

                let ocrSrc = !back ? session.front_ocr : session.back_ocr;
                let imgProps: ImageProps = {height: -1, width: -1};
                if (ocrSrc !== undefined) {
                    imgProps = await new Promise((res, rej) => {
                        let img = new Image();
                        img.onload = () => {
                            let props: ImageProps = {
                                height: img.height,
                                width: img.width
                            }
                            res(props);
                        }
                        img.src = ocrSrc;
                    })
                }

                if (!back) {
                    frontOcrProps = imgProps;
                } else {
                    backOcrProps = imgProps;
                }

                if (!back) {
                    given.originalID = {
                        originalImageProps: frontOriProps,
                        croppedImageProps: frontOcrProps,
                        spoof: false,
                        flags: [],
                        segmentation: undefined,
                        landmark: [],
                        ocr: [],
                    }
                } else {
                    given.backID = {
                        originalImageProps: backOriProps,
                        croppedImageProps: backOcrProps,
                        spoof: false,
                        flags: [],
                        segmentation: undefined,
                        landmark: [],
                        ocr: [],
                    }
                }
            }
            return given;
        }
    
        if (session.doc_faces === 1) {
            return new Promise((res, rej) => {
                load(session.doc_type, result, undefined)
                .then((val) => {
                    if (val === {}){
                        res(undefined);
                    } else {
                        res(val);
                    }
                })
                .catch((err) => { console.error(err); res(result);})
            })
        } else {
            return new Promise((res, rej) => {
                load(session.doc_type + "Front", result, false)
                .then((val) => load(session.doc_type + "Back", val, true)
                                .then((fin) => {
                                    if (fin === {}) {
                                        res(undefined);
                                    } else {
                                        res(fin);
                                    }
                                }))
                .catch((err) => { console.error(err);
                    res(result); });
            })
        }
    }

    // loads session data received into the given IDState
    public static loadSessionData(session: any, ID: IDState): Promise<IDState> {
        return new Promise<IDState>(async (res, rej) => {
            let sessionID = session.sessionID;
            // console.log(session);
            this.loadGivenData(session).then((givenData) => {
                res({
                    ...ID,
                    dataLoaded: true,
                    originalID: this.loadImageState(session, sessionID, true),
                    backID: this.loadImageState(session, sessionID, false),
                    croppedFace: this.dataURLtoFile(session.cropped_face, sessionID + "cropped_face.jpg"),
                    selfieImage: this.dataURLtoFile(session.face, sessionID + "_face.jpg"),
                    selfieVideo: this.dataURLtoFile(session.face_video, sessionID + "_face_video.mp4"),
                    videoStills: session.face_video_stills !== undefined ? session.face_video_stills.map((each: any, idx: number) => 
                        this.dataURLtoFile(each, sessionID + "_face_" + (idx + 1) + ".jpg")
                    ) : undefined,
                    givenData: givenData,
                    frontIDFlags: givenData.originalID !== undefined ? givenData.originalID!.flags : [],
                    backIDFlags: givenData.backID !== undefined ? givenData.backID!.flags : [],
                    // videoLiveness: givenData.face !== undefined ? givenData.face.liveness : undefined,
                    // videoFlags: givenData.face !== undefined ? givenData.face.videoFlags : [],
                });
            });
        })
    }

    // converts IDState to compatible json output
    public static extractOutput(ID: IDState, face?: boolean): any {
        const translateLandmarkName = (docType: string, landmark: LandmarkData, frontBack?: string) => {
            let outputName = this.translateTermFromCodeName(docType + (frontBack !== undefined ? frontBack : ""), 'landmark', landmark.codeName, true);
            let lm: LandmarkData = {
                id: landmark.id,
                type: 'landmark',
                codeName: landmark.codeName,
                name: outputName,
                flags: landmark.flags,
                position: landmark.position
            }
            return lm;
        }

        const translateOCRName = (docType: string, ocr: OCRData, frontBack?: string) => {
            let outputName = this.translateTermFromCodeName(docType + (frontBack !== undefined ? frontBack : ""), 'ocr', ocr.codeName, true);
            let o: OCRData = {
                id: ocr.id,
                type: 'OCR',
                codeName: ocr.codeName,
                name: outputName,
                mapToLandmark: ocr.mapToLandmark,
                newlines: ocr.newlines,
                count: ocr.count,
                labels: ocr.labels
            }
            return o;
        }
        // console.log(ID.internalIDs);
        return {
            dateCreated: ID.dateCreated,
            sessionID: ID.sessionID,
            originalIDRotation: ID.originalIDRotation,
            backIDRotation: ID.backIDRotation,
            frontIDFlags: ID.frontIDFlags,
            backIDFlags: ID.backIDFlags,
            
            processed: ID.internalIDs.map((each) => each.processed),
            processStage: ID.internalIDs.map((each) => each.processStage),
            documentType: ID.internalIDs.map((each) => each.documentType),

            originalImageProps: {
                originalID: ID.givenData !== undefined ? ID.givenData.originalID!.originalImageProps : undefined,
                backID: ID.givenData !== undefined ? ID.givenData.backID!.originalImageProps : undefined
            },
            croppedImageProps: {
                originalID: ID.givenData !== undefined ? ID.givenData.originalID!.croppedImageProps : undefined,
                backID: ID.givenData !== undefined ? ID.givenData.backID!.croppedImageProps : undefined
            },
            segmentation: {
                originalID: ID.internalIDs.map((each) => {return {IDBox: each.originalID!.IDBox, passesCrop: each.originalID!.passesCrop}}),
                backID: ID.internalIDs.map((each) => {
                    if (each.backID !== undefined) {
                        return {IDBox: each.backID!.IDBox, passesCrop: each.backID!.passesCrop};
                    } else {
                        return undefined;
                    }
                })
            },
            landmarks: {
                originalID: ID.internalIDs.map((each) => each.originalID!.landmark.map((lm) => 
                    translateLandmarkName(each.documentType!, lm, each.processStage === IDProcess.SINGLE ? "" : "Front"))),
                backID: ID.internalIDs.map((each) => {
                    if (each.backID !== undefined) {
                        return each.backID!.landmark.map((lm) => 
                        translateLandmarkName(each.documentType!, lm, "Back"));
                    } else {
                        return undefined;
                    }
                })
            },
            ocr: {
                originalID: ID.internalIDs.map((each) => each.originalID!.ocr.map((ocr) => 
                    translateOCRName(each.documentType!, ocr, each.processStage === IDProcess.SINGLE ? "" : "Front"))),
                backID: ID.internalIDs.map((each) => {
                    if (each.backID !== undefined) {
                        return each.backID!.ocr.map((ocr) => 
                            translateOCRName(each.documentType!, ocr, "Back"));
                    } else {
                        return undefined;
                    }
                })
            },

            videoLiveness: ID.videoLiveness,
            videoFlags: ID.videoFlags,
            faceCompareMatch: face ? [ID.faceCompareMatch] : ID.internalIDs.map((each) => each.faceCompareMatch)
        }
    }

    // HELPER FUNCTIONS
    // converts base64 string to File object
    public static dataURLtoFile(dataurl: string, filename: string): File {
        if (!dataurl) {
            dataurl = DummyImage;
            filename = "notfound";
        }
        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)![1],
            bstr = atob(arr[1]), 
            n = bstr.length, 
            u8arr = new Uint8Array(n);

        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    public static dateToString(date?: Date) {
        if (date === undefined) return '';
        let month = '';
        if (date.getMonth() + 1 < 10) {
            month = '0' + (date.getMonth() + 1);
        } else {
            month += (date.getMonth() + 1);
        }
        let day = '';
        if (date.getDate() < 10) {
            day = '0' + date.getDate();
        } else {
            day += date.getDate();
        }
        return date.getFullYear() + month + day;
    }

    // translates codename to output/display name
    public static translateTermFromCodeName(doc: string, type: string, key: string, output?: boolean, map?: boolean): string {
        switch (type) {
            case ('landmark'): { 
                let idx = options.landmark.keys.findIndex((each) => each === doc);
                if (idx === -1) return '';
                let i = options.landmark.compulsory.codeNames[idx].findIndex((each) => each === key);
                if (i === -1) {
                    i = options.landmark.optional.codeNames[idx].findIndex((each) => each === key);
                    if (i === -1) return '';
                    if (output) {
                        return options.landmark.optional.outputNames[idx][i];
                    } else {
                        return options.landmark.optional.displayNames[idx][i]; 
                    }
                } else {
                    if (output) {
                        return options.landmark.compulsory.outputNames[idx][i];
                    } else {
                        return options.landmark.compulsory.displayNames[idx][i]; 
                    }
                }
            }
            case ('ocr'): { 
                let idx = options.ocr.keys.findIndex((each) => each === doc);
                if (idx === -1) return '';
                let i = options.ocr.codeNames[idx].findIndex((each) => each === key);
                if (i === -1) return '';
                if (output) {
                    return options.ocr.outputNames[idx][i];
                } else {
                    return map ? options.ocr.mapToLandmark[idx][i] : options.ocr.displayNames[idx][i]; 
                }
            }
            default: break;
        }
        return '';
    }

    public static getOverallStatus(phases: PhasesChecked, annoState: AnnotationState, processType: ProcessType): AnnotationStatus {
        switch (processType) {
            case (ProcessType.WHOLE): {
                if (annoState.match && annoState.video) {
                    if (annoState.front.seg && annoState.front.landmark && annoState.front.ocr
                        && annoState.back.seg && annoState.back.landmark && annoState.back.ocr) {
                            return AnnotationStatus.COMPLETE;
                        }
                }
                return AnnotationStatus.INCOMPLETE;
            }
            case (ProcessType.SEGMENTATION): {
                return annoState.front.seg && annoState.back.seg ? AnnotationStatus.COMPLETE : AnnotationStatus.INCOMPLETE;
            }
            case (ProcessType.LANDMARK): {
                if (annoState.front.seg && annoState.front.landmark) {
                    if (annoState.back.landmark && annoState.back.landmark) {
                        return AnnotationStatus.COMPLETE;
                    }
                }
                return AnnotationStatus.INCOMPLETE;
            }
            case (ProcessType.OCR): {
                if (annoState.front.seg && annoState.front.landmark && annoState.front.ocr) {
                    if (annoState.back.landmark && annoState.back.landmark && annoState.back.ocr) {
                        return AnnotationStatus.COMPLETE;
                    }
                }
                return AnnotationStatus.INCOMPLETE;
            }
            case (ProcessType.LIVENESS): {
                if (annoState.video) {
                    if (annoState.front.seg && annoState.front.landmark && annoState.front.ocr) {
                        if (annoState.back.landmark && annoState.back.landmark && annoState.back.ocr) {
                            return AnnotationStatus.COMPLETE;
                        }
                    }
                }
                return AnnotationStatus.INCOMPLETE;
            }
            case (ProcessType.FACE): {
                if (!phases.video && !phases.face) {
                    return AnnotationStatus.NOT_APPLICABLE;
                } else {
                    if (phases.video && phases.face) {
                        return annoState.match && annoState.video ? AnnotationStatus.COMPLETE : AnnotationStatus.INCOMPLETE;
                    } else if (phases.video) {
                        return annoState.video ? AnnotationStatus.COMPLETE : AnnotationStatus.INCOMPLETE;
                    } else {
                        return annoState.match ? AnnotationStatus.COMPLETE : AnnotationStatus.INCOMPLETE;
                    }
                }
            }
            default: return AnnotationStatus.NOT_APPLICABLE;;
        }
    }
}