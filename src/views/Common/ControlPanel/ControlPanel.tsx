import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess, ProcessType } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Modal, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion, Spinner } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState, InternalIDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox, OCRData, OCRWord, LandmarkData, Position } from '../../../store/image/types';
import { progressNextStage, getPreviousID, getNextID, saveToLibrary } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, setIDBox, deleteIDBox, saveCroppedImage, refreshIDs, saveDocumentType, updateVideoData, saveToInternalID, updateFrontIDFlags, updateBackIDFlags, restoreID, clearInternalIDs } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, setCurrentSymbol, setCurrentWord, addLandmarkData, updateLandmarkFlags, addOCRData, setFaceCompareMatch, restoreImage } from '../../../store/image/actionCreators';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { HOST, PORT, TRANSFORM } from '../../../config';
import { GeneralUtil } from '../../../utils/GeneralUtil';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';
const axios = require('axios');

interface IProps {
    database: string;
    processType: ProcessType;
    currentStage: CurrentStage;
    currentIndex: number;
    totalIDs: number;
    currentID: IDState;
    indexedID: IDState;
    internalID: InternalIDState;
    currentImage: ImageState;

    // Moving between stages
    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    getPreviousID: () => GeneralActionTypes;
    getNextID: () => GeneralActionTypes;
    loadImageState: (currentImage: ImageState, passesCrop?: boolean) => ImageActionTypes;

    // Seg Check
    loadNextID: (ID: IDState) => IDActionTypes;
    createNewID: (IDBox: IDBox, passesCrop?: boolean) => IDActionTypes;
    setIDBox: (IDBox: IDBox, croppedImage?: File) => IDActionTypes;
    deleteIDBox: (index: number) => IDActionTypes;
    saveCroppedImage: (croppedImage: File, index?: number) => IDActionTypes;
    refreshIDs: (originalProcessed: boolean) => IDActionTypes;
    saveDocumentType: (internalIndex: number, documentType: string) => IDActionTypes;
    updateFrontIDFlags: (flags: string[]) => IDActionTypes;
    updateBackIDFlags: (flags: string[]) => IDActionTypes;
    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;
    clearInternalIDs: () => IDActionTypes;

    // Landmark
    setCurrentSymbol: (symbol?: string, landmark?: string) => ImageActionTypes;
    addLandmarkData: (landmark: LandmarkData) => ImageActionTypes;
    updateLandmarkFlags: (codeName: string, flags: string[]) => ImageActionTypes;

    // OCR
    setCurrentWord: (word: OCRWord) => ImageActionTypes;
    addOCRData: (ocr: OCRData) => ImageActionTypes;

    // Video Liveness & Match
    updateVideoData: (liveness: boolean, flags: string[]) => IDActionTypes;
    setFaceCompareMatch: (match: boolean) => ImageActionTypes;

    // Saving to store
    saveToInternalID: (imageState: ImageState, next: boolean) => IDActionTypes;
    saveToLibrary: (id: IDState) => GeneralActionTypes;
    restoreID: () => IDActionTypes;
    restoreImage: () => ImageActionTypes;
}

interface IState {
    // ownStage: CurrentStage;
    showSaveAndQuitModal: boolean;
    // Seg Check
    loadedSegCheckImage: boolean;
    showAddDocTypeModal: boolean;
    documentTypes: string[];
    singleDocumentType: string;
    selectedDocumentTypes: {
        id: number,
        value: string
    }[];
    passesCrop?: boolean;
    isCropping: boolean;
    overallFlags: {
        category: string,
        flags: string[],
    }[];
    selectedFrontIDFlags: string[];
    selectedBackIDFlags: string[];

    // Landmark
    showAddLandmarkModal: boolean;
    landmarksLoaded: boolean;
    landmarks: {
        docType: string,
        landmarks: {
            name: string,
            codeName: string,
            flags: string[]
        }[]
    }[];
    currentLandmarks: {
        name: string,
        codeName: string,
        flags: string[]
    }[];
    landmarkFlags: {
        category: string,
        flags: string[],
    }[];
    selectedLandmark: string;

    // OCR
    showAddOCRModal: boolean;
    OCRLoaded: boolean;
    OCR: {
        docType: string,
        details: {
            name: string,
            codeName: string,
            mapToLandmark: string,
            value?: string
        }[]
    }[];
    currentOCR: {
        name: string,
        codeName: string,
        mapToLandmark: string,
        value?: string
    }[];

    // Liveness
    videoFlagsLoaded: boolean;
    videoFlags: {
        category: string,
        flags: string[]
    }[];
    selectedVideoFlags: string[];
    passesLiveness?: boolean;
    livenessValidation: boolean;

    faceCompareMatch?: boolean;
}

class ControlPanel extends React.Component<IProps, IState> {

    docTypeRef: any = undefined;

    constructor(props: IProps) {
        super(props);
        this.state = {
            showSaveAndQuitModal: false,
            // ownStage: CurrentStage.SEGMENTATION_CHECK,
            loadedSegCheckImage: false,
            showAddDocTypeModal: false,
            documentTypes: [],
            singleDocumentType: '',
            selectedDocumentTypes: [],
            isCropping: false,
            overallFlags: [],
            selectedFrontIDFlags: [],
            selectedBackIDFlags: [],

            showAddLandmarkModal: false,
            landmarksLoaded: false,
            landmarks: [],
            currentLandmarks: [],
            landmarkFlags: [],
            selectedLandmark: '',

            showAddOCRModal: false,
            OCRLoaded: false,
            OCR: [],
            currentOCR: [],

            videoFlagsLoaded: false,
            videoFlags: [],
            selectedVideoFlags: [],
            livenessValidation: false,
        }
    }

