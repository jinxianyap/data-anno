import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState, InternalIDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox, OCRData, OCRWord } from '../../../store/image/types';
import { progressNextStage, getNextID, saveToLibrary } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, setIDBox, deleteIDBox, refreshIDs, saveDocumentType, updateVideoData, saveToInternalID, restoreID } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, setCurrentSymbol, setCurrentWord, updateLandmarkFlags, addOCRData, setFaceCompareMatch, restoreImage } from '../../../store/image/actionCreators';
import AddTypeModal from '../AddTypeModal/AddTypeModal';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';

var fs = require('browserify-fs');

interface IProps {
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
    createNewID: (IDBox: IDBox, croppedImage: File) => IDActionTypes;
    setIDBox: (IDBox: IDBox, croppedImage?: File) => IDActionTypes;
    deleteIDBox: (index: number) => IDActionTypes;
    refreshIDs: (originalProcessed: boolean) => IDActionTypes;
    saveDocumentType: (internalIndex: number, documentType: string) => IDActionTypes;
    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;

    // Landmark
    setCurrentSymbol: (symbol?: string, landmark?: string) => ImageActionTypes;
    updateLandmarkFlags: (name: string, flags: string[]) => ImageActionTypes;

    // OCR
    setCurrentWord: (word: OCRWord) => ImageActionTypes;
    addOCRData: (ocr: OCRData) => ImageActionTypes;

    // Video Liveness & Match
    updateVideoData: (liveness: boolean, flags: string[]) => IDActionTypes;
    setFaceCompareMatch: (match: boolean) => ImageActionTypes;

