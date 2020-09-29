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
    startDate?: Date,
    endDate?: Date,
    showModal: boolean,
    processType: ProcessType,
    sortedList: {ID: IDState, libIndex: number, status: AnnotationStatus}[],
    sortedIndex: number, 
    toggleModal: (show: boolean) => void,
    saveAndQuit: () => void,
    handleGetSession: (libIndex: number, sortedIndex: number, status: AnnotationStatus) => void;
}

interface IState {
    showSessionsModal: boolean, 
}

class SessionDropdown extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            showSessionsModal: false,
        }
    }

    getSessionsModal = () => {
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
                    <ListGroup className="session-list" key={this.props.sortedList.map((each) => each.libIndex).join('')}>
                        {
                            this.props.sortedList.map((each, idx) => {
                                let variant = "dark";
                                if (each.status === AnnotationStatus.INCOMPLETE) variant = "primary";
                                if (each.status === AnnotationStatus.NOT_APPLICABLE) variant = "light";
                                let itemClass = this.props.currentIndex === each.libIndex ? "current-item" : "";
                                return (
                                    <ListGroup.Item action={each.status !== AnnotationStatus.NOT_APPLICABLE} variant={variant} key={this.props.sortedIndex + '' + idx} 
                                    onClick={() => this.setState({showSessionsModal: false}, () => this.props.handleGetSession(each.libIndex, idx, each.status))} className={itemClass}>
                                        {each.ID.index + 1}: {each.ID.sessionID}
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
        const loadNextID = (prev: boolean) => {
            let sortedIndex = this.props.sortedList.findIndex((each) => each.ID.index === this.props.currentIndex);
            if (sortedIndex === undefined || sortedIndex === -1) return;
            let sortedEntry = this.props.sortedList[prev ? sortedIndex - 1 : sortedIndex + 1];
            if (sortedEntry === undefined) return;
            this.props.handleGetSession(sortedEntry.libIndex, prev ? sortedIndex - 1 : sortedIndex + 1, sortedEntry.status);
        }
        const sessionStatus = this.props.sortedList[this.props.sortedIndex] !== undefined ? this.props.sortedList[this.props.sortedIndex].status : "";
        const maxIndex = this.props.sortedList.filter((each) => each.status !== AnnotationStatus.NOT_APPLICABLE).length;

        return (
            <div id="folder-number">
                <ButtonGroup>
                    <Button variant="light" 
                        onClick={() => loadNextID(true)}
                        disabled={this.props.sortedIndex === 0} 
                        className="nav-button"><GrFormPrevious /></Button>
                    <Button id="sessions-btn" className={sessionStatus} variant="light" onClick={() => this.setState({showSessionsModal: true})}>
                        Session   {this.props.currentIndex + 1} / {this.props.library.length}</Button>
                    <Button variant="light" 
                        onClick={() => loadNextID(false)}
                        disabled={this.props.sortedIndex + 1 === maxIndex}
                        className="nav-button"><GrFormNext /></Button>
                </ButtonGroup>
                <Button variant="secondary" id="quit-button" onClick={() => this.props.toggleModal(true)}>Quit</Button>
                <Modal show={this.props.showModal} onHide={() => this.props.toggleModal(false)}>
                    <Modal.Header closeButton>
                    <Modal.Title>Save And Quit</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>Are you sure you would like to quit? 
                        The current session being edited will not be saved.</Modal.Body>
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
        handleGetSession: ownProps.handleGetSession,
        sortedList: ownProps.sortedList,
        sortedIndex: ownProps.sortedIndex,
    }
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SessionDropdown);