    componentDidUpdate(previousProps: IProps, previousState: IState) {
        switch (this.props.currentStage) {
            case (CurrentStage.SEGMENTATION_CHECK): {
                if (this.props.indexedID === undefined) break;
                if (previousProps.indexedID.index !== this.props.indexedID.index) {
                    if (!this.props.indexedID.dataLoaded) {
                        GeneralUtil.toggleOverlay(true);
                        axios.post('/loadSessionData', {
                            database: this.props.database,
                            date: this.props.indexedID.dateCreated,
                            sessionID:  this.props.indexedID.sessionID
                        }).then((res: any) => {
                            if (res.status === 200) {
                                DatabaseUtil.loadSessionData(res.data, this.props.indexedID).then((completeID) => {
                                    this.props.loadNextID(completeID);
                                    this.loadSegCheckImage();
                                    this.initializeSegCheckData();
                                    this.setState({loadedSegCheckImage: true}, () => GeneralUtil.toggleOverlay(false));
                                });
                            }
                        }).catch((err: any) => {
                            console.error(err);
                            // GeneralUtil.toggleOverlay(false);
                        });
                    } else {
                        this.props.loadNextID(this.props.indexedID);
                        this.loadSegCheckImage();
                        this.initializeSegCheckData();
                        this.setState({loadedSegCheckImage: true}, () => GeneralUtil.toggleOverlay(false));
                    }
                    break;
                }
                if (previousProps.currentStage !== this.props.currentStage || previousProps.currentID.sessionID !== this.props.currentID.sessionID) {
                    this.initializeSegCheckData();
                }
                // initial load of doctypes and overall flags from config json, initial load of image
                if (this.state.documentTypes.length === 0) this.loadSegCheckData();
                if (!this.state.loadedSegCheckImage) {
                    this.loadSegCheckImage();
                    this.initializeSegCheckData();
                    this.setState({loadedSegCheckImage: true});
                    break;
                }
                if (this.props.processType !== ProcessType.SEGMENTATION) {
                    // first time
                    if (previousProps.currentID.index === this.props.currentID.index && 
                        previousProps.internalID === undefined && this.props.internalID !== undefined) {
                        if (this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                            this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                        }
                        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        break;
                    }
                    // repeated
                    if (previousProps.internalID !== undefined && this.props.internalID !== undefined
                        && previousProps.internalID.originalID!.croppedImage!.lastModified !== this.props.internalID.originalID!.croppedImage!.lastModified) {
                        if (this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                            this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                        }
                        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        break;
                    }
                } else {
                    // get mykadback of next internal id OR skip over
                    if (previousProps.currentID.internalIndex < this.props.currentID.internalIndex) {
                        if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
                            if (this.props.internalID.documentType !== 'MyKad') {
                                this.props.saveToInternalID(this.props.internalID.originalID!, true);
                            } else {
                                this.props.saveToInternalID(this.props.internalID.originalID!, false);
                                this.loadBackId();
                            }
                        }

                        if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length
                            || this.props.currentID.backIDsProcessed === this.props.currentID.internalIDs.length) {
                            // next ID
                            this.loadNextID(false);
                        }
                    // coming from seg edit of front id
                    } 
                    // else if (this.props.currentID.internalIDs.length > 0 
                    //     && previousProps.currentID.internalIndex === this.props.currentID.internalIndex
                    //     && this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                    //         console.log(this.props.internalID);
                    //     this.props.loadImageState(this.props.internalID.backID!);
                    //     if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
                    //         if (this.props.internalID.documentType !== 'MyKad') {
                    //             this.props.saveToInternalID(this.props.internalID.originalID!, true);
                    //         } else {
                    //             this.props.saveToInternalID(this.props.internalID.originalID!, false);
                    //             this.loadBackId();
                    //         }
                    //     }

                    //     if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length
                    //         || this.props.currentID.backIDsProcessed === this.props.currentID.internalIDs.length) {
                    //         // next ID
                    //         this.loadNextID();
                    //     }
                    // }
                }
                break;
            }
            case (CurrentStage.SEGMENTATION_EDIT): {
                let docTypes = this.state.selectedDocumentTypes;
                if (docTypes.length < this.props.currentID.internalIDs.length) {
                    this.props.currentID.internalIDs.forEach((each, idx) => {
                        let doc = docTypes.find((doc) => doc.id === idx);
                        if (doc === undefined) {
                            docTypes.push({
                                id: idx,
                                value: each.documentType === undefined ? this.state.documentTypes[0] : each.documentType
                            });
                        }
                    })
                    this.setState({selectedDocumentTypes: docTypes});
                }        
                break;
            }
            case (CurrentStage.LANDMARK_EDIT): {
                if (this.props.internalID === undefined) return;
                if (!this.state.landmarksLoaded) {
                    console.log('intial load of landmark set');
                    this.loadLandmarkData();
                } else {
                    this.state.landmarks.forEach((each) => {
                        // current set of landmarks is incorrect for the doctype
                        if (each.docType === this.props.internalID.processStage && each.landmarks !== this.state.currentLandmarks) {
                            console.log('reload set of landmark');
                            this.initializeLandmarkData(each.landmarks);
                            this.setState({currentLandmarks: each.landmarks});
                        } else if (each.docType === this.props.internalID.processStage && each.landmarks === this.state.currentLandmarks
                            && this.props.currentImage.landmark.length === 0) {
                            // initial landmark names not added to image state
                            console.log('adding intiial landmarks');
                            this.initializeLandmarkData(this.state.currentLandmarks);
                        }
                    });
                }
                break;
            }
            case (CurrentStage.OCR_DETAILS): {
                if (!this.state.OCRLoaded) {
                    this.loadOCRDetails();
                } else {

                    this.state.OCR.forEach((each) => {
                        if (each.docType === this.props.internalID.processStage) {
                            if (each.details.length !== this.state.currentOCR.length) {
                                let ocrs = this.initializeOCRData(each.details);
                                this.setState({currentOCR: ocrs});
                            } else if (each.details.some((d) => {
                                    let curr = this.state.currentOCR.find((ocr) => ocr.codeName === d.codeName);
                                    return curr === undefined
                                })) {
                                // check if set of ocrs are correct given same length
                                let ocrs = this.initializeOCRData(each.details);
                                this.setState({currentOCR: ocrs});
                            }
                        }
                    })
                }
                break;
            }
            case (CurrentStage.FR_LIVENESS_CHECK): {
                if (!this.state.videoFlagsLoaded) {
                    this.loadVideoFlags();
                };
                if (this.props.processType !== ProcessType.LIVENESS && 
                    this.props.currentID.internalIDs.length > 0 && this.props.currentID.videoLiveness !== undefined) {
                    this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                }
                if (previousProps.currentID.videoLiveness !== this.props.currentID.videoLiveness) {
                    if (this.props.processType === ProcessType.LIVENESS || this.props.internalID === undefined || 
                        this.props.internalID && this.props.internalID.originalID!.croppedImage!.name === 'notfound') {
                        this.loadNextID(false);
                    } else {
                        this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                    }
                }
                break;
            }
            case (CurrentStage.END_STAGE): {
                if (previousProps.internalID) {
                    if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
                        console.log('next id');
                        this.loadNextID(false);
                    } else if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
                        if (previousProps.internalID.originalID!.faceCompareMatch !== undefined && !this.props.internalID.processed) {
                            console.log('next internal id');
                            this.loadNextInternalId();
                        } else if (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) {
                            console.log('liveness and match');
                            this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                            this.props.loadImageState(this.props.internalID.originalID!);
                        }
                    }
                }
                break;
            }
            case (CurrentStage.INTER_STAGE): {
                if (previousProps.currentStage !== CurrentStage.INTER_STAGE
                    || previousProps.currentID.internalIndex !== this.props.currentID.internalIndex) {
                    if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
                        this.loadNextID(false);
                    } else {
                        switch (this.props.processType) {
                            case (ProcessType.SEGMENTATION): {
                                switch (this.props.internalID.processStage) {
                                    case (IDProcess.MYKAD_FRONT): {
                                        this.props.saveToInternalID(this.props.internalID.originalID!, false);
                                        this.loadBackId();
                                        break;
                                    }
                                    case (IDProcess.MYKAD_BACK): {
                                        this.props.saveToInternalID(this.props.internalID.backID!, true);
                                        break;
                                    }
                                    case (IDProcess.OTHER):
                                    default: {
                                        this.props.saveToInternalID(this.props.internalID.originalID!, true);
                                        break;
                                    }
                                }
                                break;
                            }
                            case (ProcessType.LANDMARK):
                            case (ProcessType.OCR): {
                                switch (this.props.internalID.processStage) {
                                    // after completing landmark/ocr edit AND saving to internal id for MYKAD_FRONT
                                    case (IDProcess.MYKAD_BACK): {
                                        this.loadBackId();
                                        break;
                                    }
                                    // after completing landmark/ocr edit AND saving to internal id for MYKAD_BACK or OTHER -> move on to next internal ID
                                    case (IDProcess.OTHER):
                                    case (IDProcess.MYKAD_FRONT):
                                    default: {
                                        this.props.loadImageState(this.props.internalID.originalID!, false);
                                        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                                        break;
                                    }
                                }
                                break;
                            }
                            default: break;
                        }          
                    }
                }
                break;
            }
        }
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.SEGMENTATION_CHECK) {
            GeneralUtil.toggleOverlay(true);
            axios.post('/loadSessionData', {
                database: this.props.database,
                date: this.props.indexedID.dateCreated,
                sessionID:  this.props.indexedID.sessionID
            }).then((res: any) => {
                if (res.status === 200) {
                    DatabaseUtil.loadSessionData(res.data, this.props.indexedID)
                    .then((completeID) => {
                        this.props.loadNextID(completeID);
                        this.loadSegCheckData();
                        this.initializeSegCheckData();
                        GeneralUtil.toggleOverlay(false);
                    })
                }
            }).catch((err: any) => {
                console.error(err);
                GeneralUtil.toggleOverlay(false);
            });
        }
    }

    loadSegCheckImage = () => {
        if (this.props.currentID.originalIDProcessed) {
            this.props.loadImageState(this.props.currentID.backID!);
        } else {
            this.props.loadImageState(this.props.currentID.originalID!);
        }
    }

    loadSegCheckData = () => {
        let flags: {category: string, flags: string[]}[] = [];
        for (let i = 0; i < options.flags.overall.keys.length; i++) {
            flags.push({
                category: options.flags.overall.keys[i],
                flags: options.flags.overall.values[i]
            });
        }
        this.setState({
            documentTypes: options.documentTypes,
            singleDocumentType: options.documentTypes[0],
            overallFlags: flags
        });
    }

    initializeSegCheckData = () => {
        if (this.props.currentID.sessionID === '') return;
        let docType: string = '';
        let cropResult: boolean | undefined = undefined;
        let frontIDFlags: string[] = this.props.currentID.frontIDFlags !== undefined ? this.props.currentID.frontIDFlags : [];
        let backIDFlags: string[] = this.props.currentID.backIDFlags !== undefined ? this.props.currentID.backIDFlags : [];

        if (this.props.currentID.internalIDs.length > 0) {
            if (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined) {
                if (this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                    cropResult = this.props.internalID.backID!.passesCrop;
                } else {
                    cropResult = this.props.internalID.originalID!.passesCrop;
                }
            } else {
                if (this.props.currentID.internalIDs.length === 1) {
                    cropResult = this.props.currentID.internalIDs[0].originalID!.passesCrop;
                    docType = this.props.currentID.internalIDs[0].documentType !== undefined ? this.props.currentID.internalIDs[0].documentType : '';
                } else {
                    cropResult = false;
                }
            }
        } else if (this.props.currentID.givenData !== undefined) {
            if (this.props.currentID.originalIDProcessed) {
                if (this.props.currentID.givenData.backID !== undefined && this.props.currentID.givenData.backID.segmentation !== undefined) {
                    let seg = this.props.currentID.givenData.backID.segmentation;
                    if (seg.length <= 1) {
                        cropResult = seg[0] !== undefined ? seg[0]!.passesCrop : undefined;
                    } else {
                        cropResult = false;
                    }
                }
            } else {
                if (this.props.currentID.givenData.originalID !== undefined && this.props.currentID.givenData.originalID.segmentation !== undefined) {
                    let seg = this.props.currentID.givenData.originalID.segmentation;
                    if (seg.length <= 1) {
                        cropResult = seg[0] !== undefined ? seg[0]!.passesCrop : undefined;
                        docType = seg[0] !== undefined ? seg[0]!.documentType : '';
                    } else {
                        cropResult = false;
                        docType = seg[this.props.currentID.internalIndex] !== undefined ? seg[this.props.currentID.internalIndex]!.documentType : '';
                    }
                }
            }
        }

        if (docType !== '' ) {
            this.setState({passesCrop: cropResult, selectedFrontIDFlags: frontIDFlags, selectedBackIDFlags: backIDFlags, singleDocumentType: docType});
        } else {
            this.setState({passesCrop: cropResult, selectedFrontIDFlags: frontIDFlags, selectedBackIDFlags: backIDFlags});
        }
    }

    loadLandmarkData = () => {
        let docLandmarks: {docType: string, landmarks: {name: string, codeName: string, flags: string[]}[]}[] = [];
        let currentLandmarks: {name: string, codeName: string, flags: string[]}[] = [];
        let flags: {category: string, flags: string[]}[] = [];
        options.landmark.keys.forEach((each, idx) => {
            let landmarks: {name: string, codeName: string, flags: string[]}[] = [];
            options.landmark.displayNames[idx].forEach((each, i) => {
                landmarks.push({
                    name: each,
                    codeName: options.landmark.codeNames[idx][i],
                    flags: []
                });
            });
            docLandmarks.push({
                docType: each,
                landmarks: landmarks
            });

            if (this.props.internalID.processStage === each && this.props.currentImage.landmark.length === 0) {
                currentLandmarks = this.initializeLandmarkData(landmarks);
            }
        });

        options.flags.landmark.keys.forEach((each, idx) => {
            flags.push({
                category: each,
                flags: options.flags.landmark.values[idx]
            });
        })

        this.setState({landmarks: docLandmarks, currentLandmarks: currentLandmarks, landmarkFlags: flags, landmarksLoaded: true});
    }

    initializeLandmarkData = (landmarks: {name: string, codeName: string, flags: string[]}[]) => {
        let newLandmarks: {name: string, codeName: string, flags: string[]}[] = [];
        landmarks.forEach((each, idx) => {
            let landmark: LandmarkData = {
                id: idx,
                name: each.name,
                codeName: each.codeName,
                flags: each.flags,
                type: 'landmark'
            };
            
            let stLandmark = this.props.currentImage.landmark.find((lm) => each.codeName === lm.codeName);
            if (stLandmark !== undefined && stLandmark.position !== undefined) {
                landmark.position = stLandmark.position;
            } else if (this.props.currentID.givenData !== undefined) {
                // if db csv already has ocr data
                if (this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                    if (this.props.currentID.givenData.backID !== undefined) {
                        let givenLandmarks = this.props.currentID.givenData.backID.landmark[this.props.currentID.internalIndex];
                        if (givenLandmarks !== undefined) {
                            let dbLandmark = givenLandmarks.find((lm) => lm.codeName === each.codeName);
                            if (dbLandmark !== undefined) {
                                landmark.position = dbLandmark.position;
                            }
                        }
                    }
                } else {
                    if (this.props.currentID.givenData.originalID !== undefined) {
                        let givenLandmarks = this.props.currentID.givenData.originalID.landmark[this.props.currentID.internalIndex];
                        if (givenLandmarks !== undefined) {
                            let dbLandmark = givenLandmarks.find((lm) => lm.codeName === each.codeName);
                            if (dbLandmark !== undefined) {
                                landmark.position = dbLandmark.position;
                            }
                        }
                    }
                }
            }
            // if not, just initialize with the correct set of landmarks with each position as undefined
            this.props.addLandmarkData(landmark);
            newLandmarks.push(landmark);
        });
        return newLandmarks;
    }
    
    loadOCRDetails = () => {
        let docOCR: {docType: string, details: {name: string, codeName: string, mapToLandmark: string, value?: string}[]}[] = [];
        let currentOCR: {name: string, codeName: string, mapToLandmark: string, value?: string}[] = [];
        options.ocr.keys.forEach((each, idx) => {
            let ocr: {name: string, codeName: string, mapToLandmark: string, value?: string}[] = [];
            for (var i = 0; i < options.ocr.codeNames[idx].length; i++) {
                ocr.push({
                    name: options.ocr.displayNames[idx][i],
                    codeName: options.ocr.codeNames[idx][i],
                    mapToLandmark: options.ocr.mapToLandmark[idx][i],
                    value: undefined
                });
            }
            docOCR.push({
                docType: each,
                details: ocr
            });

            if (this.props.internalID.processStage === each) {
                currentOCR = this.initializeOCRData(ocr);
            }
        });

        this.setState({OCR: docOCR, currentOCR: currentOCR, OCRLoaded: true});
    }

    initializeOCRData = (ocrs: {name: string, codeName: string, mapToLandmark: string, value?: string}[]) => {
        let newOcrs: {name: string, codeName: string, mapToLandmark: string, value?: string}[] = [];
        ocrs.forEach((each, idx) => {
            let ocr: OCRData = {
                id: idx,
                name: each.name,
                codeName: each.codeName,
                type: 'OCR',
                mapToLandmark: each.mapToLandmark,
                count: 0,
                labels: []
            };
            
            let stOcr = this.props.currentImage.ocr.find((lm) => each.codeName === lm.codeName);
            if (stOcr !== undefined && stOcr.labels.some((e) => e.position !== undefined)) {
                ocr.labels = stOcr.labels;
                ocr.count = stOcr.count;
            } else if (this.props.currentID.givenData !== undefined) {
                // if db csv already has ocr data
                if (this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                    if (this.props.currentID.givenData.backID !== undefined) {
                        let givenOcrs = this.props.currentID.givenData.backID.ocr[this.props.currentID.internalIndex];
                        if (givenOcrs !== undefined) {
                            let dbOcr = givenOcrs.find((o) => o.codeName === each.codeName);
                            if (dbOcr !== undefined) {
                                ocr.count = dbOcr.count;
                                ocr.labels = dbOcr.labels;
                            }
                        }
                    }
                } else {
                    if (this.props.currentID.givenData.originalID !== undefined) {
                        let givenOcrs = this.props.currentID.givenData.originalID.ocr[this.props.currentID.internalIndex];
                        if (givenOcrs !== undefined) {
                            let dbOcr = givenOcrs.find((o) => o.codeName === each.codeName);
                            if (dbOcr !== undefined) {
                                ocr.count = dbOcr.count;
                                ocr.labels = dbOcr.labels;
                            }
                        }
                    }
                }
            }
            // if not, just initialize with the correct set of landmarks with each position as undefined
            this.props.addOCRData(ocr);
            newOcrs.push({
                name: ocr.name,
                codeName: ocr.codeName,
                mapToLandmark: ocr.mapToLandmark,
                value: ocr.labels.map((lbl) => lbl.value).join(' ')
            });
        });
        return newOcrs;
    }

    loadVideoFlags = () => {
        let vidFlags: {category: string, flags: string[]}[] = [];
        options.flags.video.keys.forEach((each, idx) => {
            let flags = options.flags.video.values[idx];
            vidFlags.push({category: each, flags: flags});
        });
        this.setState({videoFlags: vidFlags, videoFlagsLoaded: true});
    }

    // Seg Check Components
    segCheck = () => {
        const setSingleDocType = (e: any) => {
            if (this.state.landmarks.length === 0) {
                this.setState({singleDocumentType: e.target.value});
            } else {
                let landmarks = this.state.landmarks.find((each) => (each.docType === e.target.value))!;
                if (landmarks !== undefined) {
                    this.setState({singleDocumentType: e.target.value, currentLandmarks: landmarks.landmarks});
                } else {
                    this.setState({singleDocumentType: e.target.value});
                }
            }
        }

        const setFlag = (flags: string[]) => {
            if (this.props.currentID.originalIDProcessed) {
                this.setState({selectedBackIDFlags: flags});
            } else {
                this.setState({selectedFrontIDFlags: flags});
            }
        }

        const getCategoryFlags = (flags: string[]) => {
            let dividedFlags: string[][] = [];
            let values = this.state.selectedFrontIDFlags;

            if (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined && 
                this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                values = this.state.selectedBackIDFlags;
            }

            for (let i = 0; i < flags.length; i += 3) {
                dividedFlags.push(flags.slice(i, i + 3));
            }

            return (
                <div>
                    {
                        dividedFlags.map((divFlag, i) => {
                            return (
                                <div style={{width: "100%"}}>
                                    <ToggleButtonGroup key={i} type="checkbox" onChange={(val) => setFlag(val)}
                                        value={values}
                                        style={{marginBottom: "1rem"}}>
                                    {
                                        divFlag.map((flag, idx) => {
                                            return (<ToggleButton
                                                className="video-flags"
                                                key={idx}
                                                value={flag}
                                                variant="light"
                                                >
                                                {DatabaseUtil.beautifyWord(flag)}
                                            </ToggleButton>);
                                        })
                                    }   
                                    </ToggleButtonGroup>
                                </div>
                            );
                        })
                    }
                </div>
            )
        }

        const skipSegCheck = () => {
            this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
            this.props.updateBackIDFlags(this.state.selectedBackIDFlags);
            if (!this.props.currentID.originalIDProcessed) {
                // only when processing front ID: to clear out internal IDs in case any were created before skipping
                this.props.clearInternalIDs();
            }
            if ((this.props.processType === ProcessType.WHOLE || this.props.processType === ProcessType.LIVENESS)) {
                if (this.props.currentID.selfieVideo!.name !== 'notfound') {
                    this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                } else if (this.props.currentID.selfieImage!.name !== 'notfound'
                    && this.props.currentID.croppedFace!.name !== 'notfound'
                    && this.props.processType !== ProcessType.LIVENESS) {
                    this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                } else {
                    this.loadNextID(false, true);
                }
            } else {
                this.loadNextID(false, true);
            }
        }

        const submitSegCheck = (e: any) => {
            e.preventDefault();

            let box: IDBox = {
                id: 0,
                position: {
                    x1: 0,
                    x2: 0,
                    x3: 0,
                    x4: 0,
                    y1: 0,
                    y2: 0,
                    y3: 0,
                    y4: 0
                }
            };

            // not first time (mykadback always goes here)
            if (this.props.currentID.internalIDs.length > 0) {
                // front ID
                if (this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                    this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
                    if (this.state.passesCrop !== this.props.internalID.originalID!.passesCrop) {
                        console.log('refresh front');
                        this.props.refreshIDs(false);
                        if (this.state.passesCrop) {
                            let preBox = undefined;
                            if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.originalID !== undefined
                                && this.props.currentID.givenData.originalID.segmentation !== undefined) {
                                if (this.props.currentID.givenData.originalID.segmentation.length > 0) {
                                    preBox = this.props.currentID.givenData.originalID.segmentation[0] !== undefined ?
                                                this.props.currentID.givenData.originalID.segmentation[0]!.IDBox : undefined;
                                } else if (this.props.currentID.givenData.originalID.imageProps !== undefined) {
                                    let imgProps = this.props.currentID.givenData.originalID.imageProps;
                                    if (imgProps.height >= 0 && imgProps.width >= 0) {
                                        preBox = {
                                            id: 0,
                                            position: {
                                                x1: 0,
                                                x2: imgProps.width,
                                                x3: imgProps.width,
                                                x4: 0,
                                                y1: imgProps.height,
                                                y2: imgProps.height,
                                                y3: 0,
                                                y4: 0
                                            }
                                        }
                                    }
                                }
                            }
                            this.props.createNewID(preBox !== undefined ? preBox : box, true);
                            this.props.saveDocumentType(0, this.state.singleDocumentType);
                        } else {
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
                        }
                        return;
                    } else {
                        if (this.state.passesCrop) {
                            if (this.props.internalID.documentType !== this.state.singleDocumentType) {
                                this.props.saveDocumentType(0, this.state.singleDocumentType);
                            }
                            this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                            this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        } else {
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
                        }
                    }
                } else {
                // back ID - always here for mykadback
                    this.props.updateBackIDFlags(this.state.selectedBackIDFlags);
                    if (this.state.passesCrop !== this.props.internalID.backID!.passesCrop) {
                        console.log('refresh back');
                        this.props.refreshIDs(true);
                        if (this.state.passesCrop) {
                            let preBox = undefined;
                            if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.backID !== undefined
                                    && this.props.currentID.givenData.backID.segmentation !== undefined) {
                                if (this.props.currentID.givenData.backID.segmentation.length > 0) {
                                    preBox = this.props.currentID.givenData.backID.segmentation[0] !== undefined ?
                                                this.props.currentID.givenData.backID.segmentation[0]!.IDBox : undefined;
                                } else if (this.props.currentID.givenData.backID.imageProps !== undefined) {
                                    let imgProps = this.props.currentID.givenData.backID.imageProps;
                                    if (imgProps.height >= 0 && imgProps.width >= 0) {
                                        preBox = {
                                            id: 0,
                                            position: {
                                                x1: 0,
                                                x2: imgProps.width,
                                                x3: imgProps.width,
                                                x4: 0,
                                                y1: imgProps.height,
                                                y2: imgProps.height,
                                                y3: 0,
                                                y4: 0
                                            }
                                        }
                                    }
                                }
                            }
                            this.props.setIDBox(preBox !== undefined ? preBox : box, this.props.currentID.backID!.croppedImage!);
                            this.props.loadImageState(this.props.internalID.backID!, this.state.passesCrop);
                            if (this.props.processType === ProcessType.SEGMENTATION) {
                                let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
                                this.props.saveToInternalID(internalID.backID!, true);
                            } else {
                                this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                            }
                        } else {
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
                        }
                        return;
                    } else {
                        if (this.state.passesCrop) {
                            this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        } else {
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
                        }
                    }
                }
            }

            // first time (will never be myKadBack)
            if (this.state.passesCrop) {
                // if (this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                //     this.props.setIDBox(box, this.props.currentID.backID!.croppedImage!);
                //     this.props.loadImageState(this.props.internalID.backID!, this.state.passesCrop);
                //     this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                // } 
                this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
                if (this.props.internalID === undefined) {
                    let preBox = undefined;
                    if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.originalID !== undefined
                        && this.props.currentID.givenData.originalID.segmentation !== undefined) {
                        if (this.props.currentID.givenData.originalID.segmentation.length > 0) {
                            preBox = this.props.currentID.givenData.originalID.segmentation[0] !== undefined ?
                                        this.props.currentID.givenData.originalID.segmentation[0]!.IDBox : undefined;
                        } else if (this.props.currentID.givenData.originalID.imageProps !== undefined) {
                            let imgProps = this.props.currentID.givenData.originalID.imageProps;
                            if (imgProps.height >= 0 && imgProps.width >= 0) {
                                preBox = {
                                    id: 0,
                                    position: {
                                        x1: 0,
                                        x2: imgProps.width,
                                        x3: imgProps.width,
                                        x4: 0,
                                        y1: imgProps.height,
                                        y2: imgProps.height,
                                        y3: 0,
                                        y4: 0
                                    }
                                }
                            }
                        }
                    }
                    this.props.createNewID(preBox !== undefined ? preBox : box, true);
                    this.props.saveDocumentType(0, this.state.singleDocumentType);

                    if (this.props.processType === ProcessType.SEGMENTATION) {
                        let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
                        if (internalID !== undefined && internalID.processStage === IDProcess.MYKAD_FRONT) {
                            this.props.saveToInternalID(this.props.currentImage, false);
                            this.props.loadImageState(internalID.backID!);
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                        } else {
                            this.props.saveToInternalID(this.props.currentImage, true);
                            this.loadNextID(false);
                        }
                    }
                } else if (this.props.internalID !== undefined && this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                    this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                }
            } else {
                this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
                this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
            }
        }

        return (
            <Form onSubmit={submitSegCheck}>
                {
                    this.props.currentID.originalIDProcessed ? <div /> :
                    <Form.Group controlId="docType">
                        <Form.Label>Document Type</Form.Label>
                        <Form.Control as="select" value={this.state.singleDocumentType} onChange={(e: any) => setSingleDocType(e)}>
                            {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
                        </Form.Control>
                    </Form.Group>
                }

                <Form.Group controlId="passesCrop">
                    <Form.Label>Cropping</Form.Label>
                    <ToggleButtonGroup type="radio" name="passesCropButtons" style={{display: "block", width: "100%"}}
                        value={this.state.passesCrop} onChange={(val) => this.setState({passesCrop: val})}>
                        <ToggleButton variant="light" id="segcheck-fail-btn" className="common-button" value={false}>Fail</ToggleButton>
                        <ToggleButton variant="light" id="segcheck-pass-btn" className="common-button" value={true}>Pass</ToggleButton>
                    </ToggleButtonGroup>
                </Form.Group>

                { this.state.overallFlags.length > 0 ?
                    <Card className="individual-card">
                        <Card.Title>Flags</Card.Title>
                        <Card.Body>
                            {
                                this.state.overallFlags.map((each, idx) => {
                                    return (
                                        <div key={idx}>
                                            <p>{DatabaseUtil.beautifyWord(each.category)}</p>
                                            {getCategoryFlags(each.flags)}
                                        </div>
                                    );
                                })
                            }
                        </Card.Body>
                    </Card>
                : <div />}
                {
                    (!this.props.currentID.originalIDProcessed && this.state.selectedFrontIDFlags.length > 0) || 
                    (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined &&
                        ((this.props.internalID.processStage === IDProcess.MYKAD_BACK && this.state.selectedBackIDFlags.length > 0) ||
                        (this.props.internalID.processStage !==IDProcess.MYKAD_BACK && this.state.selectedFrontIDFlags.length > 0)))
                    ?
                    (<Button variant="primary" className="block-button" id="segcheck-skip-btn"
                        onClick={skipSegCheck}>
                        Skip
                    </Button>)
                    : <div />
                }

                <Button type="submit" className="block-button" id="segcheck-submit-btn" disabled={this.state.passesCrop === undefined}>
                    Next
                </Button>
            </Form>
        )
    }

    createFormData = (image: File, points: any) => {
        const data = new FormData();
        data.append("image", image);
        data.append("x1", points.x1.toString());
        data.append("x2", points.x2.toString());
        data.append("x3", points.x3.toString());
        data.append("x4", points.x4.toString());
        data.append("y1", points.y1.toString());
        data.append("y2", points.y2.toString());
        data.append("y3", points.y3.toString());
        data.append("y4", points.y4.toString());
        return data;
    }

    segEdit = () => {
        const setDocType = (e: any, id: number) => {
            let docs = this.state.selectedDocumentTypes;
            let index = docs.findIndex((each) => each.id === id);
            let doc = docs[index];
            doc.value = e.target.value;
            docs.splice(index, 1, doc);
            this.setState({selectedDocumentTypes: docs});
        }

        const getValue = (id: number) => {
            let doc = this.state.selectedDocumentTypes.find((each) => each.id === id);
            if (doc !== undefined) {
                return doc.value;
            } else {
                return undefined;
            }
        }

        const backStage = () => {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }

        const submitDocTypes = () => {
            this.state.selectedDocumentTypes.forEach((each) => {
                this.props.saveDocumentType(each.id, each.value);
            });
            this.setState({selectedDocumentTypes: []});
        }

        const undoBox = () => {
            this.props.deleteIDBox(-1);
            this.setState({selectedDocumentTypes: this.state.selectedDocumentTypes.slice(0, this.state.selectedDocumentTypes.length - 1)});
        }

        const loadImageAndProgress = () => {
            if (!this.props.currentID.originalIDProcessed) {
                submitDocTypes();
            }

            const header = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };
            let cropsDone = 0;

            if (this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                for (let i = 0; i < this.props.currentID.internalIDs.length; i++) {
                    let each = this.props.currentID.internalIDs[i];
                    let points = each.originalID!.IDBox!.position;
                    axios.post(
                        HOST + ":" + PORT + TRANSFORM,
                        this.createFormData(each.originalID!.image, points),
                        header
                    ).catch((err: any) => {
                        console.error(err);
                    }).then((res: any) => {
                        if (res.status === 200) {
                            let image: File = DatabaseUtil.dataURLtoFile('data:image/jpg;base64,' + res.data.encoded_img, res.data.filename + "_cropped");
                            this.props.saveCroppedImage(image, i);

                            cropsDone++;
                            if (cropsDone === this.props.currentID.internalIDs.length) {
                                this.setState({isCropping: false});
                                if (this.props.processType === ProcessType.SEGMENTATION) {
                                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                                } else {
                                    this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                                    this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                                }
                            }
                        }                
                    });
                }
            } else {
                axios.post(
                    HOST + ":" + PORT + TRANSFORM,
                    this.createFormData(this.props.internalID.backID!.image, this.props.internalID.backID!.IDBox!.position),
                    header
                ).catch((err: any) => {
                    console.error(err);
                }).then((res: any) => {
                    if (res.status === 200) {
                        let image: File = DatabaseUtil.dataURLtoFile('data:image/jpg;base64,' + res.data.encoded_img, res.data.filename);
                        this.props.saveCroppedImage(image);
                        this.setState({isCropping: false});
                        if (this.props.processType === ProcessType.SEGMENTATION) {
                            this.props.progressNextStage(CurrentStage.INTER_STAGE);
                        } else {
                            this.props.loadImageState(this.props.internalID.backID!, this.state.passesCrop);
                            this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        }
                    }                
                });
            }
        }

        return (
            <div>
                {   
                    this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.MYKAD_BACK
                    ? <h5>Please draw the corresponding bounds for the current ID</h5>
                    : <h5>Please draw bounding boxes around any number of IDs in the image.</h5>
                }
                <h6>Boxes Drawn</h6>
                    <Accordion>
                        {
                            this.props.currentID.internalIDs.map((id, idx) => {
                                let box = this.props.currentID.originalIDProcessed ? id.backID!.IDBox : id.originalID!.IDBox;
                                if (box === undefined) return <div/>;
                                return (
                                    <Card key={idx}>
                                        <Accordion.Toggle
                                            as={Card.Header}
                                            eventKey={idx.toString()}>
                                                Box {(box.id + 1).toString()}
                                        </Accordion.Toggle>
                                        <Accordion.Collapse eventKey={idx.toString()}>
                                            { this.props.currentID.originalIDProcessed ? <div /> :
                                                <Card.Body>
                                                    <Form.Group controlId="docType">
                                                        <Form.Label>Document Type</Form.Label>
                                                        {/* <Button onClick={() => {this.setState({showAddDocTypeModal: true})}} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button> */}
                                                        <Form.Control as="select" value={getValue(idx)} onChange={(e: any) => setDocType(e, idx)}>
                                                            {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
                                                        </Form.Control>
                                                    </Form.Group>
                                                </Card.Body>
                                            }
                                        </Accordion.Collapse>
                                    </Card>
                                );
                            })
                        }
                    </Accordion>
                <Button variant="secondary" style={{width: '100%'}} onClick={undoBox}>Undo Box</Button>
                <Button variant="secondary" className="common-button" onClick={backStage}>Back</Button>
                {/* SKIP_VALIDATION: comment out disabled attribute */}
                <Button disabled={this.props.currentID.internalIDs.length === 0 || this.state.isCropping 
                || this.props.currentID.originalIDProcessed && this.props.internalID.backID!.IDBox === undefined} 
                    className="common-button" onClick={() => this.setState({isCropping: true}, loadImageAndProgress)}>
                    { this.state.isCropping
                        ? <Spinner animation="border" role="status" size="sm">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                        : "Next"}
                </Button>
            </div>
        );
    }

    landmarkEdit = () => {
        const setLandmark = (item: string) => {
            this.setState({selectedLandmark: item}, () => this.props.setCurrentSymbol(item));
        }

        const backStage = () => {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }

        const getLandmarkFlags = () => {
            const setFlag = (selected: string[]) => {
                for (var i = 0; i < this.state.currentLandmarks.length; i++) {
                    if (this.state.currentLandmarks[i].codeName === this.state.selectedLandmark) {
                        let landmarks = this.state.currentLandmarks;
                        let landmark = landmarks[i];
                        landmark.flags = selected;
                        landmarks[i] = landmark;
                        this.setState({currentLandmarks: landmarks});
                        break;
                    }
                }
            }

            let selectedFlags: string[] = [];
            for (var i = 0; i < this.state.currentLandmarks.length; i++) {
                if (this.state.currentLandmarks[i].codeName === this.state.selectedLandmark) {
                    selectedFlags = this.state.currentLandmarks[i].flags;
                    break;
                }
            }

            return (
                <div>
                    {
                        this.state.landmarkFlags.map((each, idx) => {
                            return (
                                    <div key={idx}>
                                        <p>{DatabaseUtil.beautifyWord(each.category)}</p>
                                        <ToggleButtonGroup type="checkbox" onChange={(val) => setFlag(val)} value={selectedFlags}>
                                            {each.flags.map((flag, idx) => {
                                                return (
                                                    <ToggleButton
                                                        className="labelling-flags"
                                                        key={idx}
                                                        value={flag}
                                                        variant="light"
                                                        >
                                                        {DatabaseUtil.beautifyWord(flag)}
                                                    </ToggleButton>
                                                );
                                            })}
                                        </ToggleButtonGroup>
                                    </div>
                            );
                        })
                    }
                </div>
            );            
        }

        const submitLandmark = (e: any) => {
            e.preventDefault();
            this.state.currentLandmarks.forEach((each) => {
                this.props.updateLandmarkFlags(each.codeName, each.flags);
            });
            if (this.props.processType === ProcessType.LANDMARK) {
                if (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                } else {
                    this.props.saveToInternalID(this.props.currentImage, true);
                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                }
            } else {
                this.props.progressNextStage(CurrentStage.OCR_DETAILS);
            }

            
        }

        const getClassName = (each: any) => {
            let name = "landmark-tab ";
            let landmark = this.props.currentImage.landmark.find((item) => item.codeName === each.codeName && item.position !== undefined);
            if (landmark !== undefined) {
                name += "labelled-landmark ";
            }
            if (this.props.currentImage.currentSymbol === each.codeName) {
                name += "selected-landmark";
            }
            return name;
        }

        return (
                <div>
                    <Accordion>
                        {
                            this.state.currentLandmarks.map((each, idx) => {
                                return (
                                    <Card key={idx}>
                                        <Accordion.Toggle
                                            as={Card.Header}
                                            eventKey={idx.toString()}
                                            className={getClassName(each)}
                                            key={idx}
                                            onClick={() => setLandmark(each.codeName)}>
                                                {DatabaseUtil.beautifyWord(each.name)}
                                        </Accordion.Toggle>
                                        <Accordion.Collapse eventKey={idx.toString()}>
                                        <Card.Body>
                                            {getLandmarkFlags()}
                                        </Card.Body>
                                        </Accordion.Collapse>
                                    </Card>
                                );
                            })
                        }
                </Accordion>
                <Button variant="secondary" className="common-button" onClick={backStage}>Back</Button>
                {/* SKIP_VALIDATION: comment out disabled attribute */}
                <Button className="common-button"
                    disabled={this.props.currentImage.landmark.filter((each) => each.codeName !== 'religion' && each.position === undefined).length > 0}
                    onClick={submitLandmark}>Done</Button>
            </div>
        );
    }

    ocrDetails = () => {
        let refs: {name: string, codeName: string, mapToLandmark: string, ref: any}[] = [];

        const handleSubmit = (e: any) => {
            e.preventDefault();

            let currentOCR = this.state.currentOCR;
            refs.forEach((each, idx) => {
                let ocr: OCRData = {
                    id: idx,
                    type: 'OCR',
                    name: each.name,
                    codeName: each.codeName,
                    mapToLandmark: each.mapToLandmark,
                    labels: each.ref.value.split(' ').map((each: string, idx: number) => {
                        return {id: idx, value: each};
                    }),
                    count: each.ref.value.split(' ').length
                };
                
                if (currentOCR.find((ocr) => ocr.codeName === each.codeName)!.value !== each.ref.value) {
                    for (var i = 0; i < currentOCR.length; i++) {
                        if (currentOCR[i].codeName === each.codeName) {
                            let curr = currentOCR[i];
                            curr.value = each.ref.value;
                            currentOCR.splice(i, 1);
                            currentOCR.push(curr);
                            break;
                        }
                    }
                    this.setState({ currentOCR: currentOCR });
                }
                this.props.addOCRData(ocr);
            }, this.props.progressNextStage(CurrentStage.OCR_EDIT));
        }

        // load pre entered data
        return (
            <Form onSubmit={handleSubmit}>
                {
                    this.state.currentOCR.map((each, idx) => {
                        return (
                            <Form.Group key={each.codeName + "OCR"}>
                                <Form.Label>{DatabaseUtil.beautifyWord(each.name)}</Form.Label>
                                {/* SKIP_VALIDATION: Remove required */}
                                <Form.Control required type="text" defaultValue={each.value}
                                ref={(ref: any) => {refs.push({name: each.name, codeName: each.codeName, mapToLandmark: each.mapToLandmark,ref})}} />
                            </Form.Group>
                        );
                    })
                }
                <Button variant="secondary" className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.LANDMARK_EDIT)}>
                    Back
                </Button>
                <Button variant="primary" className="common-button" type="submit">
                    Done
                </Button>
            </Form>
        )
    }

    ocrEdit = () => {
        let ocrs = this.props.currentImage.ocr;
        let ocrLabelIncomplete = false;

        const getClassNameLandmark = (each: any) => {
            let name = "landmark-tab ";
            let ocrFilled = false;
            let ocrsLabelled = this.props.currentImage.ocr.find((ocr) => ocr.mapToLandmark === each.mapToLandmark && ocr.codeName === each.codeName);
            if (ocrsLabelled !== undefined) {
                ocrFilled = ocrsLabelled.labels.filter((label) => label.position === undefined).length === 0;
            }
            if (ocrFilled) {
                name += "labelled-landmark ";
            }
            if (this.props.currentImage.currentSymbol === each.codeName) {
                name += "selected-landmark";
            }
            return name;
        }

        const getClassNameOcr = (each: any, label: any) => {
            let name = "ocr-tab ";
            if (label.position !== undefined) {
                name += "ocr-details ";
            }
            if (this.props.currentImage.currentWord !== undefined && this.props.currentImage.currentWord!.id === label.id) {
                name += "selected-ocr";
            }
            return name;
        }

        const getActiveKey = () => {
            if (this.props.currentImage.currentSymbol !== undefined && this.props.currentImage.ocrToLandmark !== undefined) {
                return this.props.currentImage.currentSymbol + " " + this.props.currentImage.ocrToLandmark;
            } else {
                return '';
            }
        }

        const validate = () => {
            let ocrsToLabel = this.props.currentImage.ocr.filter((each) => each.count > 1);
            if (ocrsToLabel.length > 0) {
                let unlabeled = ocrsToLabel.filter((each) => each.labels.filter((label) => label.position === undefined).length > 0);
                ocrLabelIncomplete = unlabeled.length > 0;
            }
        }

        const submitOcrBoxes = () => {
            if (this.props.processType === ProcessType.OCR) {
                if (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                } else {
                    this.props.saveToInternalID(this.props.currentImage, true);
                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                }
            } else {
                if (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.loadBackId();
                } else if (this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.props.progressNextStage(CurrentStage.END_STAGE);
                } else {
                    this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                }
            }
        }
        
        // SKIP_VALIDATION: comment out validate()
        validate();

        return (
            <div>
                <Accordion activeKey={getActiveKey()}>
                    {
                        ocrs.map((each, index) => {
                            if (each.count <= 1) return <div key={index} />;
                            return (
                                <Card key={index}>
                                    <Accordion.Toggle
                                        as={Card.Header}
                                        eventKey={each.name + " " + each.mapToLandmark}
                                        key={index}
                                        className={getClassNameLandmark(each)}
                                        onClick={() => {
                                            this.props.setCurrentSymbol(each.codeName, each.mapToLandmark);
                                            this.props.setCurrentWord(each.labels[0]);}}>
                                        {DatabaseUtil.beautifyWord(each.name)}
                                    </Accordion.Toggle>
                                    <Accordion.Collapse eventKey={each.name + " " + each.mapToLandmark}>
                                    <Card.Body>
                                    <ButtonGroup vertical>
                                        {
                                            each.labels.map((label, idx) => {
                                                return (
                                                    <Button 
                                                        className={getClassNameOcr(each, label)}
                                                        variant="light"
                                                        key={idx}
                                                        value={label.value}
                                                        onClick={() => {
                                                            this.props.setCurrentSymbol(each.codeName, each.mapToLandmark);
                                                            this.props.setCurrentWord(label)}}
                                                        >{label.id}: {label.value}</Button>
                                                );
                                            })
                                        }
                                    </ButtonGroup>
                                    </Card.Body>
                                    </Accordion.Collapse>
                                </Card>
                            );
                        })
                    }
                </Accordion>
            <Button variant="secondary" className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.OCR_DETAILS)}>Back</Button>
            <Button className="common-button" disabled={ocrLabelIncomplete} onClick={submitOcrBoxes}>Done</Button>
        </div>);
    }

    frLivenessCheck = () => {
        const setFlag = (flags: string[], possibleFlags: string[]) => {
            this.setState({selectedVideoFlags: flags}, validate);
        }
    
        const validate = () => {
            let val = false;
            if (this.state.passesLiveness !== undefined) {
                if (this.state.passesLiveness) {
                    val = true;
                } else {
                    let spoofFlags = this.state.videoFlags.find((each) => each.category === 'spoof');
                    if (spoofFlags !== undefined) {
                        if (spoofFlags.flags.length === 0) {
                            val = true;
                        } else {
                            for (let i = 0; i < spoofFlags.flags.length; i++) {
                                if (this.state.selectedVideoFlags.includes(spoofFlags.flags[i])) {
                                    val = true;
                                    break;
                                }
                            }
                        }
                    } else {
                        val = true;
                    }
                }
            }

            if (this.state.livenessValidation !== val) {
                this.setState({livenessValidation: val});
            }            
        }

        const backStage = () => {
            if (this.props.currentID.internalIDs.length === 0) {
                this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
            } else if (this.props.internalID.documentType === 'MyKad') {
                this.props.loadImageState(this.props.internalID.backID!);
                this.props.progressNextStage(CurrentStage.OCR_EDIT);
            } else {
                this.props.progressNextStage(CurrentStage.OCR_EDIT);
            }
        }

        const submitLiveness = () => {
            this.props.updateVideoData(this.state.passesLiveness!, this.state.selectedVideoFlags);
        }

        return (
            <div>
                <Card className="individual-card">
                    <Card.Title>Liveness</Card.Title>
                    <Card.Body>
                        <ToggleButtonGroup type="radio" name="passesLivenessButtons" style={{display: "block", width: "100%"}}
                            value={this.state.passesLiveness} onChange={(val) => this.setState({passesLiveness: val}, validate)}>
                            <ToggleButton variant="light" className="common-button" value={false}>Spoof</ToggleButton>
                            <ToggleButton variant="light" className="common-button"  value={true}>Live</ToggleButton>
                        </ToggleButtonGroup>
                    </Card.Body>
                </Card>

                <Card className="individual-card">
                    <Card.Title>Flags</Card.Title>
                    <Card.Body>
                        {
                            this.state.videoFlags.map((each, idx) => {
                                return (
                                    <div key={idx}>
                                        <p>{DatabaseUtil.beautifyWord(each.category)}</p>
                                        <ToggleButtonGroup type="checkbox" onChange={(val) => setFlag(val, each.flags)} value={this.state.selectedVideoFlags}>
                                        {
                                            each.flags.map((flag, i) => {
                                                return (
                                                    <ToggleButton
                                                        className="video-flags"
                                                        key={i}
                                                        value={flag}
                                                        variant="light"
                                                        // checked={this.state.selectedVideoFlags.includes(flag)}
                                                        // onChange={() => setFlag(flag)}
                                                        >
                                                        {DatabaseUtil.beautifyWord(flag)}
                                                    </ToggleButton>
                                                );
                                            })
                                        }
                                        </ToggleButtonGroup>
                                    </div>
                                );
                            })
                        }
                    </Card.Body>
                </Card>
                <Button variant="secondary" className="common-button" onClick={backStage}>
                    Back
                </Button>
                <Button className="common-button" onClick={submitLiveness} 
                disabled={!this.state.livenessValidation}>
                    Done
                </Button>
            </div>
        )
    }

    frCompareCheck = () => {
        const submitFaceCompareResults = () => {
            this.props.saveToInternalID(this.props.currentImage, true);
            this.resetState();
            this.props.progressNextStage(CurrentStage.END_STAGE);
        }

        return (
            <div>
                <Card className="individual-card">
                    <Card.Title>Match</Card.Title>
                    <Card.Body>
                        <ToggleButtonGroup type="radio" name="passessFRMatchButtons" style={{display: "block", width: "100%"}}
                            value={this.props.currentImage.faceCompareMatch} onChange={(val) => this.props.setFaceCompareMatch(val)}>
                            <ToggleButton variant="light" className="common-button" value={false}>No Match</ToggleButton>
                            <ToggleButton variant="light" className="common-button" value={true}>Match</ToggleButton>
                        </ToggleButtonGroup>
                    </Card.Body>
                </Card>
                <Button variant="secondary" className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK)}>
                    Back
                </Button>
                <Button className="common-button" onClick={submitFaceCompareResults} disabled={this.props.currentImage.faceCompareMatch === undefined}>
                    Done
                </Button>
            </div>
        );
    }

    loadBackId = () => {
        this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        this.setState({passesCrop: undefined, loadedSegCheckImage: true}, () => this.props.loadImageState(this.props.internalID.backID!));
    }

    loadNextInternalId = () => {
        this.props.loadImageState(this.props.internalID.originalID!);
        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
    }

    loadNextID = (prev: boolean, beforeSegCheckDone?: boolean) => {
        this.resetState();
        if (beforeSegCheckDone) {
            let id = this.props.currentID;
            id.frontIDFlags = this.state.selectedFrontIDFlags;
            id.backIDFlags = this.state.selectedBackIDFlags;
            this.props.saveToLibrary(id);
        } else {
            this.props.saveToLibrary(this.props.currentID);
        }
        this.props.restoreID();
        this.props.restoreImage();
        if (prev) {
            this.props.getPreviousID();
        } else {
            this.props.getNextID();
        }
        this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
    }

    resetState = () => {
        this.setState({
            loadedSegCheckImage: false,
            showAddDocTypeModal: false,
            documentTypes: [],
            singleDocumentType: '',
            selectedDocumentTypes: [],
            passesCrop: undefined,
            isCropping: false,
            overallFlags: [],
            selectedFrontIDFlags: [],
            selectedBackIDFlags: [],

            showAddLandmarkModal: false,
            landmarksLoaded: false,
            landmarks: [],
            currentLandmarks: [],
            landmarkFlags: [],
            selectedLandmark: '',

            showAddOCRModal: false,
            OCRLoaded: false,
            OCR: [],
            currentOCR: [],

            videoFlagsLoaded: false,
            videoFlags: [],
            selectedVideoFlags: [],
            passesLiveness: undefined,
            livenessValidation: false,

            faceCompareMatch: undefined
        });
    }

    render() {

        const controlFunctions = () => {
            switch (this.props.currentStage) {
                case (CurrentStage.SEGMENTATION_CHECK): {
                    return this.segCheck();
                }
                case (CurrentStage.SEGMENTATION_EDIT): {
                    return this.segEdit();
                }
                case (CurrentStage.LANDMARK_EDIT): {
                    return this.landmarkEdit();
                }
                case (CurrentStage.OCR_DETAILS): {
                    return this.ocrDetails();
                }
                case (CurrentStage.OCR_EDIT): {
                    return this.ocrEdit();
                }
                case (CurrentStage.FR_LIVENESS_CHECK): {
                    return this.frLivenessCheck();
                }
                case (CurrentStage.FR_COMPARE_CHECK): {
                    return this.frCompareCheck();
                }
                default: {
                    return <div />;
                }
            }
        }

        const showIndex = () => {
            switch (this.props.currentStage) {
                case (CurrentStage.LANDMARK_EDIT):
                case (CurrentStage.OCR_DETAILS):
                case (CurrentStage.OCR_EDIT):
                case (CurrentStage.FR_COMPARE_CHECK): {
                    return (
                        <div className="internalIDIndex">
                            <p>Internal ID {(this.props.currentID.internalIndex + 1).toString() + " of " + this.props.currentID.internalIDs.length.toString()}</p>
                        </div>
                    );
                }
                case (CurrentStage.SEGMENTATION_CHECK):
                case (CurrentStage.SEGMENTATION_EDIT): {
                    if (this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                        return (
                            <div className="internalIDIndex">
                                <p>Internal ID {(this.props.currentID.internalIndex + 1).toString() + " of " + this.props.currentID.internalIDs.length.toString()}</p>
                                <p>MyKad Back</p>
                            </div>
                        ); 
                    }
                }
            }
        }

        const navigateIDs = () => {
            // const handleClick = (prev: boolean) => {
                // switch (this.props.currentStage) {
                //     case (CurrentStage.LANDMARK_EDIT): {
                //         this.state.currentLandmarks.forEach((each) => {
                //             this.props.updateLandmarkFlags(each.name, each.flags);
                //         });
                //         this.props.saveToInternalID(this.props.currentImage, this.props.internalID.processStage !== IDProcess.MYKAD_FRONT);
                //         break;
                //     }
                //     case (CurrentStage.OCR_DETAILS): {

                //     }
                // }
                // need to save state first?
                // this.loadNextID(prev);
            // }

            const saveAndQuit = () => {
                let id = this.props.currentID;
                id.frontIDFlags = this.state.selectedFrontIDFlags;
                id.backIDFlags = this.state.selectedBackIDFlags;
                this.props.saveToLibrary(id);
                this.setState({showSaveAndQuitModal: false}, () => this.props.progressNextStage(CurrentStage.OUTPUT));
            }

            return (
                <div id="folder-number">
                    <Button variant="light" 
                        onClick={() => this.loadNextID(true)}
                        disabled={this.props.currentIndex === 0} 
                        className="nav-button"><GrFormPrevious /></Button>
                    <p>Session:   {this.props.currentIndex + 1}/{this.props.totalIDs}</p>
                    <Button variant="light" 
                        onClick={() => this.loadNextID(false)}
                        disabled={this.props.currentIndex + 1 === this.props.totalIDs}
                        className="nav-button"><GrFormNext /></Button>
                    <Button variant="secondary" id="quit-button" onClick={() => this.setState({showSaveAndQuitModal: true})}>Quit</Button>
                    <Modal show={this.state.showSaveAndQuitModal} onHide={() => this.setState({showSaveAndQuitModal: false})}>
                        <Modal.Header closeButton>
                        <Modal.Title>Save And Quit</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>Are you sure you would like to proceed?</Modal.Body>
                        <Modal.Footer>
                        <Button variant="secondary" onClick={() => this.setState({showSaveAndQuitModal: false})}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={saveAndQuit}>
                            Confirm
                        </Button>
                        </Modal.Footer>
                    </Modal>
                </div>
            );
        }

        return (
            <div style={{height: "100%"}}>
                {navigateIDs()}
                <div id="controlPanel">
                    {showIndex()}
                    {controlFunctions()}
                </div>
            </div>
        );
    }
}

const mapDispatchToProps = {
    progressNextStage,
    getPreviousID,
    getNextID,
    loadNextID,
    createNewID,
    setIDBox,
    deleteIDBox,
    saveCroppedImage,
    refreshIDs,
    saveDocumentType,
    saveSegCheck,
    clearInternalIDs,
    loadImageState,
    setCurrentSymbol,
    setCurrentWord,
    addLandmarkData,
    updateLandmarkFlags,
    addOCRData,
    updateVideoData,
    setFaceCompareMatch,
    saveToInternalID,
    updateFrontIDFlags,
    updateBackIDFlags,
    saveToLibrary,
    restoreID,
    restoreImage,
};

const mapStateToProps = (state: AppState) => {
    return {
        currentIndex: state.general.currentIndex,
        totalIDs: state.general.IDLibrary.length,
        database: state.general.setupOptions.database,
        processType: state.general.setupOptions.processType,
        currentStage: state.general.currentStage,
        indexedID: state.general.IDLibrary[state.general.currentIndex],
        currentID: state.id,
        internalID: state.id.internalIDs[state.id.internalIndex],
        currentImage: state.image
    }
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ControlPanel);