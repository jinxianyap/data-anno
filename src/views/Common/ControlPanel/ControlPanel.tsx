import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox, OCRData, OCRWord } from '../../../store/image/types';
import { progressNextStage, getNextID } from '../../../store/general/actionCreators';
import { loadNextID, saveDocumentType } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, addIDBox, setCurrentSymbol, setCurrentWord, updateLandmarkFlags, addOCRData } from '../../../store/image/actionCreators';
import AddTypeModal from '../AddTypeModal/AddTypeModal';

var fs = require('browserify-fs');

interface IProps {
    currentStage: CurrentStage;
    indexedID: IDState;
    currentID: IDState;
    currentImage: ImageState;

    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    getNextID: () => GeneralActionTypes;
    loadImageState: (currentImage: ImageState) => ImageActionTypes;

    loadNextID: (ID: IDState) => IDActionTypes;
    saveDocumentType: (documentType: string) => IDActionTypes;
    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;

    addIDBox: (box: IDBox, croppedID: File) => ImageActionTypes;

    setCurrentSymbol: (symbol?: string) => ImageActionTypes;
    updateLandmarkFlags: (index: number, name: string, flags: string[]) => ImageActionTypes;

    setCurrentWord: (word: OCRWord) => ImageActionTypes;
    addOCRData: (index: number, ocr: OCRData) => ImageActionTypes;
}

interface IState {
    // ownStage: CurrentStage;
    // Seg Check
    showAddDocTypeModal: boolean;
    documentTypes: string[];
    docType: string;
    passesCrop: boolean;
    cropDirty: boolean;
    validation: boolean;

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
            value?: string
        }[]
    }[];
    currentOCR: {
        name: string,
        value?: string
    }[];
}

class ControlPanel extends React.Component<IProps, IState> {

    docTypeRef: any = undefined;
    // keeps track of internal ID index
    index: number = 0;

    constructor(props: IProps) {
        super(props);
        this.state = {
            // ownStage: CurrentStage.SEGMENTATION_CHECK,
            showAddDocTypeModal: false,
            documentTypes: [],
            docType: '',
            passesCrop: false,
            cropDirty: false,
            validation: false,

            showAddLandmarkModal: false,
            landmarksLoaded: false,
            landmarks: [],
            currentLandmarks: [],
            landmarkFlags: [],
            selectedLandmark: '',

            showAddOCRModal: false,
            OCRLoaded: false,
            OCR: [],
            currentOCR: []
        }
    }

