import React from 'react';
import { connect } from 'react-redux';
import './SessionDropdown.scss';
import { AppState } from '../../../store';
import { ButtonGroup, Button, Modal, ListGroup } from 'react-bootstrap';
import { GrFormPrevious, GrFormNext } from 'react-icons/gr';
import { IDState } from '../../../store/id/types';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { ProcessType, AnnotationStatus, CurrentStage } from '../../../utils/enums';

interface IProps {
    currentIndex: number,
    currentStage: CurrentStage,
    library: IDState[],
    database: string,
    startDate: Date,
    endDate: Date,
    showModal: boolean,
    processType: ProcessType,
    toggleModal: (show: boolean) => void,
    saveAndQuit: () => void,
    loadNextID: (prev: boolean, beforeSegCheckDone?: boolean) => void,
    loadSelectedID: (index: number, beforeSegCheckDone?: boolean) => void,
}

interface IState {
    showSessionsModal: boolean
}

class SessionDropdown extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            showSessionsModal: false
        }
        // this.overallStatus = {}
    }

    getSessionsModal = () => {
        const handleSessionClick = (idx: number, status: AnnotationStatus) => {
            if (status === AnnotationStatus.NOT_APPLICABLE) return;
            this.props.loadSelectedID(idx, this.props.currentStage === CurrentStage.SEGMENTATION_CHECK);
            this.setState({showSessionsModal: false});
        }

        return (
            <Modal show={this.state.showSessionsModal} onHide={() => this.setState({showSessionsModal: false})}>
                <Modal.Header closeButton>
                <Modal.Title>Sessions</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Database: {this.props.database}</p>
                    <p>Start Date: {DatabaseUtil.dateToString(this.props.startDate)}</p>
                    <p>End Date: {DatabaseUtil.dateToString(this.props.endDate)}</p>
                    <p>Sessions Loaded: {this.props.library.length}</p>
                    <ListGroup>
                        {
                            this.props.library.map((each, idx) => {
                                let status = DatabaseUtil.getOverallStatus(each.phasesChecked, each.annotationState, this.props.processType);
                                let variant = "dark";
                                if (status === AnnotationStatus.INCOMPLETE) variant = "primary";
                                if (status === AnnotationStatus.NOT_APPLICABLE) variant = "light";
                                return (
                                    <ListGroup.Item action={status!==AnnotationStatus.NOT_APPLICABLE} variant={variant} key={idx} 
                                    onClick={() => handleSessionClick(idx, status)}>
                                        {each.sessionID}
                                    </ListGroup.Item>
                                )
                            })
                        }
                    </ListGroup>
                </Modal.Body>
                <Modal.Footer>
                <Button variant="secondary" onClick={() => this.setState({showSessionsModal: false})}>
                    Cancel
                </Button>
                </Modal.Footer>
            </Modal>
        );
    }

    render() {
        return (
            <div id="folder-number">
                <ButtonGroup>
                    <Button variant="light" 
                        onClick={() => this.props.loadNextID(true, this.props.currentStage === CurrentStage.SEGMENTATION_CHECK)}
                        disabled={this.props.currentIndex === 0} 
                        className="nav-button"><GrFormPrevious /></Button>
                    <Button variant="light" onClick={() => this.setState({showSessionsModal: true})}>
                        Session:   {this.props.currentIndex + 1}/{this.props.library.length}</Button>
                    <Button variant="light" 
                        onClick={() => this.props.loadNextID(false, this.props.currentStage === CurrentStage.SEGMENTATION_CHECK)}
                        disabled={this.props.currentIndex + 1 === this.props.library.length}
                        className="nav-button"><GrFormNext /></Button>
                </ButtonGroup>
                <Button variant="secondary" id="quit-button" onClick={() => this.props.toggleModal(true)}>Quit</Button>
                <Modal show={this.props.showModal} onHide={() => this.props.toggleModal(false)}>
                    <Modal.Header closeButton>
                    <Modal.Title>Save And Quit</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>Are you sure you would like to quit?</Modal.Body>
                    <Modal.Footer>
                    <Button variant="secondary" onClick={() => this.props.toggleModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={this.props.saveAndQuit}>
                        Confirm
                    </Button>
                    </Modal.Footer>
                </Modal>
                {this.getSessionsModal()}
            </div>
        );
    }
}


const mapDispatchToProps = {
};

const mapStateToProps = (state: AppState, ownProps: any) => {
    return {
        currentIndex: state.general.currentIndex,
        currentStage: state.general.currentStage,
        library: state.general.IDLibrary,
        database: state.general.setupOptions.database,
        startDate: state.general.setupOptions.startDate,
        endDate: state.general.setupOptions.endDate,
        processType: state.general.setupOptions.processType,
        showModal: ownProps.showModal,
        toggleModal: ownProps.toggleModal,
        saveAndQuit: ownProps.saveAndQuit,
        loadNextID: ownProps.loadNextID,
        loadSelectedID: ownProps.loadSelectedID
    }
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SessionDropdown);