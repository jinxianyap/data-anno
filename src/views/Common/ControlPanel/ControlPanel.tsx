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
import { progressNextStage, getNextID } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, setIDBox, refreshIDs, saveDocumentType, updateVideoData, saveToInternalID, restoreID } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, setCurrentSymbol, setCurrentWord, updateLandmarkFlags, addOCRData, setFaceCompareMatch, restoreImage } from '../../../store/image/actionCreators';
import AddTypeModal from '../AddTypeModal/AddTypeModal';

var fs = require('browserify-fs');

interface IProps {
    currentStage: CurrentStage;
    currentID: IDState;
    indexedID: IDState;
    internalID: InternalIDState;
    currentImage: ImageState;

    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    getNextID: () => GeneralActionTypes;
    loadImageState: (currentImage: ImageState, passesCrop?: boolean) => ImageActionTypes;

    loadNextID: (ID: IDState) => IDActionTypes;
    createNewID: (IDBox: IDBox, croppedImage: File) => IDActionTypes;
    setIDBox: (IDBox: IDBox, croppedImage?: File) => IDActionTypes;
    refreshIDs: () => IDActionTypes;
    saveDocumentType: (internalIndex: number, documentType: string) => IDActionTypes;
    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;

    setCurrentSymbol: (symbol?: string, landmark?: string) => ImageActionTypes;
    updateLandmarkFlags: (name: string, flags: string[]) => ImageActionTypes;

    setCurrentWord: (word: OCRWord) => ImageActionTypes;
    addOCRData: (ocr: OCRData) => ImageActionTypes;

    updateVideoData: (liveness: boolean, flags: string[]) => IDActionTypes;
    setFaceCompareMatch: (match: boolean) => ImageActionTypes;

    saveToInternalID: (imageState: ImageState) => IDActionTypes;
    restoreID: () => IDActionTypes;
    restoreImage: () => ImageActionTypes;
}