    componentDidUpdate() {
        switch (this.props.currentStage) {
            case (CurrentStage.LANDMARK_EDIT): {
                if (!this.state.landmarksLoaded) {
                    this.loadLandmarkData();
                }
                break;
            }
            case (CurrentStage.OCR_DETAILS): {
                if (!this.state.OCRLoaded) {
                    this.loadOCRDetails();
                }
                // let currentOCR = this.state.currentOCR;
                // if (currentOCR.length > 0 && currentOCR[0].value === undefined) {
                //     currentOCR.forEach((each) => {
                //         let ocrs = this.props.currentImage.ocr[this.index]
                //                         .find((ocr) => each.name === ocr.name);
        
                //         if (ocrs !== undefined) {
                //             each.value = ocrs.labels.map((label) => label.value)
                //                         .join(' ');
                //         } else {
                //             each.value = '';
                //         }
                //     });
                //     console.log(currentOCR);
                //     this.setState({currentOCR: currentOCR});
                // }
                break;
            }
        }
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.SEGMENTATION_CHECK) {
            this.props.loadNextID(this.props.indexedID);
            this.loadDocumentTypes();
        }
    }

    getInternalIndex() {
        for (var i = 0; i < this.props.currentImage.segEdit.internalIDProcessed.length; i++) {
            if (!this.props.currentImage.segEdit.internalIDProcessed) {
              this.index = i;
              break;
            }
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
            this.setState({validation: true});
        }
    }

    loadSegEditImage = () => {
        let process = this.props.currentID.processStage;
        if (process === IDProcess.MYKAD_BACK) {
            this.props.loadImageState(this.props.currentID.backID!);
        } else {
            this.props.loadImageState(this.props.currentID.originalID!);
            // console.log(this.props.currentID.originalID);
        }
    }

    loadLandmarkImage = () => {
        // only if seg check passes right away: need to call api to pull new cropped image, IDBox data and store inside seg edit
        this.props.loadImageState(this.props.currentID.originalID!);
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
        this.props.addIDBox(box, this.props.currentID.originalID!.image);
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
            criterion = (this.props.currentID.processStage === IDProcess.MYKAD_FRONT) ? 'MyKadFront' : 'MyKadBack';
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
        let docOCR: {docType: string, details: {name: string, value?: string}[]}[] = [];
        let currentOCR: {name: string, value?: string}[] = [];

        options.ocr.keys.forEach((each, idx) => {
            let ocr: {name: string, value?: string}[] = [];
            options.ocr.values[idx].forEach((each) => {
                ocr.push({
                    name: each
                });
            });
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

        const setDocType = (e: any) => {
            if (this.state.landmarks.length === 0) {
                this.setState({docType: e.target.value});
            } else {
                let landmarks = this.state.landmarks.find((each) => (each.docType === e.target.value))!.landmarks;
                this.setState({docType: e.target.value, currentLandmarks: landmarks});
            }
        }

        const submitSegCheck = (e: any) => {
            e.preventDefault();
            this.props.saveDocumentType(this.state.docType);
            this.props.saveSegCheck(this.state.passesCrop);

            if (this.state.passesCrop) {
                this.loadLandmarkImage();
                this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
            } else {
                this.loadSegEditImage();
                this.props.progressNextStage(CurrentStage.SEGMENTATION_EDIT);
            }
        }

        return (
            <Form onSubmit={submitSegCheck}>
                <Form.Group controlId="docType">
                    <Form.Label>Document Type</Form.Label>
                    <Button onClick={() => {console.log('click'); this.setState({showAddDocTypeModal: true})}} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button>
                    <Form.Control as="select" value={this.state.docType} onChange={(e: any) => setDocType(e)}>
                        {Object.entries(this.state.documentTypes).map(([key, value]) => <option key={key} value={value}>{value}</option>)}
                    </Form.Control>
                </Form.Group>

                <AddTypeModal showModal={this.state.showAddDocTypeModal} item='documentTypes' add={addDocType} closeModal={() => this.setState({showAddDocTypeModal: false})}/>

                <Form.Group controlId="passesCrop">
                    <Form.Label>Cropping</Form.Label>
                    <ButtonGroup aria-label="passesCropButtons" style={{display: "block", width: "100%"}}>
                        <Button variant="secondary" onClick={this.handleCropFail} value="true">Fail</Button>
                        <Button variant="secondary" onClick={this.handlePassesCrop}>Pass</Button>
                    </ButtonGroup>
                </Form.Group>

                <Button type="submit" disabled={!this.state.validation}>
                    Next
                </Button>
            </Form>
        )
    }

    segEdit = () => {
        const backStage = () => {
            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }

        return (
            <div>
                <h5>Please draw bounding boxes around any number of IDs in the image.</h5>
                <Button variant="secondary" onClick={backStage}>Back</Button>
                <Button disabled={this.props.currentImage.segEdit.IDBoxes.length === 0} onClick={() => this.props.progressNextStage(CurrentStage.LANDMARK_EDIT)}>
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
            console.log(options);
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
            this.getInternalIndex();

            this.state.currentLandmarks.forEach((each) => {
                this.props.updateLandmarkFlags(this.index, each.name, each.flags);
            }, this.props.progressNextStage(CurrentStage.OCR_DETAILS));
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
                                            className={this.props.currentImage.landmark[this.index].find((item) => item.name === each.name) !== undefined
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
        let refs: {name: string, ref: any}[] = [];

        refs.forEach((each) => {
            console.log(each.ref.value);
        })

        const handleSubmit = (e: any) => {
            e.preventDefault();
            this.getInternalIndex();

            let currentOCR = this.state.currentOCR;
            refs.forEach((each, idx) => {
                let ocr: OCRData = {
                    id: idx,
                    type: 'OCR',
                    name: each.name,
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
                    this.props.addOCRData(this.index, ocr);
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
                                <Form.Control type="text" defaultValue={each.value} ref={(ref: any) => {refs.push({name: each.name, ref})}} />
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
        let ocrs = this.props.currentImage.ocr[this.index];

        return (
            <div>
                <Accordion>
                    {
                        ocrs.map((each, index) => {
                            if (each.count <= 1) return <div/>;
                            return (
                                <Card key={index}>
                                    <Accordion.Toggle as={Card.Header} eventKey={index.toString()} key={index} onClick={() => this.props.setCurrentSymbol(each.name)}>
                                        {each.name}
                                    </Accordion.Toggle>
                                    <Accordion.Collapse eventKey={index.toString()}>
                                    <Card.Body>
                                    <ButtonGroup vertical>
                                        {
                                            each.labels.map((each, idx) => {
                                                return (
                                                    <Button 
                                                        className={each.position !== undefined ? "ocr-details" : ""}
                                                        variant="secondary"
                                                        // type="checkbox"
                                                        value={each.value}
                                                        onClick={() => this.props.setCurrentWord(each)}>{each.id}: {each.value}</Button>
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
                default: {
                    return <div />;
                }
            }
        }

        return (
            <div id="controlPanel">
                {controlFunctions()}
            </div>
        );
    }

}

const mapDispatchToProps = {
    progressNextStage,
    getNextID,
    loadNextID,
    saveDocumentType,
    saveSegCheck,
    addIDBox,
    loadImageState,
    setCurrentSymbol,
    setCurrentWord,
    updateLandmarkFlags,
    addOCRData
};

const mapStateToProps = (state: AppState) => {
    return {
        currentStage: state.general.currentStage,
        indexedID: state.general.IDLibrary[state.general.currentIndex],
        currentID: state.id,
        currentImage: state.image
    }
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ControlPanel);