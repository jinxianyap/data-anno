import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Button, ButtonGroup } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState } from '../../../store/image/types';
import { progressNextStage, getNextID } from '../../../store/general/actionCreators';
import { loadNextID, saveDocumentType } from '../../../store/id/actionCreators';
import { saveSegCheck, loadImageState } from '../../../store/image/actionCreators';

interface IProps {
    currentStage: CurrentStage;
    currentID: IDState;
    currentImage: ImageState;

    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    getNextID: () => GeneralActionTypes;
    loadImageState: (currentImage: ImageState) => ImageActionTypes;

    loadNextID: (ID: IDState) => IDActionTypes;
    saveDocumentType: (documentType: string) => IDActionTypes;

    saveSegCheck: (passesCrop: boolean) => ImageActionTypes;
}

interface IState {
    // ownStage: CurrentStage;

    // Seg Check
    documentTypes: string[];
    docType: string;
    passesCrop: boolean;
    cropDirty: boolean;
    validation: boolean;
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
            validation: false
        }
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.SEGMENTATION_CHECK) {
            this.props.loadNextID(this.props.currentID);
            this.loadDocumentTypes();
        }
    }

    loadDocumentTypes = () => {
        this.setState({
            documentTypes: options.documentTypes,
            docType: options.documentTypes[0]
        });
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

    segCheckDone = (e: any) => {
        e.preventDefault();
        this.props.saveDocumentType(this.state.docType);
        this.props.saveSegCheck(this.state.passesCrop);

        if (this.state.passesCrop) {
            this.props.progressNextStage(CurrentStage.LANDMARK_EDIT);
        } else {
            this.loadSegEditImage();;
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

    // Seg Check Components
    segCheck = () => {
        return (
            <Form onSubmit={this.segCheckDone}>
                <Form.Group controlId="docType">
                    <Form.Label>Document Type</Form.Label>
                    <Form.Control as="select" value={this.state.docType} onChange={(e: any) => this.setState({docType: e.target.value})}>
                        {Object.entries(this.state.documentTypes).map(([key, value]) => <option value={value}>{value}</option>)}
                    </Form.Control>
                </Form.Group>

                <Form.Group controlId="passesCrop">
                    <Form.Label>Cropping</Form.Label>
                    <ButtonGroup aria-label="passesCropButtons">
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

    render() {

        const controlFunctions = () => {
            switch (this.props.currentStage) {
                case (CurrentStage.SEGMENTATION_CHECK): {
                    return this.segCheck();
                }
                case (CurrentStage.SEGMENTATION_EDIT): {
                    return this.segEdit();
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
    loadImageState
};

const mapStateToProps = (state: AppState) => {
    return {
        currentStage: state.general.currentStage,
        currentID: state.general.IDLibrary[state.general.currentIndex],
        currentImage: state.image
    }
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ControlPanel);