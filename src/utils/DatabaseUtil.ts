import { IDState, GivenData } from '../store/id/types';
import { ImageState, LandmarkData, OCRData, OCRWord, ImageProps } from '../store/image/types';
import { Rotation } from './enums';
import { DummyImage } from './dummy';
import options from '../options.json';

export class DatabaseUtil {

    public static initializeID(session: any, date: string, index: number): IDState {
        let id = session.sessionID;
        return {
            originalID: {
                image: this.dataURLtoFile(session.mykad_front_ori, id + "_mykad_front_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.mykad_front_ocr, id + "_mykad_front_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            backID: {
                image: this.dataURLtoFile(session.mykad_back_ori, id + "_mykad_back_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.mykad_front_ocr, id + "mykad_back_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            croppedFace: this.dataURLtoFile(session.mykad_face, id + "_mykad_face.jpg"),
            selfieImage: this.dataURLtoFile(session.face, id + "_face.jpg"),
            selfieVideo: this.dataURLtoFile(session.face_video, id + "_face_video.mp4"),
            videoStills: session.face_video_stills !== undefined ? session.face_video_stills.map((each: any, idx: number) => 
                this.dataURLtoFile(each, id + "_face_" + (idx + 1) + ".jpg")
            ) : undefined,
            dirty: false,
            dataLoaded: false,
            processed: false,
            index: index,
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

    private static translateTermFromCodeName(doc: string, type: string, key: string, output?: boolean, map?: boolean): string {
        switch (type) {
            case ('landmark'): { 
                let idx = options.landmark.keys.findIndex((each) => each === doc);
                if (idx === -1) return '';
                let i = options.landmark.codeNames[idx].findIndex((each) => each === key);
                if (i === -1) return '';
                if (output) {
                    return options.landmark.outputNames[idx][i];
                } else {
                    return options.landmark.displayNames[idx][i]; 
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

    private static loadMyKadID(session: any, id: string, front: boolean): ImageState {
        let oriSrc = front ? session.mykad_front_ori : session.mykad_back_ori;
        let ocrSrc = front ? session.mykad_front_ocr : session.mykad_back_ocr;
        let oriSrcName = front ? "_mykad_front_ori.jpg" : "_mykad_back_ori.jpg";
        let ocrSrcName = front ? "_mykad_front_ocr.jpg" : "mykad_back_ocr.jpg";

        let ID: ImageState = {
            image: this.dataURLtoFile(oriSrc, id + oriSrcName),
            croppedImage: this.dataURLtoFile(ocrSrc, id + ocrSrcName),
            landmark: [],
            ocr: [],
        }

        return ID;
    }

    private static loadMyKadGivenData(session: any): Promise<GivenData> {
        let result: GivenData = {};
        let docKey = ['MyKadFront', 'MyKadBack'];

        const load = async (docKey: string, front: boolean, given: GivenData) => {
            let rawData = front ? session.raw_data.front_ocr : session.raw_data.back_ocr;
            if (rawData !== undefined) {
                let landmarks = [];
                let ocr = [];

                let ocrSrc = front ? session.mykad_front_ocr : session.mykad_back_ocr;
                let imgProps: ImageProps = await new Promise((res, rej) => {
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
                given.imageProps = imgProps;

                landmarks = rawData.landmarks.map((each: any, idx: number) => {
                    let flags: string[] = [];
                    let glare = rawData.glare_results.find((glare: any) => glare.field === each.id);
                    if (glare !== undefined) {
                        if (glare.glare) {
                            flags = ['glare'];
                        }
                    }

                    let landmark: LandmarkData = {
                        id: idx,
                        type: 'landmark',
                        codeName: each.id,
                        name: this.translateTermFromCodeName(docKey, 'landmark', each.id),
                        flags: flags,
                        position: {
                            x1: each.coords[0],
                            x2: each.coords[2],
                            x3: each.coords[2],
                            x4: each.coords[0],
                            y1: imgProps.height - each.coords[1],
                            y2: imgProps.height - each.coords[1],
                            y3: imgProps.height - each.coords[3],
                            y4: imgProps.height - each.coords[3]
                        }
                    }
                    return landmark;
                }).filter((each: LandmarkData) => each.name !== '');
                ocr = rawData.ocr_results.map((each: any, idx: number) => {
                    let text: string[] = each.text.split('\n').join(' ').split(' ');
                    let ocr: OCRData = {
                        id: idx,
                        type: 'OCR',
                        codeName: each.field,
                        mapToLandmark: this.translateTermFromCodeName(docKey, 'ocr', each.field, false, true),
                        name: this.translateTermFromCodeName(docKey, 'ocr', each.field),
                        labels: text.map((lbl, idx) => { 
                            let pos = undefined;
                            if (each.coords !== undefined && each.coords[idx] !== undefined && each.coords[idx].length > 0) {
                                pos = {
                                    x1: each.coords[idx][0],
                                    x2: each.coords[idx][2],
                                    x3: each.coords[idx][2],
                                    x4: each.coords[idx][0],
                                    y1: imgProps.height - each.coords[idx][1],
                                    y2: imgProps.height - each.coords[idx][1],
                                    y3: imgProps.height - each.coords[idx][3],
                                    y4: imgProps.height - each.coords[idx][3],
                                }
                            }
                            let word: OCRWord = {
                                id: idx,
                                value: lbl,
                                position: pos
                            };
                            return word;
                        }),
                        count: text.length
                    }
                    return ocr;
                }).filter((each: OCRData) => each.name !== '' && each.mapToLandmark !== '');
                if (front) {
                    let bounds = rawData.landmarks.find((each: any) => each.id === 'mykad');
                    given.originalID = {
                        spoof: rawData.spoof_results.is_card_spoof,
                        segmentation: bounds !== undefined ? {
                            id: 0,
                            position: {x1: bounds.coords[0],
                                x2: bounds.coords[0] + bounds.coords[2],
                                x3: bounds.coords[0] + bounds.coords[2],
                                x4: bounds.coords[0],
                                y1: bounds.coords[1] + bounds.coords[3],
                                y2: bounds.coords[1] + bounds.coords[3],
                                y3: bounds.coords[1],
                                y4: bounds.coords[1]}
                        } : undefined,
                        landmark: landmarks,
                        ocr: ocr,
                        // faceCompareMatch: rawData.
                    }
                } else {
                    let bounds = rawData.landmarks.find((each: any) => each.id === 'mykad_back');
                    given.backID = {
                        spoof: rawData.spoof_results.is_card_spoof,
                        segmentation: bounds !== undefined ? {
                            id: 0,
                            position: {x1: bounds.coords[0],
                                x2: bounds.coords[0] + bounds.coords[2],
                                x3: bounds.coords[0] + bounds.coords[2],
                                x4: bounds.coords[0],
                                y1: bounds.coords[1] + bounds.coords[3],
                                y2: bounds.coords[1] + bounds.coords[3],
                                y3: bounds.coords[1],
                                y4: bounds.coords[1]}
                        } : undefined,
                        landmark: landmarks,
                        ocr: ocr
                    }
                }
                return given;
            }
            return given;
        }
    
        return new Promise((res, rej) => {
            load(docKey[0], true, result)
            .then((val) => load(docKey[1], false, val)
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

    public static loadSessionData(session: any, ID: IDState): Promise<IDState> {
        return new Promise<IDState>(async (res, rej) => {
            let sessionID = session.sessionID;
            this.loadMyKadGivenData(session).then((givenData) => {
                res({
                    ...ID,
                    dataLoaded: true,
                    // what if its not mykad????
                    originalID: this.loadMyKadID(session, sessionID, true),
                    backID: this.loadMyKadID(session, sessionID, false),
                    croppedFace: this.dataURLtoFile(session.mykad_face, sessionID + "_mykad_face.jpg"),
                    selfieImage: this.dataURLtoFile(session.face, sessionID + "_face.jpg"),
                    selfieVideo: this.dataURLtoFile(session.face_video, sessionID + "_face_video.mp4"),
                    videoStills: session.face_video_stills !== undefined ? session.face_video_stills.map((each: any, idx: number) => 
                        this.dataURLtoFile(each, sessionID + "_face_" + (idx + 1) + ".jpg")
                    ) : undefined,
                    givenData: givenData,
                    frontIDFlags: givenData.originalID !== undefined && givenData.originalID!.spoof ? ['spoof'] : [],
                    backIDFlags: givenData.backID !== undefined && givenData.backID!.spoof ? ['spoof'] : []
                });
            });
        })
    }

    public static extractOutput(ID: IDState, face?: boolean): any {
        const translateLandmarkName = (landmark: LandmarkData, front: boolean) => {
            let outputName = this.translateTermFromCodeName(front ? 'MyKadFront' : 'MyKadBack', 'landmark', landmark.codeName, true);
            landmark.name = outputName;
            return landmark;
        }

        const translateOCRName = (ocr: OCRData, front: boolean) => {
            let outputName = this.translateTermFromCodeName(front ? 'MyKadFront' : 'MyKadBack', 'ocr', ocr.codeName, true);
            ocr.name = outputName;
            return ocr;
        }

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

            imageProps: ID.givenData !== undefined ? ID.givenData.imageProps : undefined,
            segmentation: {
                originalID: ID.internalIDs.map((each) => each.originalID!.IDBox),
                backID: ID.internalIDs.map((each) => each.backID!.IDBox)
            },
            landmarks: {
                originalID: ID.internalIDs.map((each) => each.originalID!.landmark.map((lm) => translateLandmarkName(lm, true))),
                backID: ID.internalIDs.map((each) => each.backID!.landmark.map((lm) => translateLandmarkName(lm, false)))
            },
            ocr: {
                originalID: ID.internalIDs.map((each) => each.originalID!.ocr.map((ocr) => translateOCRName(ocr, true))),
                backID: ID.internalIDs.map((each) => each.backID!.ocr.map((ocr) => translateOCRName(ocr, false))),
            },

            videoLiveness: ID.videoLiveness,
            videoFlags: ID.videoFlags,
            faceCompareMatch: face ? [ID.faceCompareMatch] : ID.internalIDs.map((each) => each.originalID!.faceCompareMatch)
        }
    }

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

    public static dateToString(date: Date) {
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

    public static beautifyWord(word: string): string {
        let separates = word.replace(/([A-Z])/g,' $1');
        return separates.charAt(0).toUpperCase()+separates.slice(1);
    }

}