    // Saving to store
    saveToInternalID: (imageState: ImageState) => IDActionTypes;
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
    passesCrop: boolean;
    cropDirty: boolean;

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
            passesCrop: false,
            cropDirty: false,

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
                if (previousProps.indexedID.index !== this.props.indexedID.index) {
                    this.props.loadNextID(this.props.indexedID);
                    break;
                }
                if (this.state.documentTypes.length === 0) this.loadDocumentTypes();
                if (!this.state.loadedSegCheckImage) {
                    this.loadSegCheckImage();
                    this.setState({loadedSegCheckImage: true});
                    break;
                }
                if (previousProps.internalID === undefined && this.props.internalID !== undefined) {
                    this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                    this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                    break;
                }
                if (!this.props.currentID.originalIDProcessed && this.props.currentID.internalIDs.length > 0) {
                    this.props.refreshIDs(false);
                } else if (this.props.currentID.originalIDProcessed && this.props.currentID.internalIDs.filter((each) => each.backID!.IDBox !== undefined).length > 0) {
                    this.props.refreshIDs(true);
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
                    let criterion = '';
                    if (this.props.internalID.documentType === "MyKad") {
                        criterion = (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) ? 'MyKadFront' : 'MyKadBack';
                    } else {
                        criterion = this.props.internalID.documentType!;
                    }
                    this.state.landmarks.forEach((each) => {
                        if (each.docType === criterion && each.landmarks !== this.state.currentLandmarks) {
                            this.setState({currentLandmarks: each.landmarks});
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
                        if (each.docType === this.props.internalID.documentType && each.details !== this.state.currentOCR) {
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
                if (previousProps.internalID && 
                    (previousProps.internalID.originalID!.faceCompareMatch !== undefined || previousProps.internalID.backID!.faceCompareMatch !== undefined)) {
                    if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
                        console.log('next id');
                        this.loadNextID();
                    } else if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
                        if (this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                            console.log('back id');
                            this.loadBackId();
                        } else {
                            console.log('next internal id');
                            this.loadNextInternalId();
                        }
                    }
                }
            }
        }
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.SEGMENTATION_CHECK) {
            this.props.loadNextID(this.props.indexedID);
            this.loadDocumentTypes();
        }
    }

    handleCropFail = () => {
        this.setState({passesCrop: false, cropDirty: true});
    }

    handlePassesCrop = () => {
        this.setState({passesCrop: true, cropDirty: true});
    }

    loadSegCheckImage = () => {
        if (this.props.currentID.originalIDProcessed) {
            this.props.loadImageState(this.props.currentID.backID!);
        } else {
            this.props.loadImageState(this.props.currentID.originalID!);
        }
    }

    loadDocumentTypes = () => {
        this.setState({
            documentTypes: options.documentTypes,
            singleDocumentType: options.documentTypes[0]
        });
    }

    loadLandmarkData = () => {
        let criterion = '';
        if (this.props.internalID.documentType! === "MyKad") {
            criterion = (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) ? 'MyKadFront' : 'MyKadBack';
        } else {
            criterion = this.props.internalID.documentType!;
        }

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

            if (criterion === each) {
                currentLandmarks = landmarks;
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
    
    loadOCRDetails = () => {
        let docOCR: {docType: string, details: {name: string, mapToLandmark: string, value?: string}[]}[] = [];
        let currentOCR: {name: string, mapToLandmark: string, value?: string}[] = [];

        options.ocr.keys.forEach((each, idx) => {
            let ocr: {name: string, mapToLandmark: string, value?: string}[] = [];
            for (var i = 0; i < options.ocr.values[idx].length; i++) {
                ocr.push({
                    name: options.ocr.values[idx][i],
                    mapToLandmark: options.ocr.mapToLandmark[idx][i]
                });
            }
            docOCR.push({
                docType: each,
                details: ocr
            });

            if (this.props.internalID.documentType === each) {
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

        const addDocType = (doc: string) => {
            options.documentTypes.push(doc);
            options.landmark.keys.push(doc);
            options.landmark.values.push([]);
            options.ocr.keys.push(doc);
            options.ocr.values.push([]);
            fs.writeFile('../../../options.json', JSON.stringify(options));
            this.setState({showAddDocTypeModal: false}, () => this.loadDocumentTypes());
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

            if (this.state.passesCrop) {
                if (this.props.currentID.originalIDProcessed) {
                    this.props.setIDBox(box, this.props.currentID.backID!.image);
                    this.props.loadImageState(this.props.internalID.backID!, this.state.passesCrop);
                    this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                } else {
                    this.props.createNewID(box, this.props.currentID.originalID!.image);
                    this.props.saveDocumentType(0, this.state.singleDocumentType);
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
                        <Button onClick={() => {this.setState({showAddDocTypeModal: true})}} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button>
                        <Form.Control as="select" value={this.state.singleDocumentType} onChange={(e: any) => setSingleDocType(e)}>
                            {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
                        </Form.Control>
                    </Form.Group>
                }

                <AddTypeModal showModal={this.state.showAddDocTypeModal} item='documentTypes' add={addDocType} closeModal={() => this.setState({showAddDocTypeModal: false})}/>

                <Form.Group controlId="passesCrop">
                    <Form.Label>Cropping</Form.Label>
                    <ButtonGroup aria-label="passesCropButtons" style={{display: "block", width: "100%"}}>
                        <Button variant="secondary" className="common-button" onClick={this.handleCropFail} value="true">Fail</Button>
                        <Button variant="secondary" className="common-button" onClick={this.handlePassesCrop}>Pass</Button>
                    </ButtonGroup>
                </Form.Group>

                <Button type="submit" className="block-button" disabled={!this.state.cropDirty}>
                    Next
                </Button>
            </Form>
        )
    }

    segEdit = () => {
        const setDocType = (e: any, id: number) => {
            // if (this.state.landmarks.length === 0) {
            //     this.setState({selectedDocumentTypes: e.target.value});
            // } else {
            //     let landmarks = this.state.landmarks.find((each) => (each.docType === e.target.value))!;
            //     if (landmarks !== undefined) {
            //         this.setState({selectedDocumentTypes: e.target.value, currentLandmarks: landmarks.landmarks});
            //     } else {
            //         this.setState({selectedDocumentTypes: e.target.value});
            //     }
            // }
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
            submitDocTypes();
            if (this.props.internalID.processStage !== IDProcess.MYKAD_BACK) {
                this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
            } else {
                this.props.loadImageState(this.props.internalID.backID!, this.state.passesCrop);
            }
            this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
        }

        return (
            <div>
                <h5>Please draw bounding boxes around any number of IDs in the image.</h5>
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
                                                        <Button onClick={() => {this.setState({showAddDocTypeModal: true})}} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button>
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
                <Button disabled={this.props.currentID.internalIDs.length === 0}  className="common-button" onClick={loadImageAndProgress}>
                    Next
                </Button>
            </div>
        );
    }

    landmarkEdit = () => {
        const setLandmark = (item: string) => {
            this.setState({selectedLandmark: item}, () => this.props.setCurrentSymbol(item));
        }

        const addLandmark = (landmark: string) => {
            let index = 0;
            options.landmark.keys.forEach((each, idx) => {
                if (each === this.props.internalID.documentType) {
                    index = idx;
                }
            })
            options.landmark.values[index].push(landmark);
            fs.writeFile('../../../options.json', JSON.stringify(options));
            this.setState({showAddLandmarkModal: false}, this.loadLandmarkData);
        }

        const backStage = () => {
            if (this.state.passesCrop) {
                this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
            } else {
                this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
            }
        }

        const getLandmarkFlags = (flags: string[]) => {
            const setFlag = (flag: string) => {
                for (var i = 0; i < this.state.currentLandmarks.length; i++) {
                    if (this.state.currentLandmarks[i].name === this.state.selectedLandmark) {
                        let landmarks = this.state.currentLandmarks;
                        let landmark = landmarks[i];
                        if (!landmark.flags.includes(flag)) {
                            landmark.flags.push(flag);
                            landmarks[i] = landmark;
                            this.setState({currentLandmarks: landmarks});
                        }
                    }
                }
            }

            return (
                <div>
                    {
                        this.state.landmarkFlags.map((each, idx) => {
                            return (
                                    <div key={idx}>
                                        <p>{DatabaseUtil.beautifyWord(each.category)}</p>
                                        <ToggleButtonGroup type="checkbox">
                                            {each.flags.map((each, idx) => {
                                                return (
                                                    <ToggleButton
                                                        className="labelling-flags"
                                                        key={idx}
                                                        value={each}
                                                        variant="light"
                                                        checked={flags.includes(each)}
                                                        onClick={() => setFlag(each)}>
                                                        {each}
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
            if (this.props.internalID.documentType === "MyKad" && this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
                this.props.saveToInternalID(this.props.currentImage);
                this.props.progressNextStage(CurrentStage.END_STAGE);
            } else {
                this.props.progressNextStage(CurrentStage.OCR_DETAILS);
            }
        }

        const getClassName = (each: any) => {
            let name = "landmark-tab ";
            let landmark = this.props.currentImage.landmark.find((item) => item.name === each.name);
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
                                            {getLandmarkFlags(each.flags)}
                                        </Card.Body>
                                        </Accordion.Collapse>
                                    </Card>
                                );
                            })
                        }
                </Accordion>
                <Button
                    style={{width: "100%"}}
                    value="0"
                    className="block-button" 
                    onClick={() => this.setState({showAddLandmarkModal: true})}>+</Button>
                {/* <Button
                    style={{width: "100%"}}
                    value="0"
                    className="block-button" 
                    onClick={() => this.props.setCurrentSymbol()}>Pan</Button> */}
                <AddTypeModal showModal={this.state.showAddLandmarkModal} item='landmarks' add={addLandmark} closeModal={() => this.setState({showAddLandmarkModal: false})}/>
                <Button variant="secondary" className="common-button" onClick={backStage}>Back</Button>
                <Button className="common-button" onClick={submitLandmark}>Done</Button>
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
                    this.props.addOCRData(ocr);
                }
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
        // const setSymbol = (item: string) => {
        //     this.setState({selectedLandmark: item}, () => this.props.setCurrentSymbol(item));
        // }
        let ocrs = this.props.currentImage.ocr;

        const getClassNameLandmark = (each: any) => {
            if (this.props.currentImage.currentSymbol === each.name) {
                return "selected-landmark";
            }
            return "";
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
                                        {each.name}
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
            {/* <Button
                    style={{width: "100%"}}
                    value="0"
                    className="block-button" 
                    onClick={() => this.props.setCurrentSymbol()}>Pan</Button> */}
            <Button variant="secondary" className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.OCR_DETAILS)}>Back</Button>
            <Button className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK)}>Done</Button>
        </div>);
    }

    frLivenessCheck = () => {
        const setFlag = (flag: string) => {
            let selected = this.state.selectedVideoFlags;
            if (!selected.includes(flag)) {
                selected.push(flag);
            } else {
                selected.splice(selected.findIndex((each) => each === flag), 1);
            }
            this.setState({selectedVideoFlags: selected});
        }
    
        const validate = () => {
            if (this.state.passesLiveness) {
                this.setState({livenessValidation: true});
            }
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
                        <ButtonGroup aria-label="passesLivenessButtons" style={{display: "block", width: "100%"}}>
                            <Button variant="secondary" className="common-button"  onClick={() => this.setState({passesLiveness: false}, validate)} value="true">Fail</Button>
                            <Button variant="secondary" className="common-button"  onClick={() => this.setState({passesLiveness: true}, validate)} value="false">Pass</Button>
                        </ButtonGroup>
                    </Card.Body>
                </Card>

                <Card className="individual-card">
                    <Card.Title>Flags</Card.Title>
                    <Card.Body>
                        {
                            this.state.videoFlags.map((each, idx) => {
                                return (
                                    <div key={idx}>
                                        <p>{each.category}</p>
                                        <ToggleButtonGroup type="checkbox">
                                        {
                                            each.flags.map((flag, i) => {
                                                return (
                                                    <ToggleButton
                                                        className="video-flags"
                                                        key={i}
                                                        value={flag}
                                                        variant="light"
                                                        checked={this.state.selectedVideoFlags.includes(flag)}
                                                        onClick={() => setFlag(flag)}>
                                                        {flag}
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
                <Button variant="secondary" className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.OCR_EDIT)}>
                    Back
                </Button>
                <Button className="common-button" onClick={submitLiveness} disabled={!this.state.livenessValidation}>
                    Done
                </Button>
            </div>
        )
    }

    frCompareCheck = () => {
        const submitFaceCompareResults = () => {
            this.props.saveToInternalID(this.props.currentImage);
            this.props.progressNextStage(CurrentStage.END_STAGE);
        }

        return (
            <div>
                <Card className="individual-card">
                    <Card.Title>Match</Card.Title>
                    <Card.Body>
                        <ButtonGroup aria-label="passessFRMatchButtons" style={{display: "block", width: "100%"}}>
                            <Button variant="secondary" className="common-button" onClick={() => this.props.setFaceCompareMatch(false)} value="true">Fail</Button>
                            <Button variant="secondary" className="common-button" onClick={() => this.props.setFaceCompareMatch(true)} value="false">Pass</Button>
                        </ButtonGroup>
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
        this.props.loadImageState(this.props.internalID.backID!);

        this.setState({loadedSegCheckImage: false}, () => this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK));
    }

    loadNextInternalId = () => {
        this.resetState();
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
            passesCrop: false,
            cropDirty: false,

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
                            <p>{(this.props.currentID.internalIndex + 1).toString() + " of " + this.props.currentID.internalIDs.length.toString()}</p>
                        </div>
                    );
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
    refreshIDs,
    saveDocumentType,
    saveSegCheck,
    loadImageState,
    setCurrentSymbol,
    setCurrentWord,
    updateLandmarkFlags,
    addOCRData,
    updateVideoData,
    setFaceCompareMatch,
    saveToInternalID,
    saveToLibrary,
    restoreID,
    restoreImage,
};

const mapStateToProps = (state: AppState) => {
    return {
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