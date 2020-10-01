import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess, ProcessType, AnnotationStatus } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion, Spinner } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState, InternalIDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox, OCRData, OCRWord, LandmarkData } from '../../../store/image/types';
import { progressNextStage, getPreviousID, getNextID, getSelectedID, saveToLibrary } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, setIDBox, deleteIDBox, saveCroppedImage, refreshIDs, saveDocumentType, updateVideoData, setFaceCompareMatch, backToOriginal, saveToInternalID, updateFrontIDFlags, updateBackIDFlags, restoreID, clearInternalIDs } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, setCurrentSymbol, setCurrentWord, addLandmarkData, updateLandmarkFlags, addOCRData, restoreImage } from '../../../store/image/actionCreators';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { HOST, PORT, TRANSFORM, LANDMARK } from '../../../config';
import { GeneralUtil } from '../../../utils/GeneralUtil';
import { CgCheckO } from 'react-icons/cg';
import SessionDropdown from '../SessionDropdown/SessionDropdown';
const axios = require('axios');

interface IProps {
    database: string;
    library: IDState[];
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
    getPreviousID: (res?: any) => GeneralActionTypes;
    getNextID: (res?: any) => GeneralActionTypes;
    getSelectedID: (index: number, res?: any) => GeneralActionTypes;
    loadImageState: (currentImage: ImageState, passesCrop?: boolean) => ImageActionTypes;

    // Seg Check
    loadNextID: (ID: IDState) => IDActionTypes;
    createNewID: (IDBox: IDBox, passesCrop?: boolean, documentType?: string) => IDActionTypes;
    setIDBox: (IDBox: IDBox, croppedImage?: File) => IDActionTypes;
    deleteIDBox: (index: number) => IDActionTypes;
    saveCroppedImage: (croppedImage: File, index?: number, landmarks?: LandmarkData[]) => IDActionTypes;
    refreshIDs: (originalProcessed: boolean) => IDActionTypes;
    saveDocumentType: (internalIndex: number, documentType: string) => IDActionTypes;
    updateFrontIDFlags: (flags: string[]) => IDActionTypes;
    updateBackIDFlags: (flags: string[]) => IDActionTypes;
    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;
    clearInternalIDs: () => IDActionTypes;
    backToOriginal: () => IDActionTypes;

    // Landmark
    setCurrentSymbol: (symbol?: string, landmark?: string) => ImageActionTypes;
    addLandmarkData: (landmark: LandmarkData) => ImageActionTypes;
    updateLandmarkFlags: (codeName: string, flags: string[]) => ImageActionTypes;

    // OCR
    setCurrentWord: (word: OCRWord) => ImageActionTypes;
    addOCRData: (ocr: OCRData) => ImageActionTypes;

    // Video Liveness & Match
    updateVideoData: (liveness: boolean, flags: string[]) => IDActionTypes;
    setFaceCompareMatch: (match: boolean) => IDActionTypes;

    // Saving to store
    saveToInternalID: (imageState: ImageState, next: boolean) => IDActionTypes;
    saveToLibrary: (id: IDState) => GeneralActionTypes;
    restoreID: () => IDActionTypes;
    restoreImage: () => ImageActionTypes;
}

interface IState {
    sortedList: {ID: IDState, libIndex: number, status: AnnotationStatus}[];
    sortedIndex: number;
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