interface IState {
    // ownStage: CurrentStage;
    // Seg Check
    loadedSegCheckImage: boolean;
    showAddDocTypeModal: boolean;
    documentTypes: string[];
    docType: string;
    passesCrop: boolean;
    cropDirty: boolean;
    segCheckValidation: boolean;

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
            docType: '',
            passesCrop: false,
            cropDirty: false,
            segCheckValidation: false,

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
                    this.props.refreshIDs();
                } else if (this.props.currentID.originalIDProcessed && this.props.currentID.internalIDs.filter((each) => each.backID!.IDBox !== undefined).length > 0) {
                    this.props.refreshIDs();
                }
                break;
            }
            case (CurrentStage.LANDMARK_EDIT): {
                if (this.props.internalID === undefined) return;
                if (!this.state.landmarksLoaded) {
                    this.loadLandmarkData();
                } else {
                    let criterion = '';
                    if (this.state.docType === "MyKad") {
                        criterion = (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) ? 'MyKadFront' : 'MyKadBack';
                    } else {
                        criterion = this.state.docType;
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
                };
                break;
            }
            case (CurrentStage.FR_LIVENESS_CHECK): {
                if (!this.state.videoFlagsLoaded) {
                    this.loadVideoFlags();
                };
                break;
            }
            // case (CurrentStage.FR_COMPARE_CHECK): {
            //     if (previousProps.internalID && 
            //         (previousProps.internalID.originalID!.faceCompareMatch !== undefined || previousProps.internalID.backID!.faceCompareMatch !== undefined)) {
            //         if (this.props.currentID.internalIndex >= this.props.currentID.internalIDs.length) {
            //             this.loadNextID();
            //         } else if (this.props.currentID.internalIndex < this.props.currentID.internalIDs.length) {
            //             if (this.props.internalID.processStage === IDProcess.MYKAD_BACK) {
            //                 this.loadBackId();
            //             } else {
            //                 this.loadNextInternalId();
            //             }
            //         }
            //     }
            // }
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
        this.setState({passesCrop: false, cropDirty: true}, this.validate);
    }

    handlePassesCrop = () => {
        this.setState({passesCrop: true, cropDirty: true}, this.validate);
    }

    validate = () => {
        if (this.state.cropDirty && this.state.docType !== '') {
            this.setState({segCheckValidation: true});
        }
    }

    loadSegCheckImage = () => {
        if (this.props.currentID.originalIDProcessed) {
            this.props.loadImageState(this.props.currentID.backID!);
        } else {
            this.props.loadImageState(this.props.currentID.originalID!);
        }
    }

    loadDocumentTypes = (doc?: string) => {
        this.setState({
            documentTypes: options.documentTypes,
            docType: doc ? doc : options.documentTypes[0]
        });
    }

    loadLandmarkData = () => {
        let criterion = '';
        if (this.state.docType === "MyKad") {
            criterion = (this.props.internalID.processStage === IDProcess.MYKAD_FRONT) ? 'MyKadFront' : 'MyKadBack';
        } else {
            criterion = this.state.docType;
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

            if (this.state.docType === each) {
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
        const addDocType = (doc: string) => {
            options.documentTypes.push(doc);
            options.landmark.keys.push(doc);
            options.landmark.values.push([]);
            options.ocr.keys.push(doc);
            options.ocr.values.push([]);
            fs.writeFile('../../../options.json', JSON.stringify(options));
            this.setState({showAddDocTypeModal: false}, () => this.loadDocumentTypes(doc));
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
                    this.props.saveDocumentType(0, this.state.docType);
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
                        <Form.Control as="select" value={this.state.docType} onChange={(e: any) => this.setDocType(e)}>
                            {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
                        </Form.Control>
                    </Form.Group>
                }

                <AddTypeModal showModal={this.state.showAddDocTypeModal} item='documentTypes' add={addDocType} closeModal={() => this.setState({showAddDocTypeModal: false})}/>

                <Form.Group controlId="passesCrop">
                    <Form.Label>Cropping</Form.Label>
                    <ButtonGroup aria-label="passesCropButtons" style={{display: "block", width: "100%"}}>
                        <Button variant="secondary" onClick={this.handleCropFail} value="true">Fail</Button>
                        <Button variant="secondary" onClick={this.handlePassesCrop}>Pass</Button>
                    </ButtonGroup>
                </Form.Group>

                <Button type="submit" disabled={!this.state.segCheckValidation}>
                    Next
                </Button>
            </Form>
        )
    }

    setDocType = (e: any) => {
        if (this.state.landmarks.length === 0) {
            this.setState({docType: e.target.value});
        } else {
            let landmarks = this.state.landmarks.find((each) => (each.docType === e.target.value))!;
            if (landmarks !== undefined) {
                this.setState({docType: e.target.value, currentLandmarks: landmarks.landmarks});
            } else {
                this.setState({docType: e.target.value});
            }
        }
    }

    segEdit = () => {
        const backStage = () => {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }

        const submitDocType = (e: any, idx: number) => {
            e.preventDefault();
            this.props.saveDocumentType(idx, this.state.docType);
        }

        return (
            <div>
                <h5>Please draw bounding boxes around any number of IDs in the image.</h5>
                <h6>Boxes Drawn</h6>
                    <Accordion>
                        {
                            this.props.currentID.internalIDs.map((id, idx) => {
                                let box = this.props.currentID.originalIDProcessed ? id.backID!.IDBox : id.originalID!.IDBox;
                                if (box === undefined) return;
                                return (
                                    <Card key={idx}>
                                        <Accordion.Toggle
                                            as={Card.Header}
                                            eventKey={idx.toString()}>
                                                Box {(box.id + 1).toString()}
                                        </Accordion.Toggle>
                                        <Accordion.Collapse eventKey={idx.toString()}>
                                        <Card.Body>
                                            <Form.Group controlId="docType">
                                                <Form.Label>Document Type</Form.Label>
                                                <Button onClick={() => {this.setState({showAddDocTypeModal: true})}} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button>
                                                <Form.Control as="select" value={this.state.docType} onChange={(e: any) => this.setDocType(e)}>
                                                    {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
                                                </Form.Control>
                                            </Form.Group>
                                            <Button onClick={(e: any) => submitDocType(e, idx)}>Submit</Button>
                                        </Card.Body>
                                        </Accordion.Collapse>
                                    </Card>
                                );
                            })
                        }
                    </Accordion>
                {/* <Button variant="secondary" style={{width: '100%'}} onClick={() => this.props.deleteIDBox(-1)}>Undo Box</Button> */}
                <Button variant="secondary" onClick={backStage}>Back</Button>
                <Button disabled={this.props.currentID.internalIDs.length === 0} onClick={() => {
                    this.props.loadImageState(this.props.internalID.originalID!, this.state.passesCrop);
                    this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
                }}>
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
                if (each === this.state.docType) {
                    index = idx;
                }
            })
            options.landmark.values[index].push(landmark);
            // console.log(options);
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
                                        <p>{each.category}</p>
                                        <ToggleButtonGroup type="checkbox">
                                            {each.flags.map((each, idx) => {
                                                return (
                                                    <ToggleButton
                                                        className="labelling-flags"
                                                        key={idx}
                                                        value={each}
                                                        variant="secondary"
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
            if (this.props.currentID.originalIDProcessed) {
                this.props.saveToInternalID(this.props.currentImage);
                this.props.progressNextStage(CurrentStage.END_STAGE);
                // this.loadNextInternalId();
            } else {
                this.props.progressNextStage(CurrentStage.OCR_DETAILS);
            }
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
                                            className={this.props.currentImage.landmark.find((item) => item.name === each.name) !== undefined
                                                ? 'labelled-landmark' : ''}
                                            key={idx}
                                            onClick={() => setLandmark(each.name)}>
                                                {each.name}
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
                    onClick={() => this.setState({showAddLandmarkModal: true})}>+</Button>
                <Button
                    style={{width: "100%"}}
                    value="0"
                    onClick={() => this.props.setCurrentSymbol()}>Pan</Button>
                <AddTypeModal showModal={this.state.showAddLandmarkModal} item='landmarks' add={addLandmark} closeModal={() => this.setState({showAddLandmarkModal: false})}/>
                <Button variant="secondary" onClick={backStage}>Back</Button>
                <Button onClick={submitLandmark}>Done</Button>
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
                                <Form.Label>{each.name}</Form.Label>
                                <Form.Control type="text" defaultValue={each.value} ref={(ref: any) => {refs.push({name: each.name, mapToLandmark: each.mapToLandmark,ref})}} />
                            </Form.Group>
                        );
                    })
                }
                <Button variant="secondary" onClick={() => this.props.progressNextStage(CurrentStage.LANDMARK_EDIT)}>
                    Back
                </Button>
                <Button variant="primary" type="submit">
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

        return (
            <div>
                <Accordion>
                    {
                        ocrs.map((each, index) => {
                            if (each.count <= 1) return <div key={index} />;
                            return (
                                <Card key={index}>
                                    <Accordion.Toggle as={Card.Header} eventKey={index.toString()} key={index} onClick={() => this.props.setCurrentSymbol(each.name, each.mapToLandmark)}>
                                        {each.name}
                                    </Accordion.Toggle>
                                    <Accordion.Collapse eventKey={index.toString()}>
                                    <Card.Body>
                                    <ButtonGroup vertical>
                                        {
                                            each.labels.map((label, idx) => {
                                                return (
                                                    <Button 
                                                        className={label.position !== undefined ? "ocr-details" : ""}
                                                        variant="secondary"
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
            <Button
                    style={{width: "100%"}}
                    value="0"
                    onClick={() => this.props.setCurrentSymbol()}>Pan</Button>
            <Button variant="secondary" onClick={() => this.props.progressNextStage(CurrentStage.OCR_DETAILS)}>Back</Button>
            <Button onClick={() => this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK)}>Done</Button>
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
                <Card>
                    <Card.Title>Liveness</Card.Title>
                    <Card.Body>
                        <ButtonGroup aria-label="passesLivenessButtons" style={{display: "block", width: "100%"}}>
                            <Button variant="secondary" onClick={() => this.setState({passesLiveness: false}, validate)} value="true">Fail</Button>
                            <Button variant="secondary" onClick={() => this.setState({passesLiveness: true}, validate)} value="false">Pass</Button>
                        </ButtonGroup>
                    </Card.Body>
                </Card>

                    <Card>
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
                                                            variant="secondary"
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
                    <Button variant="secondary" onClick={() => this.props.progressNextStage(CurrentStage.OCR_EDIT)}>
                        Back
                    </Button>
                    <Button onClick={submitLiveness} disabled={!this.state.livenessValidation}>
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
                <Card>
                    <Card.Title>Match</Card.Title>
                    <Card.Body>
                        <ButtonGroup aria-label="passessFRMatchButtons" style={{display: "block", width: "100%"}}>
                            <Button variant="secondary" onClick={() => this.props.setFaceCompareMatch(false)} value="true">Fail</Button>
                            <Button variant="secondary" onClick={() => this.props.setFaceCompareMatch(true)} value="false">Pass</Button>
                        </ButtonGroup>
                    </Card.Body>
                </Card>
                <Button variant="secondary" onClick={() => this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK)}>
                    Back
                </Button>
                <Button onClick={submitFaceCompareResults}>
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
            docType: '',
            passesCrop: false,
            cropDirty: false,
            segCheckValidation: false,

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