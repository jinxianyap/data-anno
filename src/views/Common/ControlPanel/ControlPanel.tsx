import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox } from '../../../store/image/types';
import { progressNextStage, getNextID } from '../../../store/general/actionCreators';
import { loadNextID, saveDocumentType } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, addIDBox, setCurrentLandmark, updateLandmarkFlags } from '../../../store/image/actionCreators';
import AddTypeModal from '../AddTypeModal/AddTypeModal';

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

    setCurrentLandmark: (landmark: string) => ImageActionTypes;
    updateLandmarkFlags: (index: number, name: string, flags: string[]) => ImageActionTypes;
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
    landmarks: {
        name: string,
        flags: string[]
    }[];
    landmarkFlags: string[];
    selectedLandmark: string;
}

class ControlPanel extends React.Component<IProps, IState> {

    docTypeRef: any = undefined;

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
            landmarks: [],
            landmarkFlags: [],
            selectedLandmark: '',
        }
    }

    componentDidUpdate() {
        switch (this.props.currentStage) {
            case (CurrentStage.LANDMARK_EDIT): {
                this.loadLandmarkData(false);
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

    loadDocumentTypes = () => {
        this.setState({
            documentTypes: options.documentTypes,
            docType: options.documentTypes[0]
        });
    }

    loadLandmarkData = (reload: boolean) => {
        if (this.state.landmarks.length !== 0 && !reload) return;
        switch (this.props.currentID.processStage) {
            case (IDProcess.MYKAD_FRONT): {
                options.landmark.MyKadFront.forEach((each) => {
                    this.state.landmarks.push({
                        name: each,
                        flags: []
                    });
                });
                this.setState({
                    landmarkFlags: options.flags.landmark.quality
                });
                break;
            }
            case (IDProcess.MYKAD_BACK): {
                options.landmark.MyKadBack.forEach((each) => {
                    this.state.landmarks.push({
                        name: each,
                        flags: []
                    });
                });
                this.setState({
                    landmarkFlags: options.flags.landmark.quality
                });
                break;
            }
            case (IDProcess.PASSPORT): {
                options.landmark.Passport.forEach((each) => {
                    this.state.landmarks.push({
                        name: each,
                        flags: []
                    });
                });
                this.setState({
                    landmarkFlags: options.flags.landmark.quality
                });
                break;
            }
            default: {
                options.landmark.Passport.forEach((each) => {
                    this.state.landmarks.push({
                        name: each,
                        flags: []
                    });
                });
                this.setState({
                    landmarkFlags: options.flags.landmark.quality
                });
            }
        }
    }

    // Seg Check Components
    segCheck = () => {
        const addDocType = (doc: string) => {
            options.documentTypes.push(doc);
            this.setState({showAddDocTypeModal: false}, this.loadDocumentTypes);
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
                    <Form.Control as="select" value={this.state.docType} onChange={(e: any) => this.setState({docType: e.target.value})}>
                        {Object.entries(this.state.documentTypes).map(([key, value]) => <option value={value}>{value}</option>)}
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
        if (this.state.landmarks.length === 0) {
            return <p>No associated landmarks</p>;
        }

        const setLandmark = (item: string) => {
            this.setState({selectedLandmark: item}, () => this.props.setCurrentLandmark(item));
        }

        const addLandmark = (landmark: string) => {

            // switch (this.state.docType) {
            //     case 'MyKad': {
            //         if (this.props.currentID.processStage === IDProcess.MYKAD_FRONT) {
            //             options.landmark.MyKadFront.push(landmark);
            //         } else {
            //             options.landmark.MyKadBack.push(landmark);
            //         }
            //         break;
            //     }
            //     case 'Passport': {
            //         options.landmark.Passport.push(landmark);
            //         break;
            //     }
            //     default: {
            //         options.landmark[this.state.docType] = [];
            //         options.landmark[this.state.docType.push(landmark);
            //     }
            // }

            // options.landmark['documentTypes'].push(landmark);
            // console.log(options.landmark);
            // this.setState({showAddLandmarkModal: false}, () => this.loadLandmarkNames(true));

            // api call to post changes
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
                for (var i = 0; i < this.state.landmarks.length; i++) {
                    if (this.state.landmarks[i].name === this.state.selectedLandmark) {
                        let landmarks = this.state.landmarks;
                        let landmark = landmarks[i];
                        if (!landmark.flags.includes(flag)) {
                            landmark.flags.push(flag);
                            landmarks[i] = landmark;
                            this.setState({landmarks: landmarks});
                        }
                    }
                }
            }

            return (
                <ToggleButtonGroup type="checkbox">
                    {
                        this.state.landmarkFlags.map((each, idx) => {
                            return (
                                    <ToggleButton
                                        value={each}
                                        checked={flags.includes(each)}
                                        onClick={() => setFlag(each)}>
                                        {each}
                                    </ToggleButton>
                            );
                        })
                    }
                </ToggleButtonGroup>
            );            
        }

        const submitLandmark = (e: any) => {
            e.preventDefault();
            let index = 0;
            for (var i = 0; i < this.props.currentImage.segEdit.internalIDProcessed.length; i++) {
                if (!this.props.currentImage.segEdit.internalIDProcessed) {
                  index = i;
                  break;
                }
            }

            this.state.landmarks.forEach((each) => {
                this.props.updateLandmarkFlags(index, each.name, each.flags);
            }, this.props.progressNextStage(CurrentStage.OCR_EDIT));
        }

        return (
                <div>
                    <Accordion>
                        {
                            this.state.landmarks.map((each, idx) => {
                                return (
                                    <Card>
                                        <Accordion.Toggle as={Card.Header} eventKey={idx.toString()} onClick={() => setLandmark(each.name)}>
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
                <AddTypeModal showModal={this.state.showAddLandmarkModal} item='landmarks' add={addLandmark} closeModal={() => this.setState({showAddLandmarkModal: false})}/>
                <Button variant="secondary" onClick={backStage}>Back</Button>
                <Button onClick={submitLandmark}>Done</Button>
            </div>
        );
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
    setCurrentLandmark,
    updateLandmarkFlags
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