    constructor(props: IProps) {
        super(props);
        this.state = {
            sortedList: [],
            sortedIndex: 0,

            showSaveAndQuitModal: false,
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

                if (previousProps.indexedID.index !== this.props.indexedID.index 
                    || this.props.currentID.sessionID === '' || this.props.indexedID.index !== this.props.currentID.index) {
                    // load session data / load next ID
                    // call backend api only if ID data hasn't been loaded
                    if (!this.props.indexedID.dataLoaded && this.props.indexedID.sessionID !== '') {
                        GeneralUtil.toggleOverlay(true);
                        axios.post('/loadSessionData', {
                            database: this.props.database,
                            date: this.props.indexedID.dateCreated,
                            sessionID:  this.props.indexedID.sessionID
                        }).then((res: any) => {
                            if (res.status === 200) {
                                DatabaseUtil.loadSessionData(res.data, this.props.indexedID).then((completeID) => {
                                    this.props.loadNextID(completeID);
                                    this.loadSegCheckImage(completeID);
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
                        this.loadSegCheckImage(this.props.indexedID);
                        this.initializeSegCheckData();
                        this.setState({loadedSegCheckImage: true});
                    }
                    break;
                }

                // Initialize Seg Check Data (only when required)
                if (previousProps.currentStage !== this.props.currentStage || previousProps.currentID.sessionID !== this.props.currentID.sessionID
                    || (this.props.currentID.originalIDProcessed &&
                        (previousProps.internalID === undefined && this.props.internalID !== undefined
                         && this.props.internalID.processStage === IDProcess.DOUBLE_BACK) || 
                         (previousProps.internalID !== undefined && this.props.internalID !== undefined
                            && this.props.internalID.processStage !== previousProps.internalID.processStage))) {
                    this.initializeSegCheckData();
                }

                // Initial load of doctypes and overall flags from config json, initial load of seg check images
                if (this.state.documentTypes.length === 0) this.loadSegCheckData();
                if (!this.state.loadedSegCheckImage) {
                    this.loadSegCheckImage(this.props.currentID);
                    this.initializeSegCheckData();
                    this.setState({loadedSegCheckImage: true});
                    break;
                }

                // This section handles user submission of Seg Check. Creates internal ID accordingly, saves doctype and passesCrop,
                // and routes to the correct subsequent stage.
                if (this.props.processType !== ProcessType.SEGMENTATION) {
                    if (this.props.internalID === undefined) return;
                    // first time
                    if (previousProps.currentID.index === this.props.currentID.index && 
                        previousProps.internalID === undefined && this.props.internalID !== undefined) {
                        if (this.props.internalID.processStage !== IDProcess.DOUBLE_BACK) {
                            this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                        }
                        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        break;
                    }
                    // repeated
                    if (previousProps.internalID !== undefined && this.props.internalID !== undefined
                        && previousProps.internalID.originalID!.croppedImage!.lastModified !== this.props.internalID.originalID!.croppedImage!.lastModified) {
                        if (this.props.internalID.processStage !== IDProcess.DOUBLE_BACK) {
                            this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                        }
                        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        break;
                    }
                } else {
                    // get back ID of next internal id OR skip over
                    if (previousProps.currentID.internalIndex < this.props.currentID.internalIndex) {
                        if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
                            if (this.props.internalID === undefined) return;
                            if (this.props.internalID.processStage === IDProcess.SINGLE) {
                                this.props.saveToInternalID(this.props.internalID.originalID!, true);
                            } else {
                                this.props.saveToInternalID(this.props.internalID.originalID!, !this.props.currentID.phasesChecked.back);
                                if (this.props.currentID.phasesChecked.back) {
                                    this.loadBackId();
                                }
                            }
                        }

                        if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length
                            || this.props.currentID.backIDsProcessed === this.props.currentID.internalIDs.length) {
                            // next ID
                            this.loadNextID(false);
                        }
                    } 
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
                if (previousProps.currentStage !== this.props.currentStage) {
                    if (this.props.currentID.sessionID !== '') {
                        this.initializeSegEditData();
                    }
                }     
                break;
            }
            case (CurrentStage.LANDMARK_EDIT): {
                if (this.props.internalID === undefined) return;
                if (!this.state.landmarksLoaded) {
                    // Initial load of required and appropriate landmark set from options.json
                    this.loadLandmarkData();
                } else {
                    this.state.landmarks.forEach((each) => {
                        let internalDocType = this.props.internalID.documentType !== undefined ? this.props.internalID.documentType : '';
                        if (each.docType === internalDocType + this.props.internalID.processStage 
                                && each.landmarks !== this.state.currentLandmarks) {
                            // current set of landmarks is incorrect for the doctype
                            console.log('reload set of landmark');
                            this.initializeLandmarkData(each.landmarks);
                            this.setState({currentLandmarks: each.landmarks});
                        } else if (each.docType === internalDocType + this.props.internalID.processStage 
                            && each.landmarks === this.state.currentLandmarks && this.props.currentImage.landmark.length === 0) {
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
                    // Initial load of required and appropriate OCR set from options.json
                    this.loadOCRDetails();
                } else {
                    if (this.props.internalID === undefined) return;
                    this.state.OCR.forEach((each) => {
                        let internalDocType = this.props.internalID.documentType !== undefined ? this.props.internalID.documentType : '';
                        // check if current set of OCRs is correct for the doctype
                        if (each.docType === internalDocType + this.props.internalID.processStage) {
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
            case (CurrentStage.OCR_EDIT): {
                if (previousProps.currentStage === this.props.currentStage) break;
                // only begin routing if all ocrs have been labelled
                if (this.props.internalID !== undefined && this.props.currentImage.ocr.every((each) => each.count <= 1)) {
                    // move to next stage based on processtype and the processStage of the internal ID
                    if (this.props.processType === ProcessType.OCR) {
                        if (this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
                            this.props.saveToInternalID(this.props.currentImage, false);
                            this.props.progressNextStage(CurrentStage.INTER_STAGE);
                        } else {
                            this.props.saveToInternalID(this.props.currentImage, true);
                            this.props.progressNextStage(CurrentStage.INTER_STAGE);
                        }
                    } else {
                        if (this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
                            this.props.saveToInternalID(this.props.currentImage, false);            
                            this.loadBackId();
                        } else if (this.props.internalID.processStage === IDProcess.DOUBLE_BACK
                            && this.props.internalID.backID !== undefined && this.props.internalID.backID.IDBox !== undefined) {
                            this.props.saveToInternalID(this.props.currentImage, false);
                            this.props.progressNextStage(CurrentStage.END_STAGE);
                        } else if (this.props.internalID.processStage === IDProcess.SINGLE) {
                            if (this.props.currentID.selfieVideo!.name !== 'notfound') {
                                this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                            } else if (this.props.currentID.selfieImage!.name !== 'notfound'
                                && this.props.currentID.croppedFace!.name !== 'notfound'
                                && this.props.processType !== ProcessType.LIVENESS) {
                                this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                            } else {
                                this.props.saveToInternalID(this.props.currentImage, true);
                                this.loadNextID(false, true);
                            }
                        }
                    }
                }
                break;
            }
            case (CurrentStage.FR_LIVENESS_CHECK): {
                if (!this.state.videoFlagsLoaded) {
                    this.loadVideoFlags();
                } else if (previousProps.currentStage !== this.props.currentStage) {
                    this.initializeLiveness();
                }
                // if no liveness video available, then skip this stage
                if (this.props.processType !== ProcessType.LIVENESS && 
                    this.props.currentID.internalIDs.length > 0 && this.props.currentID.videoLiveness !== undefined
                    && previousProps.currentStage === CurrentStage.FR_LIVENESS_CHECK) {
                    this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                }
                // This section is accessed after user submits a value for video liveness. Depending on the existence of
                // a cropped face image OR video still image, moves to the next ID OR face compare stage
                if (this.props.currentID.sessionID !== '' && previousProps.currentID.videoLiveness !== this.props.currentID.videoLiveness) {
                    if (this.props.processType === ProcessType.LIVENESS || this.props.internalID === undefined || 
                        (this.props.internalID && this.props.internalID.originalID!.croppedImage!.name === 'notfound')) {
                        this.loadNextID(false);
                    } else {
                        this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                    }
                }
                break;
            }
            case (CurrentStage.FR_COMPARE_CHECK): {
                if (previousProps.currentStage !== this.props.currentStage && this.state.faceCompareMatch === undefined) {
                    this.initializeFaceCompareMatch();
                }
                break;
            }
            case (CurrentStage.END_STAGE): {
                // used as routing for OCR EDIT and Face Compare stages (to decide if:
                // - backID should be loaded
                // - move to liveness stage
                // - move to next internal ID
                // - move to next ID)
                if (previousProps.internalID) {
                    if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
                        console.log('next id');
                        this.loadNextID(false);
                    } else if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
                        if (previousProps.internalID.faceCompareMatch !== undefined && !this.props.internalID.processed) {
                            console.log('next internal id');
                            this.loadNextInternalId();
                        } else if (this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
                            console.log('liveness and match');
                            this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                            this.props.loadImageState(this.props.internalID.originalID!);
                        }
                    }
                }
                break;
            }
            case (CurrentStage.INTER_STAGE): {
                // used as routing for processTypes other than WHOLE
                if (previousProps.currentID.index !== this.props.currentID.index) return;
                if (previousProps.currentStage !== CurrentStage.INTER_STAGE
                    || previousProps.currentID.internalIndex !== this.props.currentID.internalIndex) {
                    if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
                        this.loadNextID(false);
                    } else {
                        switch (this.props.processType) {
                            case (ProcessType.SEGMENTATION): {
                                switch (this.props.internalID.processStage) {
                                    case (IDProcess.DOUBLE_FRONT): {
                                        this.props.saveToInternalID(this.props.internalID.originalID!, !this.props.currentID.phasesChecked.back);
                                        if (this.props.currentID.phasesChecked.back) {
                                            this.loadBackId();
                                        }
                                        break;
                                    }
                                    case (IDProcess.DOUBLE_BACK): {
                                        this.props.saveToInternalID(this.props.internalID.backID!, true);
                                        break;
                                    }
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
                                    case (IDProcess.DOUBLE_BACK): {
                                        if (this.props.currentID.phasesChecked.back) {
                                            this.loadBackId();
                                        } else {
                                            this.loadNextID(false);
                                        }
                                        break;
                                    }
                                    // after completing landmark/ocr edit AND saving to internal id for MYKAD_BACK or OTHER -> move on to next internal ID
                                    default: {
                                        this.loadNextInternalId();
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
            this.mapIDLibrary().then(() => {
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
            });
        }
    }

    // ------------------------------------------------------
    //               INITIALIZATION FUNCTIONS
    // ------------------------------------------------------ 

    /* sorting IDs */
    mapIDLibrary = (sortedIndex?: number) => {
        // sortedIndex === undefined only during init
        return new Promise((res, rej) => {
            const mappedList = this.props.library.map((each, idx) => {
                return {
                    ID: each,
                    libIndex: idx,
                    status: DatabaseUtil.getOverallStatus(each.phasesChecked, each.annotationState, this.props.processType)
                }
            });
            const incompleteSessions = mappedList.filter((each) => 
                DatabaseUtil.getOverallStatus(each.ID.phasesChecked, each.ID.annotationState, this.props.processType) 
                    === AnnotationStatus.INCOMPLETE);
            const completeSessions = mappedList.filter((each) => 
                DatabaseUtil.getOverallStatus(each.ID.phasesChecked, each.ID.annotationState, this.props.processType) 
                    === AnnotationStatus.COMPLETE);
            const naSessions = mappedList.filter((each) => 
                DatabaseUtil.getOverallStatus(each.ID.phasesChecked, each.ID.annotationState, this.props.processType) 
                    === AnnotationStatus.NOT_APPLICABLE);
            const sortedList = incompleteSessions.concat(completeSessions).concat(naSessions);

            if (sortedIndex !== undefined) {
                if (completeSessions.length === this.state.sortedList.filter((each) => each.status === AnnotationStatus.COMPLETE).length) {
                    this.setState({sortedList: sortedList, sortedIndex: this.state.sortedIndex}, res);
                } else {
                    this.setState({sortedList: sortedList, sortedIndex: sortedIndex > 0 ? sortedIndex - 1 : 0})
                }
            } else {
                this.initializeFirstSortedID(sortedList[0].libIndex);
                this.setState({sortedList: sortedList, sortedIndex: 0}, res);
            }
        })
    }

    initializeFirstSortedID = (libIndex: number) => {
        if (this.props.currentIndex !== libIndex) {
            this.props.getSelectedID(libIndex);
        }
    }

    /* Initialization for Seg Check */
    loadSegCheckImage = (ID: IDState) => {
        if (ID.originalIDProcessed && ID.internalIDs[ID.internalIndex] !== undefined 
            && ID.internalIDs[ID.internalIndex].processStage === IDProcess.DOUBLE_BACK) {
            this.props.loadImageState(ID.backID!);
        } else {
            this.props.loadImageState(ID.originalID!);
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
        let docTypes = options.documentTypes.double.concat(options.documentTypes.single);
        this.setState({
            documentTypes: docTypes,
            singleDocumentType: docTypes[0],
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
                if (this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
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
        } else {
            if (this.props.currentID.originalID !== undefined && this.props.currentID.originalID.croppedImage !== undefined) {
                if (this.props.currentID.originalID.croppedImage.name === 'notfound') {
                    cropResult = false;
                }
            }
            if (cropResult === undefined) {
                if (this.props.currentID.givenData !== undefined) {
                    if (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
                        if (this.props.currentID.givenData.backID !== undefined && this.props.currentID.givenData.backID.segmentation !== undefined) {
                            let seg = this.props.currentID.givenData.backID.segmentation;
                            if (cropResult === undefined) {
                                if (seg.length <= 1) {
                                    cropResult = seg[0] !== undefined ? seg[0]!.passesCrop : undefined;
                                } else {
                                    cropResult = false;
                                }
                            }
                        }
                    } else {
                        if (this.props.currentID.givenData.originalID !== undefined && this.props.currentID.givenData.originalID.segmentation !== undefined) {
                            let seg = this.props.currentID.givenData.originalID.segmentation;
                            if (seg.length <= 1) {
                                if (cropResult === undefined) cropResult = seg[0] !== undefined ? seg[0]!.passesCrop : undefined;
                                if (docType === '') docType = seg[0] !== undefined ? seg[0]!.documentType : '';
                            } else {
                                if (cropResult === undefined) cropResult = false;
                                if (docType === '') docType = seg[this.props.currentID.internalIndex] !== undefined ? seg[this.props.currentID.internalIndex]!.documentType : '';
                            }
                        }
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

    /* Initialization for Seg Edit */
    initializeSegEditData = () => {
        if (this.props.currentID.sessionID === '') return;
        if (this.props.currentID.givenData !== undefined) {
            if (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
                if (this.props.currentID.givenData.backID !== undefined && this.props.currentID.givenData.backID.segmentation !== undefined) {
                    let seg = this.props.currentID.givenData.backID.segmentation;
                    if (this.props.currentID.internalIDs.filter((each) => each.backID !== undefined && each.backID.IDBox !== undefined).length === 0) {
                        seg.forEach((each) => {
                            if (each !== undefined) {
                                this.props.setIDBox(each.IDBox);
                            }
                        })
                    }
                }
            } else {
                if (this.props.currentID.givenData.originalID !== undefined && this.props.currentID.givenData.originalID.segmentation !== undefined) {
                    let seg = this.props.currentID.givenData.originalID.segmentation;
                    if (this.props.currentID.internalIDs.length === 0) {
                        let docTypes: {id: number, value: string}[] = [];
                        seg.forEach((each, idx) => {
                            if (each !== undefined) {
                                docTypes.push({ id: idx, value: each!.documentType });
                                this.props.createNewID(each.IDBox, each.passesCrop, each.documentType);
                            }
                        });
                        this.setState({selectedDocumentTypes: docTypes});
                    }
                }
            }
        }
    }

    /* Initialization for Landmark */
    loadLandmarkData = () => {
        let docLandmarks: {docType: string, landmarks: {name: string, codeName: string, flags: string[]}[]}[] = [];
        let currentLandmarks: {name: string, codeName: string, flags: string[]}[] = [];
        let flags: {category: string, flags: string[]}[] = [];
        options.landmark.keys.forEach((each, idx) => {
            let landmarks: {name: string, codeName: string, flags: string[]}[] = [];
            options.landmark.compulsory.displayNames[idx].forEach((each, i) => {
                landmarks.push({
                    name: each,
                    codeName: options.landmark.compulsory.codeNames[idx][i],
                    flags: []
                });
            });
            options.landmark.optional.displayNames[idx].forEach((each, i) => {
                landmarks.push({
                    name: each,
                    codeName: options.landmark.optional.codeNames[idx][i],
                    flags: []
                });
            });
            docLandmarks.push({
                docType: each,
                landmarks: landmarks
            });
            if (this.props.internalID.documentType !== undefined && this.props.internalID.processStage !== undefined) {
                if (this.props.internalID.documentType + this.props.internalID.processStage === each 
                    && this.props.currentImage.landmark.length === 0) {
                    currentLandmarks = this.initializeLandmarkData(landmarks);
                }
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
            if (stLandmark !== undefined) {
                landmark.position = stLandmark.position;
            } else if (this.props.currentID.givenData !== undefined) {
                // if db csv already has ocr data
                if (this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
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
    
    /* Initialization for OCR Details */
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

            if (this.props.internalID.documentType !== undefined && this.props.internalID.processStage !== undefined) {
                if (this.props.internalID.documentType + this.props.internalID.processStage === each) {
                    currentOCR = this.initializeOCRData(ocr);
                }
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
                newlines: [],
                count: 0,
                labels: []
            };
            
            let stOcr = this.props.currentImage.ocr.find((lm) => each.codeName === lm.codeName);
            if (stOcr !== undefined) {
                ocr.labels = stOcr.labels;
                ocr.count = stOcr.count;
                ocr.newlines = stOcr.newlines;
            } else if (this.props.currentID.givenData !== undefined) {
                // if db csv already has ocr data
                if (this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
                    if (this.props.currentID.givenData.backID !== undefined) {
                        let givenOcrs = this.props.currentID.givenData.backID.ocr[this.props.currentID.internalIndex];
                        if (givenOcrs !== undefined) {
                            let dbOcr = givenOcrs.find((o) => o.codeName === each.codeName);
                            if (dbOcr !== undefined) {
                                ocr.count = dbOcr.count;
                                ocr.labels = dbOcr.labels;
                                ocr.newlines = dbOcr.newlines;
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
                                ocr.newlines = dbOcr.newlines;
                            }
                        }
                    }
                }
            }
            // if not, just initialize with the correct set of landmarks with each position as undefined
            this.props.addOCRData(ocr);

            let value = '';
            if (each.codeName === 'name' || each.codeName === 'address') {
                let split: string[] = [];
                let terms = ocr.labels.map((lbl) => lbl.value);
                let ptr = 0;
                let termPtr = 0;

                while (termPtr < terms.length) {
                    if (ptr < ocr.newlines.length && termPtr === ocr.newlines[ptr]) {
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
                value = split.join('');
            } else {
                value = ocr.labels.map((lbl) => lbl.value).join(' ');
            }

            newOcrs.push({
                name: ocr.name,
                codeName: ocr.codeName,
                mapToLandmark: ocr.mapToLandmark,
                value: value
            });
        });
        return newOcrs;
    }

    /* Initialization for Liveness */
    loadVideoFlags = () => {
        let vidFlags: {category: string, flags: string[]}[] = [];
        options.flags.video.keys.forEach((each, idx) => {
            let flags = options.flags.video.values[idx];
            vidFlags.push({category: each, flags: flags});
        });
        this.setState({videoFlags: vidFlags, videoFlagsLoaded: true}, () => this.initializeLiveness());
    }

    initializeLiveness = () => {
        if (this.state.videoFlagsLoaded) {
            if (this.props.currentID.videoLiveness !== undefined) {
                this.setState({
                    passesLiveness: this.props.currentID.videoLiveness,
                    selectedVideoFlags: this.props.currentID.videoFlags !== undefined ? this.props.currentID.videoFlags: [],
                }, this.frLivenessValidate);
            } else if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.face !== undefined) {
                let face = this.props.currentID.givenData.face;
                this.setState({passesLiveness: face.liveness, selectedVideoFlags: face.videoFlags !== undefined ? face.videoFlags : []}, this.frLivenessValidate);
            }
        }
    }

    frLivenessValidate = () => {
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

    /* Initialization for Face Compare */
    initializeFaceCompareMatch = () => {
        if (this.state.faceCompareMatch === undefined) {
            if (this.props.currentID.faceCompareMatch !== undefined) {
                this.setState({faceCompareMatch: this.props.currentID.faceCompareMatch});
            } else if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.face !== undefined) {
                let match = this.props.currentID.givenData.face.match;
                if (match === undefined || match.length === 0) return;
                let value = match[this.props.currentID.internalIndex];
                this.setState({faceCompareMatch: value}, () => {
                    if (value !== undefined) this.props.setFaceCompareMatch(value);
                });
            }
        }
    }

    /* Helper Functions for using Crop & Landmark APIs to format request body */
    createCropFormData = (image: File, points: any) => {
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

    createLandmarkFormData = (image: File, docType: string) => {
        const data = new FormData();
        data.append("image", image);
        data.append("card_type", docType);
        return data;
    }

    // ------------------------------------------------------
    //                    RENDER FUNCTIONS
    // ------------------------------------------------------ 

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
            if (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined
                && this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
                this.setState({selectedBackIDFlags: flags});
            } else {
                this.setState({selectedFrontIDFlags: flags});
            }
        }

        const getCategoryFlags = (flags: string[]) => {
            let values = this.state.selectedFrontIDFlags;

            if (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined && 
                this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
                values = this.state.selectedBackIDFlags;
            }

            return (
                <ToggleButtonGroup type="checkbox" onChange={(val) => setFlag(val)}
                    value={values}
                    style={{marginBottom: "1rem", flexWrap: "wrap"}}>
                {
                    flags.map((flag, idx) => {
                        return (<ToggleButton
                            className="video-flags"
                            key={idx}
                            value={flag}
                            variant="light"
                            >
                            {GeneralUtil.beautifyWord(flag)}
                        </ToggleButton>);
                    })
                }   
                </ToggleButtonGroup>
            );
        }

        const backStage = () => {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
            this.props.backToOriginal();
            this.setState({passesCrop: undefined, loadedSegCheckImage: true}, () => {
                this.props.loadImageState(this.props.internalID.originalID!);
                this.initializeSegCheckData();
            });
        }

        const skipSegCheck = () => {
            this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
            this.props.updateBackIDFlags(this.state.selectedBackIDFlags);
            if (!this.props.currentID.originalIDProcessed) {
                // only when processing front ID: to clear out internal IDs in case any were created before skipping
                this.props.clearInternalIDs();
            }
            if (this.props.processType === ProcessType.WHOLE || this.props.processType === ProcessType.LIVENESS) {
                if (this.props.currentID.selfieVideo!.name !== 'notfound') {
                    this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                    return;
                } 
                // else if (this.props.currentID.selfieImage!.name !== 'notfound'
                //     && this.props.currentID.croppedFace!.name !== 'notfound'
                //     && this.props.processType !== ProcessType.LIVENESS) {
                //     this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                // }
                //  else {
                //     this.loadNextID(false, true);
                // }
            }
            this.loadNextID(false, true);
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

            // not first time OR back ID
            if (this.props.currentID.internalIDs.length > 0) {
                // front ID
                if (this.props.internalID.processStage !== IDProcess.DOUBLE_BACK) {
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
                                } else if (this.props.currentID.givenData.originalID.croppedImageProps !== undefined) {
                                    let imgProps = this.props.currentID.givenData.originalID.croppedImageProps;
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
                                if (internalID !== undefined && internalID.processStage === IDProcess.DOUBLE_FRONT) {
                                    this.props.saveToInternalID(internalID.originalID !== undefined ? internalID.originalID : this.props.currentImage, 
                                        !this.props.currentID.phasesChecked.back);
                                    if (this.props.currentID.phasesChecked.back) {
                                        this.loadBackId();
                                    }
                                } else {
                                    this.props.saveToInternalID(this.props.currentImage, true);
                                    this.loadNextID(false);
                                }
                            }
                        } else {
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
                        }
                        return;
                    } else {
                        if (this.state.passesCrop) {
                            if (this.props.internalID.documentType !== this.state.singleDocumentType) {
                                this.props.saveDocumentType(0, this.state.singleDocumentType);
                            }
                            if (this.props.processType === ProcessType.SEGMENTATION) {
                                let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
                                if (internalID !== undefined && internalID.processStage === IDProcess.DOUBLE_FRONT) {
                                    this.props.saveToInternalID(internalID.originalID !== undefined ? internalID.originalID : this.props.currentImage,
                                        !this.props.currentID.phasesChecked.back);
                                    if (this.props.currentID.phasesChecked.back) {
                                        this.loadBackId();
                                    }
                                } else {
                                    this.props.saveToInternalID(this.props.currentImage, true);
                                    this.loadNextID(false);
                                }
                            } else {
                                this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                                this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                            }
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
                                } else if (this.props.currentID.givenData.backID.croppedImageProps !== undefined) {
                                    let imgProps = this.props.currentID.givenData.backID.croppedImageProps;
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

            // first time AND NOT back ID
            if (this.state.passesCrop) {
                this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
                if (this.props.internalID === undefined) {
                    let preBox = undefined;
                    if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.originalID !== undefined
                        && this.props.currentID.givenData.originalID.segmentation !== undefined) {
                        if (this.props.currentID.givenData.originalID.segmentation.length > 0) {
                            preBox = this.props.currentID.givenData.originalID.segmentation[0] !== undefined ?
                                        this.props.currentID.givenData.originalID.segmentation[0]!.IDBox : undefined;
                        } else if (this.props.currentID.givenData.originalID.croppedImageProps !== undefined) {
                            let imgProps = this.props.currentID.givenData.originalID.croppedImageProps;
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
                        if (internalID !== undefined && internalID.processStage === IDProcess.DOUBLE_FRONT) {
                            this.props.saveToInternalID(internalID.originalID !== undefined ? internalID.originalID : this.props.currentImage, 
                                !this.props.currentID.phasesChecked.back);
                            if (this.props.currentID.phasesChecked.back) {
                                this.loadBackId();
                            }
                        } else {
                            this.props.saveToInternalID(this.props.currentImage, true);
                            this.loadNextID(false);
                        }
                    }
                } else if (this.props.internalID !== undefined && this.props.internalID.processStage !== IDProcess.DOUBLE_BACK) {
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
                    !this.props.currentID.originalIDProcessed ||
                    (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined 
                        && this.props.internalID.processStage !== IDProcess.DOUBLE_BACK)
                    ?
                    <Form.Group controlId="docType">
                        <Form.Label>Document Type</Form.Label>
                        <Form.Control as="select" value={this.state.singleDocumentType} onChange={(e: any) => setSingleDocType(e)}>
                            {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{GeneralUtil.beautifyWord(value)}</option>)}
                        </Form.Control>
                    </Form.Group>
                    : <div />
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
                                            <p>{GeneralUtil.beautifyWord(each.category)}</p>
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
                        ((this.props.internalID.processStage === IDProcess.DOUBLE_BACK && this.state.selectedBackIDFlags.length > 0) ||
                        (this.props.internalID.processStage !== IDProcess.DOUBLE_BACK && this.state.selectedFrontIDFlags.length > 0)))
                    ?
                    (<Button variant="primary" className="block-button" id="segcheck-skip-btn"
                        onClick={skipSegCheck}>
                        Skip
                    </Button>)
                    : <div />
                }
                {
                    this.props.currentID.originalIDProcessed && this.props.internalID !== undefined
                    && this.props.internalID.processStage === IDProcess.DOUBLE_BACK ?
                    <Button variant="secondary" className="block-button" id="segcheck-back-btn" onClick={backStage}>
                        Back
                    </Button>
                    : <div />
                }

                <Button type="submit" className="block-button" id="segcheck-submit-btn" disabled={this.state.passesCrop === undefined}>
                    Next
                </Button>
            </Form>
        )
    }

    segEdit = () => {
        const setDocType = (e: any, id: number) => {
            let docs = this.state.selectedDocumentTypes;
            let index = docs.findIndex((each) => each.id === id);
            if (index === -1) {
                docs.push({id: id, value: e.target.value});
            } else {
                let doc = docs[index];
                doc.value = e.target.value;
                docs.splice(index, 1, doc);
            }
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
            if (this.state.selectedDocumentTypes.length < this.props.currentID.internalIDs.length) {
                this.props.currentID.internalIDs.forEach((each, idx) => {
                    let selected = this.state.selectedDocumentTypes.find((doc) => doc.id === idx);
                    if (selected === undefined) {
                        this.props.saveDocumentType(idx, 'mykad');
                    } else {
                        this.props.saveDocumentType(selected.id, selected.value);
                    }
                });
            } else {
                this.state.selectedDocumentTypes.forEach((each) => {
                    this.props.saveDocumentType(each.id, each.value);
                });
            }
            this.setState({selectedDocumentTypes: []});
        }

        const undoBox = () => {
            this.props.deleteIDBox(-1);
            this.setState({selectedDocumentTypes: this.state.selectedDocumentTypes.slice(0, this.state.selectedDocumentTypes.length - 1)});
        }

        const loadImageAndProgress = () => {
            if (!this.props.currentID.originalIDProcessed || 
                (this.props.currentID.originalIDProcessed && this.props.internalID !== undefined 
                    && this.props.internalID.processStage !== IDProcess.DOUBLE_BACK)) {
                submitDocTypes();
            }

            if (this.props.processType === ProcessType.SEGMENTATION) {
                this.setState({isCropping: false}, () => GeneralUtil.toggleOverlay(false));
                if (this.props.internalID.processStage !== undefined && this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
                    if (this.props.currentID.phasesChecked.back) {
                        this.props.saveToInternalID(this.props.internalID.originalID!, false);
                        this.loadBackId();
                    } else {
                        this.loadNextID(false);
                    }
                } else {
                    this.loadNextID(false);
                }
                return;
            }

            const header = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };
            let cropsDone = 0;

            if (this.props.internalID.processStage !== IDProcess.DOUBLE_BACK) {
                const moveOnFront = () => {
                    if (cropsDone === this.props.currentID.internalIDs.length) {
                        this.setState({isCropping: false}, () => GeneralUtil.toggleOverlay(false));
                        if (this.props.processType === ProcessType.SEGMENTATION) {
                            this.props.progressNextStage(CurrentStage.INTER_STAGE);
                        } else {
                            this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                            this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                        }
                    }
                }

                for (let i = 0; i < this.props.currentID.internalIDs.length; i++) {
                    let each = this.props.currentID.internalIDs[i];
                    let points = each.originalID!.IDBox!.position;
                    axios.post(
                        HOST + ":" + PORT + TRANSFORM,
                        this.createCropFormData(each.originalID!.image, points),
                        header
                    ).catch((err: any) => {
                        console.error(err);
                    }).then((res: any) => {
                        if (res.status === 200) {
                            let image: File = DatabaseUtil.dataURLtoFile('data:image/jpg;base64,' + res.data.encoded_img, res.data.filename + "_cropped");
                            if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.originalID !== undefined) {
                                let seg = this.props.currentID.givenData.originalID.segmentation;
                                if (seg !== undefined && seg[i] !== undefined && this.props.currentID.givenData.originalID.landmark[i] !== undefined
                                    && this.props.currentID.givenData.originalID.landmark[i].length > 0) {
                                    this.props.saveCroppedImage(image, i);
                                    cropsDone++;
                                    moveOnFront();
                                }
                            }
                            if (each.originalID!.landmark.length === 0 && each.documentType !== undefined && each.documentType === 'mykad') {
                                axios.post(
                                    HOST + ":" + PORT + LANDMARK,
                                    this.createLandmarkFormData(image, 'mykad_front'),
                                    header
                                ).catch((err: any) => {
                                    console.error(err);
                                    this.props.saveCroppedImage(image, i);
                                    moveOnFront();
                                }).then((landmarkRes: any) => {
                                    if (landmarkRes.status === 200) {
                                        this.props.saveCroppedImage(image, i, landmarkRes.data.map((each: any, idx: number) => {
                                            let lm: LandmarkData = {
                                                id: idx,
                                                type: "landmark",
                                                codeName: each.id,
                                                name: DatabaseUtil.translateTermFromCodeName('mykadFront', 'landmark', each.id, false),
                                                position: {
                                                    x1: each.coords.x1[0],
                                                    y1: each.coords.x1[1],
                                                    x2: each.coords.x2[0],
                                                    y2: each.coords.x2[1],
                                                    x3: each.coords.x3[0],
                                                    y3: each.coords.x3[1],
                                                    x4: each.coords.x4[0],
                                                    y4: each.coords.x4[1]
                                                },
                                                flags: []
                                            }
                                            return lm;
                                        }));
                                        cropsDone++;
                                        moveOnFront();
                                    } else {
                                        this.props.saveCroppedImage(image, i);
                                        cropsDone++;
                                        moveOnFront();
                                    }
                                })
                            } else {
                                this.props.saveCroppedImage(image, i);
                                cropsDone++;
                                moveOnFront();
                            } 
                        }                
                    });
                }
            } else {
                const moveOnBack = () => {
                    this.setState({isCropping: false}, () => GeneralUtil.toggleOverlay(false));
                    if (this.props.processType === ProcessType.SEGMENTATION) {
                        this.props.progressNextStage(CurrentStage.INTER_STAGE);
                    } else {
                        this.props.loadImageState(this.props.internalID.backID!, this.state.passesCrop);
                        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                    }
                }

                axios.post(
                    HOST + ":" + PORT + TRANSFORM,
                    this.createCropFormData(this.props.internalID.backID!.image, this.props.internalID.backID!.IDBox!.position),
                    header
                ).catch((err: any) => {
                    console.error(err);
                }).then((res: any) => {
                    if (res.status === 200) {
                        let image: File = DatabaseUtil.dataURLtoFile('data:image/jpg;base64,' + res.data.encoded_img, res.data.filename);
                        if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.backID !== undefined) {
                            let seg = this.props.currentID.givenData.backID.segmentation;
                            let idx = this.props.currentID.internalIndex;
                            if (seg !== undefined && seg[idx] !== undefined && this.props.currentID.givenData.backID.landmark[idx] !== undefined
                                && this.props.currentID.givenData.backID.landmark[idx].length > 0) {
                                this.props.saveCroppedImage(image);
                                moveOnBack();
                            }
                        }
                        if (this.props.internalID.backID!.landmark.length === 0 && 
                            this.props.internalID.documentType !== undefined && this.props.internalID.documentType === 'mykad') {
                            axios.post(
                                HOST + ":" + PORT + LANDMARK,
                                this.createLandmarkFormData(image, 'mykad_back'),
                                header
                            ).catch((err: any) => {
                                console.error(err);
                                this.props.saveCroppedImage(image);
                                moveOnBack();
                            }).then((landmarkRes: any) => {
                                if (landmarkRes.status === 200) {
                                    this.props.saveCroppedImage(image, undefined, landmarkRes.data.map((each: any, idx: number) => {
                                        let translatedCodeName = each.id.split('_').filter((t: string) => t !== this.props.internalID.documentType
                                            && t !== 'back').join('_');
                                        let lm: LandmarkData = {
                                            id: idx,
                                            type: "landmark",
                                            codeName: translatedCodeName,
                                            name: DatabaseUtil.translateTermFromCodeName('mykadBack', 'landmark', translatedCodeName, false),
                                            position: {
                                                x1: each.coords.x1[0],
                                                y1: each.coords.x1[1],
                                                x2: each.coords.x2[0],
                                                y2: each.coords.x2[1],
                                                x3: each.coords.x3[0],
                                                y3: each.coords.x3[1],
                                                x4: each.coords.x4[0],
                                                y4: each.coords.x4[1]
                                            },
                                            flags: []
                                        }
                                        return lm;
                                    }));
                                    moveOnBack();
                                } else {
                                    this.props.saveCroppedImage(image);
                                    moveOnBack();
                                }
                            })
                        } else {
                            this.props.saveCroppedImage(image);
                            moveOnBack();
                        }
                    }                
                });
            }
        }

        return (
            <div>
                {   
                    this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.DOUBLE_BACK
                    ? <h5>Please draw the corresponding bounds for the current ID</h5>
                    : <h5>Please draw bounding boxes around any number of IDs in the image.</h5>
                }
                <h6>Boxes Drawn</h6>
                    <Accordion>
                        {
                            this.props.currentID.internalIDs.map((id, idx) => {
                                let back = this.props.currentID.originalIDProcessed 
                                && this.props.internalID !== undefined
                                && this.props.internalID.processStage === IDProcess.DOUBLE_BACK;
                                let box = back ? id.backID!.IDBox : id.originalID!.IDBox;
                                if (box === undefined) return <div key={idx} />;
                                return (
                                    <Card key={idx}>
                                        <Accordion.Toggle
                                            as={Card.Header}
                                            eventKey={idx.toString()}>
                                                Box {(box.id + 1).toString()}
                                        </Accordion.Toggle>
                                        <Accordion.Collapse eventKey={idx.toString()}>
                                            { back ? <div /> :
                                                <Card.Body>
                                                    <Form.Group controlId="docType">
                                                        <Form.Label>Document Type</Form.Label>
                                                        {/* <Button onClick={() => {this.setState({showAddDocTypeModal: true})}} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button> */}
                                                        <Form.Control as="select" value={getValue(idx)} onChange={(e: any) => setDocType(e, idx)}>
                                                            {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{GeneralUtil.beautifyWord(value)}</option>)}
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
                || this.props.currentID.originalIDProcessed && this.props.internalID.processStage === IDProcess.DOUBLE_BACK && 
                    this.props.internalID.backID!.IDBox === undefined} 
                    className="common-button" onClick={() => this.setState({isCropping: true}, () => {
                        GeneralUtil.toggleOverlay(true); loadImageAndProgress(); })}>
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
                                        <p>{GeneralUtil.beautifyWord(each.category)}</p>
                                        <ToggleButtonGroup style={{flexWrap: "wrap"}} type="checkbox" onChange={(val) => setFlag(val)} value={selectedFlags}>
                                            {each.flags.map((flag, idx) => {
                                                return (
                                                    <ToggleButton
                                                        className="labelling-flags"
                                                        key={idx}
                                                        value={flag}
                                                        variant="light"
                                                        >
                                                        {GeneralUtil.beautifyWord(flag)}
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
                if (this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
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
                                                {each.name}
                                                <p style={{color: 'grey'}}>
                                                    {
                                                        this.props.internalID !== undefined &&
                                                        GeneralUtil.isOptionalLandmark(each.codeName, this.props.internalID.documentType,
                                                            this.props.internalID.processStage) ? '(optional)' : ''
                                                    }
                                                </p>
                                                <CgCheckO className="landmark-done-tick" />
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
                    disabled={this.props.currentImage.landmark.filter((each) => {
                        if (this.props.internalID === undefined) return false;
                        return !GeneralUtil.isOptionalLandmark(each.codeName, this.props.internalID.documentType, this.props.internalID.processStage)
                            && each.position === undefined
                    }).length > 0}
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
                let newlines: number[] = [];
                let terms = [];

                if (each.codeName === 'name' || each.codeName === 'address') {
                    let processed = GeneralUtil.processOCRValue(each.ref.value);
                    newlines = processed.newlines;
                    terms = processed.terms;
                } else {
                    terms = each.ref.value.split(' ').filter((each: string) => each.length > 0);
                }

                let ocr: OCRData = {
                    id: idx,
                    type: 'OCR',
                    name: each.name,
                    codeName: each.codeName,
                    mapToLandmark: each.mapToLandmark,
                    labels: terms.map((each: string, idx: number) => {
                        return {id: idx, value: each};
                    }),
                    count: terms.length,
                    newlines: newlines
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
                    this.state.currentOCR.filter((ocr) => {
                        if (GeneralUtil.isOptionalLandmark(ocr.mapToLandmark, this.props.internalID.documentType, this.props.internalID.processStage)) {
                            let lm = this.props.currentImage.landmark.find((lm) => lm.codeName === ocr.mapToLandmark);
                            if (lm !== undefined) {
                                return lm.position !== undefined;
                            }
                        }
                        return true;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((each, idx) => {
                        if (each.codeName === 'name' || each.codeName === 'address') {
                            return (
                                <Form.Group key={each.codeName + "OCR"}>
                                    <Form.Label>{each.name}</Form.Label>
                                    {/* SKIP_VALIDATION: Remove required */}
                                    <Form.Control as="textarea" required type="text" defaultValue={each.value}
                                    ref={(ref: any) => {refs.push({name: each.name, codeName: each.codeName, mapToLandmark: each.mapToLandmark, ref})}} />
                                </Form.Group>
                            );
                        } else {
                            return (
                                <Form.Group key={each.codeName + "OCR"}>
                                    <Form.Label>{each.name}</Form.Label>
                                    {/* SKIP_VALIDATION: Remove required */}
                                    <Form.Control required type="text" defaultValue={each.value}
                                    ref={(ref: any) => {refs.push({name: each.name, codeName: each.codeName, mapToLandmark: each.mapToLandmark, ref})}} />
                                </Form.Group>
                            );
                        }
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
                if (this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                } else {
                    this.props.saveToInternalID(this.props.currentImage, true);
                    this.props.progressNextStage(CurrentStage.INTER_STAGE);
                }
            } else {
                if (this.props.internalID.processStage === IDProcess.DOUBLE_FRONT) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.loadBackId();
                } else if (this.props.internalID.processStage === IDProcess.DOUBLE_BACK
                    && this.props.internalID.backID !== undefined && this.props.internalID.backID.IDBox !== undefined) {
                    this.props.saveToInternalID(this.props.currentImage, false);
                    this.props.progressNextStage(CurrentStage.END_STAGE);
                } else if (this.props.internalID.processStage === IDProcess.SINGLE) {
                    if (this.props.currentID.selfieVideo!.name !== 'notfound') {
                        this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                    } else if (this.props.currentID.selfieImage!.name !== 'notfound'
                        && this.props.currentID.croppedFace!.name !== 'notfound'
                        && this.props.processType !== ProcessType.LIVENESS) {
                        this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                    } else {
                        this.props.saveToInternalID(this.props.currentImage, true);
                        this.loadNextID(false, true);
                    }
                }
            }
        }
        
        // SKIP_VALIDATION: comment out validate()
        validate();

        return (
            <div>
                <Accordion activeKey={getActiveKey()}>
                    {
                        ocrs.sort((a, b) => a.name.localeCompare(b.name)).map((each, index) => {
                            if (each.count <= 1) return <div key={index} />;
                            return (
                                <Card key={index}>
                                    <Accordion.Toggle
                                        as={Card.Header}
                                        eventKey={each.codeName + " " + each.mapToLandmark}
                                        key={index}
                                        className={getClassNameLandmark(each)}
                                        onClick={() => {
                                            this.props.setCurrentSymbol(each.codeName, each.mapToLandmark);
                                            this.props.setCurrentWord(each.labels[0]);}}>
                                        {each.name}
                                        <CgCheckO className="ocr-done-tick" />
                                    </Accordion.Toggle>
                                    <Accordion.Collapse eventKey={each.codeName + " " + each.mapToLandmark}>
                                    <Card.Body>
                                    <ButtonGroup vertical>
                                        {
                                            each.labels.sort((a, b) => a.id - b.id).map((label, idx) => {
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
            this.setState({selectedVideoFlags: flags}, this.frLivenessValidate);
        }

        const backStage = () => {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }

        const submitLiveness = () => {
            if (this.state.passesLiveness !== undefined && this.state.passesLiveness !== this.props.currentID.videoLiveness) {
                this.props.updateVideoData(this.state.passesLiveness!, this.state.selectedVideoFlags);
            } else {
                if (this.props.processType === ProcessType.LIVENESS || this.props.internalID === undefined || 
                    (this.props.internalID && this.props.internalID.originalID!.croppedImage!.name === 'notfound')) {
                    this.loadNextID(false);
                } else {
                    this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                }
            }
        }

        return (
            <div>
                <Card className="individual-card">
                    <Card.Title>Liveness</Card.Title>
                    <Card.Body>
                        <ToggleButtonGroup type="radio" name="passesLivenessButtons" style={{display: "block", width: "100%"}}
                            value={this.state.passesLiveness} onChange={(val) => this.setState({passesLiveness: val}, this.frLivenessValidate)}>
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
                                        <p>{GeneralUtil.beautifyWord(each.category)}</p>
                                        <ToggleButtonGroup 
                                        type="checkbox" style={{flexWrap: "wrap"}}
                                        onChange={(val) => setFlag(val, each.flags)} value={this.state.selectedVideoFlags}>
                                        {
                                            each.flags.map((flag, i) => {
                                                return (
                                                    <ToggleButton
                                                        className="video-flags"
                                                        key={i}
                                                        value={flag}
                                                        variant="light"
                                                        >
                                                        {GeneralUtil.beautifyWord(flag)}
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
                <Button variant="secondary" className="block-button" onClick={backStage}>
                    Back To Segmentation
                </Button>
                <Button className="block-button" onClick={submitLiveness} 
                disabled={!this.state.livenessValidation}>
                    Done
                </Button>
            </div>
        )
    }

    frCompareCheck = () => {
        const backStage = () => {
            if (this.props.currentID.selfieVideo !== undefined && this.props.currentID.selfieVideo.name !== 'notfound') {
                this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
            } else {
                this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
            }
        }

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
                            value={this.props.internalID !== undefined ? this.props.internalID.faceCompareMatch : undefined} 
                            onChange={(val) => this.props.setFaceCompareMatch(val)}>
                            <ToggleButton variant="light" className="common-button" value={false}>No Match</ToggleButton>
                            <ToggleButton variant="light" className="common-button" value={true}>Match</ToggleButton>
                        </ToggleButtonGroup>
                    </Card.Body>
                </Card>
                <Button variant="secondary" className="common-button" onClick={backStage}>
                    Back
                </Button>
                <Button className="common-button" onClick={submitFaceCompareResults}
                disabled={this.props.internalID !== undefined ? this.props.internalID.faceCompareMatch === undefined : false}>
                    Done
                </Button>
            </div>
        );
    }

    // ------------------------------------------------------
    //            FUNCTIONS FOR MOVING FROM ID TO ID
    // ------------------------------------------------------ 

    // remember to save the ImageState back to the internalID correctly before calling this fx
    loadBackId = () => {
        if (this.props.internalID !== undefined && this.props.internalID.backID !== undefined && this.props.internalID.backID.image.name === 'notfound') {
            if (this.props.currentID.phasesChecked.video) {
                this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
            } else if (this.props.currentID.phasesChecked.face) {
                this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
            } else {
                let nextSortedIndex = this.state.sortedIndex + 1 === this.state.sortedList.length ? 0 : this.state.sortedIndex + 1;
                this.handleGetSession(this.state.sortedList[nextSortedIndex].libIndex, nextSortedIndex, this.state.sortedList[nextSortedIndex].status);
            }
        } else {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
            this.initializeSegCheckData();
            this.setState({passesCrop: undefined, loadedSegCheckImage: true}, () => this.props.loadImageState(this.props.currentID.backID!));
        }
    }

    // remember to save the ImageState back to the internalID correctly before calling this fx
    loadNextInternalId = () => {
        this.props.loadImageState(this.props.internalID.originalID!);
        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
    }

    // remember to save the ImageState back to the internalID correctly before calling this fx
    loadNextID = (prev: boolean, beforeSegCheckDone?: boolean) => {
        console.log('call next');
        this.resetState();
        let id = this.props.currentID;
        if (beforeSegCheckDone) {
            id.frontIDFlags = this.state.selectedFrontIDFlags;
            id.backIDFlags = this.state.selectedBackIDFlags;
        }
        this.props.saveToLibrary(id);
        axios.post('/saveOutput', {
            database: this.props.database,
            ID: DatabaseUtil.extractOutput(id, this.props.processType === ProcessType.FACE),
            overwrite: true
        }).then((res: any) => {
            this.props.restoreID();
            this.props.restoreImage();

            let isComplete = DatabaseUtil.getOverallStatus(res.data.phasesChecked, res.data.annotationState, this.props.processType)
                === AnnotationStatus.COMPLETE;

            if (prev) {
                let idx = this.state.sortedList[this.state.sortedIndex - 1].libIndex;
                this.props.getSelectedID(idx, res.data);
                this.setState({sortedIndex: this.state.sortedIndex - 1});
            } else {
                if (this.state.sortedIndex + 1 === this.state.sortedList.length) {
                    // go back to the first session
                    let idx = this.state.sortedList[0].libIndex;
                    this.props.getSelectedID(idx, res.data);
                    this.setState({sortedIndex: 0});
                } else {
                    if (isComplete) {
                        let nextSIndex = this.state.sortedIndex + 1;
                        let next = this.state.sortedList[nextSIndex];
                        if (next.status === AnnotationStatus.COMPLETE && this.state.sortedList[0].status === AnnotationStatus.INCOMPLETE) {
                            let idx = this.state.sortedList[0].libIndex;
                            nextSIndex = 0;
                            this.props.getSelectedID(idx, res.data);
                        } else {
                            let idx = next.libIndex;
                            this.props.getSelectedID(idx, res.data);
                        }
                        this.mapIDLibrary(nextSIndex);
                    } else {
                        let idx = this.state.sortedList[this.state.sortedIndex + 1].libIndex;
                        this.props.getSelectedID(idx, res.data);
                        this.setState({sortedIndex: this.state.sortedIndex + 1});
                    }
                }
            }
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }).catch((err: any) => {
            console.error(err);
        })
    }

    // do not use directly, call through handleGetSession
    // remember to save the ImageState back to the internalID correctly before calling this fx
    loadSelectedID = (index: number, sortedIndex: number, beforeSegCheckDone?: boolean) => {
        if (index === this.props.currentIndex) return;
        console.log('call selected');
        this.resetState();
        let id = this.props.currentID;
        if (beforeSegCheckDone) {
            id.frontIDFlags = this.state.selectedFrontIDFlags;
            id.backIDFlags = this.state.selectedBackIDFlags;
        }
        this.props.saveToLibrary(id);
        axios.post('/saveOutput', {
            database: this.props.database,
            ID: DatabaseUtil.extractOutput(id, this.props.processType === ProcessType.FACE),
            overwrite: true
        }).then((res: any) => {
            this.props.restoreID();
            this.props.restoreImage();
            this.props.getSelectedID(index, res.data);
            if (DatabaseUtil.getOverallStatus(res.data.phasesChecked, res.data.annotationState, this.props.processType)
                === AnnotationStatus.COMPLETE) {
                    this.mapIDLibrary(sortedIndex);
            } else {
                this.setState({sortedIndex: sortedIndex});
            }
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }).catch((err: any) => {
            console.error(err);
        })
    }

    handleGetSession = (libIndex: number, sortedIndex: number, status: AnnotationStatus) => {
        if (status === AnnotationStatus.NOT_APPLICABLE) return;
        this.loadSelectedID(libIndex, sortedIndex, this.props.currentStage === CurrentStage.SEGMENTATION_CHECK);
    }

    // used to clear ControlPanel component state
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
                // case (CurrentStage.SEGMENTATION_CHECK):
                // case (CurrentStage.SEGMENTATION_EDIT):
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
                // case (CurrentStage.SEGMENTATION_CHECK):
                case (CurrentStage.SEGMENTATION_EDIT): {
                    if (this.props.internalID !== undefined && this.props.internalID.processStage === IDProcess.DOUBLE_BACK) {
                        return (
                            <div className="internalIDIndex">
                                <p>Internal ID {(this.props.currentID.internalIndex + 1).toString() + " of " + this.props.currentID.internalIDs.length.toString()}</p>
                                <p>{this.props.internalID.documentType} Back</p>
                            </div>
                        ); 
                    }
                }
                default: return <div />;
            }
        }

        const navigateIDs = () => {
            const saveAndQuit = () => {
                let id = this.props.currentID;
                id.frontIDFlags = this.state.selectedFrontIDFlags;
                id.backIDFlags = this.state.selectedBackIDFlags;
                this.props.saveToLibrary(id);
                this.setState({showSaveAndQuitModal: false}, () => this.props.progressNextStage(CurrentStage.OUTPUT));
            }

            const toggleModal = (show: boolean) => {
                this.setState({showSaveAndQuitModal: show});
            }

            return (
                <SessionDropdown showModal={this.state.showSaveAndQuitModal} toggleModal={toggleModal} 
                    saveAndQuit={saveAndQuit} sortedList={this.state.sortedList} sortedIndex={this.state.sortedIndex}
                    handleGetSession={this.handleGetSession} />
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
    getSelectedID,
    loadNextID,
    createNewID,
    setIDBox,
    deleteIDBox,
    saveCroppedImage,
    refreshIDs,
    saveDocumentType,
    saveSegCheck,
    clearInternalIDs,
    backToOriginal,
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
        library: state.general.IDLibrary,
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