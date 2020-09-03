import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess, ProcessType } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion, Spinner } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState, InternalIDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox, OCRData, OCRWord, LandmarkData } from '../../../store/image/types';
import { progressNextStage, getNextID, saveToLibrary } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, setIDBox, deleteIDBox, saveCroppedImage, refreshIDs, saveDocumentType, updateVideoData, saveToInternalID, updateFrontIDFlags, restoreID } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, setCurrentSymbol, setCurrentWord, addLandmarkData, updateLandmarkFlags, addOCRData, setFaceCompareMatch, restoreImage } from '../../../store/image/actionCreators';
// import AddTypeModal from '../AddTypeModal/AddTypeModal';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { HOST, PORT, TRANSFORM } from '../../../config';
const axios = require('axios');

var fs = require('browserify-fs');

interface IProps {
    database: string;
    processType: ProcessType;
    currentStage: CurrentStage;
    currentID: IDState;
    indexedID: IDState;
    internalID: InternalIDState;
    currentImage: ImageState;

    // Moving between stages
    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
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
    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;

    // Landmark
    setCurrentSymbol: (symbol?: string, landmark?: string) => ImageActionTypes;
    addLandmarkData: (landmark: LandmarkData) => ImageActionTypes;
    updateLandmarkFlags: (name: string, flags: string[]) => ImageActionTypes;

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
            flags: string[]
        }[]
    }[];
    currentLandmarks: {
        name: string,
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
            mapToLandmark: string,
            value?: string
        }[]
    }[];
    currentOCR: {
        name: string,
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
                    axios.post('/loadSessionData', {
                        database: this.props.database,
                        date: DatabaseUtil.dateToString(this.props.indexedID.dateCreated),
                        sessionID:  this.props.indexedID.sessionID
                    }).then((res: any) => {
                        if (res.status === 200) {
                            console.log(res);
                            let completeID = DatabaseUtil.loadSessionData(res.data, this.props.indexedID);
                            this.props.loadNextID(completeID);
                            this.loadSegCheckImage();
                            this.setState({loadedSegCheckImage: true});
                        }
                    }).catch((err: any) => {
                        console.error(err);
                    });
                    break;
                }
                // initial load of doctypes and overall flags from config json, initial load of image
                if (this.state.documentTypes.length === 0) this.loadSegCheckData();
                if (!this.state.loadedSegCheckImage) {
                    this.loadSegCheckImage();
                    this.setState({loadedSegCheckImage: true});
                    break;
                }
                if (this.props.processType !== ProcessType.SEGMENTATION) {
                    // first time
                    if (previousProps.internalID === undefined && this.props.internalID !== undefined) {
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
                            this.loadNextID();
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
                    this.loadLandmarkData();
                } else {
                    this.state.landmarks.forEach((each) => {
                        // current set of landmarks is incorrect for the doctype
                        if (each.docType === this.props.internalID.processStage && each.landmarks !== this.state.currentLandmarks) {
                            this.initializeLandmarkData(each.landmarks);
                            this.setState({currentLandmarks: each.landmarks});
                        } else if (each.docType === this.props.internalID.processStage && each.landmarks === this.state.currentLandmarks
                            && this.props.currentImage.landmark.length === 0) {
                            // initial landmark names not added to image state
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
                        if (each.docType === this.props.internalID.processStage && each.details !== this.state.currentOCR) {
                            this.setState({currentOCR: each.details});
                        }
                    })
                }
                break;
            }
            case (CurrentStage.FR_LIVENESS_CHECK): {
                if (!this.state.videoFlagsLoaded) {
                    this.loadVideoFlags();
                };
                if (this.props.currentID.internalIndex > 0 && this.props.currentID.videoLiveness !== undefined) {
                    this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                }
                break;
            }
            case (CurrentStage.END_STAGE): {
                if (previousProps.internalID) {
                    if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
                        console.log('next id');
                        this.loadNextID();
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
                        this.loadNextID();
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
            axios.post('/loadSessionData', {
                database: this.props.database,
                date: DatabaseUtil.dateToString(this.props.indexedID.dateCreated),
                sessionID:  this.props.indexedID.sessionID
            }).then((res: any) => {
                if (res.status === 200) {
                    let completeID = DatabaseUtil.loadSessionData(res.data, this.props.indexedID);
                    this.props.loadNextID(completeID);
                    this.loadSegCheckData();
                }
            }).catch((err: any) => {
                console.error(err);
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

    loadLandmarkData = () => {
        let docLandmarks: {docType: string, landmarks: {name: string, flags: string[]}[]}[] = [];
        let currentLandmarks: {name: string, flags: string[]}[] = [];
        let flags: {category: string, flags: string[]}[] = [];
        options.landmark.keys.forEach((each, idx) => {
            let landmarks: {name: string, flags: string[]}[] = [];
            options.landmark.values[idx].forEach((each) => {
                landmarks.push({
                    name: each,
                    flags: []
                });
            });
            docLandmarks.push({
                docType: each,
                landmarks: landmarks
            });

            if (this.props.internalID.processStage === each && this.props.currentImage.landmark.length === 0) {
                currentLandmarks = landmarks;
                this.initializeLandmarkData(landmarks);
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

    initializeLandmarkData = (landmarks: {name: string, flags: string[]}[]) => {
        landmarks.forEach((each, idx) => {
            let landmark: LandmarkData = {
                id: idx,
                name: each.name,
                flags: each.flags,
                type: 'landmark'
            };
            this.props.addLandmarkData(landmark);
        })
    }
    
    loadOCRDetails = () => {
        let docOCR: {docType: string, details: {name: string, mapToLandmark: string, value?: string}[]}[] = [];
        let currentOCR: {name: string, mapToLandmark: string, value?: string}[] = [];
        options.ocr.keys.forEach((each, idx) => {
            let ocr: {name: string, mapToLandmark: string, value?: string}[] = [];
            for (var i = 0; i < options.ocr.values[idx].length; i++) {
                let value = this.props.currentID.jsonData !== undefined ? this.props.currentID.jsonData[options.ocr.values[idx][i]] : undefined;
                // special case for birthdate
                if (this.props.currentID.jsonData !== undefined && options.ocr.values[idx][i] === "birthDate") {
                    value = this.props.currentID.jsonData[options.ocr.values[idx][i]].originalString;
                }
                ocr.push({
                    name: options.ocr.values[idx][i],
                    mapToLandmark: options.ocr.mapToLandmark[idx][i],
                    value: value
                });
            }
            docOCR.push({
                docType: each,
                details: ocr
            });

            if (this.props.internalID.processStage === each) {
                currentOCR = ocr;
            }
        });

        this.setState({OCR: docOCR, currentOCR: currentOCR, OCRLoaded: true});
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
                                        value={this.props.currentID.originalIDProcessed ? this.state.selectedBackIDFlags : this.state.selectedFrontIDFlags}
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

            // repeat / first time mykadback
            if (this.props.currentID.internalIDs.length > 0) {
                // front ID
                if (this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                    this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);
                    if (this.state.passesCrop !== this.props.internalID.originalID!.passesCrop) {
                        console.log('refresh front');
                        this.props.refreshIDs(false);
                        if (this.state.passesCrop) {
                            this.props.createNewID(box, true);
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
                    if (this.state.passesCrop !== this.props.internalID.backID!.passesCrop) {
                        console.log('refresh back');
                        this.props.refreshIDs(true);
                        if (this.state.passesCrop) {
                            this.props.setIDBox(box, this.props.currentID.backID!.croppedImage!);
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
                if (this.props.internalID === undefined) {
                    this.props.createNewID(box, true);
                    this.props.saveDocumentType(0, this.state.singleDocumentType);
                    this.props.updateFrontIDFlags(this.state.selectedFrontIDFlags);

                    if (this.props.processType === ProcessType.SEGMENTATION) {
                        let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
                        if (internalID !== undefined && internalID.processStage === IDProcess.MYKAD_FRONT) {
                            this.props.saveToInternalID(internalID.originalID!, false);
                            this.props.loadImageState(internalID.backID!);
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                        } else {
                            this.props.saveToInternalID(internalID.originalID!, true);
                            this.loadNextID();
                        }
                    }
                } else if (this.props.internalID !== undefined && this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                    this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                }
            } else {
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
                    this.state.selectedFrontIDFlags.length > 0 || this.state.selectedBackIDFlags.length > 0
                    ?
                    (<Button variant="primary" className="block-button" id="segcheck-skip-btn"
                        onClick={this.props.currentID.originalIDProcessed ? this.loadNextID : this.loadNextID}>
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
                            let image: File = DatabaseUtil.dataURLtoFile('data:image/jpg;base64,' + res.data.encoded_img, res.data.filename);
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
            if (this.state.passesCrop) {
                this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
            } else {
                this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
            }
        }

        const getLandmarkFlags = () => {
            const setFlag = (selected: string[]) => {
                for (var i = 0; i < this.state.currentLandmarks.length; i++) {
                    if (this.state.currentLandmarks[i].name === this.state.selectedLandmark) {
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
                if (this.state.currentLandmarks[i].name === this.state.selectedLandmark) {
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
                this.props.updateLandmarkFlags(each.name, each.flags);
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
            let landmark = this.props.currentImage.landmark.find((item) => item.name === each.name && item.position !== undefined);
            if (landmark !== undefined) {
                name += "labelled-landmark ";
            }
            if (this.props.currentImage.currentSymbol === each.name) {
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
                                            onClick={() => setLandmark(each.name)}>
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
                {/* <Button
                    style={{width: "100%"}}
                    value="0"
                    className="block-button" 
                    onClick={() => this.setState({showAddLandmarkModal: true})}>+</Button> */}
                {/* <AddTypeModal showModal={this.state.showAddLandmarkModal} item='landmarks' add={addLandmark} closeModal={() => this.setState({showAddLandmarkModal: false})}/> */}
                <Button variant="secondary" className="common-button" onClick={backStage}>Back</Button>
                {/* SKIP_VALIDATION: comment out disabled attribute */}
                <Button className="common-button"
                    // disabled={this.props.currentImage.landmark.filter((each) => each.position === undefined).length > 0}
                    onClick={submitLandmark}>Done</Button>
            </div>
        );
    }

    ocrDetails = () => {
        let refs: {name: string, mapToLandmark: string, ref: any}[] = [];

        const handleSubmit = (e: any) => {
            e.preventDefault();

            let currentOCR = this.state.currentOCR;
            refs.forEach((each, idx) => {
                let ocr: OCRData = {
                    id: idx,
                    type: 'OCR',
                    name: each.name,
                    mapToLandmark: each.mapToLandmark,
                    labels: each.ref.value.split(' ').map((each: string, idx: number) => {
                        return {id: idx, value: each};
                    }),
                    count: each.ref.value.split(' ').length
                };
                
                if (currentOCR.find((ocr) => ocr.name === each.name)!.value !== each.ref.value) {
                    for (var i = 0; i < currentOCR.length; i++) {
                        if (currentOCR[i].name === each.name) {
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
                            <Form.Group key={each.name + "OCR"}>
                                <Form.Label>{DatabaseUtil.beautifyWord(each.name)}</Form.Label>
                                {/* SKIP_VALIDATION: Remove required */}
                                <Form.Control type="text" defaultValue={each.value} ref={(ref: any) => {refs.push({name: each.name, mapToLandmark: each.mapToLandmark,ref})}} />
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
            let ocrsLabelled = this.props.currentImage.ocr.find((ocr) => ocr.mapToLandmark === each.mapToLandmark && ocr.name === each.name);
            if (ocrsLabelled !== undefined) {
                ocrFilled = ocrsLabelled.labels.filter((label) => label.position === undefined).length === 0;
            }
            if (ocrFilled) {
                name += "labelled-landmark ";
            }
            if (this.props.currentImage.currentSymbol === each.name) {
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
        // validate();

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
                                            this.props.setCurrentSymbol(each.name, each.mapToLandmark);
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
                                                            this.props.setCurrentSymbol(each.name, each.mapToLandmark);
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
            if (this.props.internalID.documentType === 'MyKad') {
                this.props.loadImageState(this.props.internalID.backID!);
            }
            this.props.progressNextStage(CurrentStage.OCR_EDIT);
        }

        const submitLiveness = () => {
            this.props.updateVideoData(this.state.passesLiveness!, this.state.selectedVideoFlags);
            this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
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
        this.setState({loadedSegCheckImage: true}, () => this.props.loadImageState(this.props.internalID.backID!));
    }

    loadNextInternalId = () => {
        this.props.loadImageState(this.props.internalID.originalID!);
        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
    }

    loadNextID = () => {
        this.resetState();
        this.props.saveToLibrary(this.props.currentID);
        this.props.restoreID();
        this.props.restoreImage();
        this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        this.props.getNextID();
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

        return (
            <div id="controlPanel">
                {showIndex()}
                {controlFunctions()}
            </div>
        );
    }
}

const mapDispatchToProps = {
    progressNextStage,
    getNextID,
    loadNextID,
    createNewID,
    setIDBox,
    deleteIDBox,
    saveCroppedImage,
    refreshIDs,
    saveDocumentType,
    saveSegCheck,
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
    saveToLibrary,
    restoreID,
    restoreImage,
};

const mapStateToProps = (state: AppState) => {
    return {
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