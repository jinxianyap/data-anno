import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup, Modal } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox } from '../../../store/image/types';
import { progressNextStage, getNextID } from '../../../store/general/actionCreators';
import { loadNextID, saveDocumentType } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState, addIDBox } from '../../../store/image/actionCreators';

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
}

interface IState {
    // ownStage: CurrentStage;

    // Seg Check
    documentTypes: string[];
    docType: string;
    passesCrop: boolean;
    cropDirty: boolean;
    validation: boolean;

    landmarks: string[];
}

class ControlPanel extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            // ownStage: CurrentStage.SEGMENTATION_CHECK,
            documentTypes: [],
            docType: '',
            passesCrop: false,
            cropDirty: false,
            validation: false,

            landmarks: []
        }
    }

    componentDidUpdate() {
        switch (this.props.currentStage) {
            case (CurrentStage.LANDMARK_EDIT): {
                this.loadLandmarkNames();
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

    submitSegCheck = (e: any) => {
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

    segEditDone = () => {
        // e.preventDefault();
        this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
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
        // if seg check passes right away, need to call api to pull new cropped image, IDBox data and store inside seg edit
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

    loadLandmarkNames = () => {
        if (this.state.landmarks.length !== 0) return;
        switch (this.props.currentID.processStage) {
            case (IDProcess.MYKAD_FRONT): {
                this.setState({landmarks: options.landmark.MyKadFront});
                break;
            }
            case (IDProcess.MYKAD_BACK): {
                this.setState({landmarks: options.landmark.MyKadBack});
                break;
            }
            case (IDProcess.PASSPORT): {
                this.setState({landmarks: options.landmark.Passport});
                break;
            }
            default: {
                this.setState({landmarks: options.landmark.Passport});
            }
        }
    }

    // Seg Check Components
    segCheck = () => {

        // let showModal = false;

        const addDocType = () => {
            // showModal = true;
        }

        return (
            <Form onSubmit={this.submitSegCheck}>
                <Form.Group controlId="docType">
                    <Form.Label>Document Type</Form.Label>
                    <Button onClick={addDocType} style={{padding: "0 0.5rem", margin: "0.5rem 1rem"}}>+</Button>
                    <Form.Control as="select" value={this.state.docType} onChange={(e: any) => this.setState({docType: e.target.value})}>
                        {Object.entries(this.state.documentTypes).map(([key, value]) => <option value={value}>{value}</option>)}
                    </Form.Control>
                </Form.Group>

                {/* { showModal ?
                <Modal
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    >
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">
                        Modal heading
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <h4>Centered Modal</h4>
                        <p>
                        Cras mattis consectetur purus sit amet fermentum. Cras justo odio,
                        dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta ac
                        consectetur ac, vestibulum at eros.
                        </p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={() => {showModal = false;}}>Close</Button>
                    </Modal.Footer>
                    </Modal> : <div />
                } */}

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

        return (
            <div>
                <h5>Please draw bounding boxes around any number of IDs in the image.</h5>
                <Button disabled={this.props.currentImage.segEdit.IDBoxes.length === 0} onClick={this.segEditDone}>
                    Next
                </Button>
            </div>
        );
    }

    landmarkEdit = () => {
        console.log(this.state.landmarks);
        if (this.state.landmarks.length === 0) {
            return <p>No associated landmarks</p>;
        }

        return (
            <ButtonGroup vertical style={{width: "100%"}}>
                {
                    this.state.landmarks.map((each) => {
                        return (
                            <Button>{each}</Button>
                        );
                    })
                }
            </ButtonGroup>
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
    loadImageState
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