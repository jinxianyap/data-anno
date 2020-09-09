import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, IDProcess, ProcessType } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form, Modal, Button, ButtonGroup, ToggleButton, ToggleButtonGroup, Card, Accordion, Spinner } from 'react-bootstrap';
import options from '../../../options.json';
import './FacePanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState, InternalIDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox } from '../../../store/image/types';
import { progressNextStage, getPreviousID, getNextID, saveToLibrary } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, updateVideoData, restoreID, setIDFaceMatch } from '../../../store/id/actionCreators';
import { loadImageState, restoreImage } from '../../../store/image/actionCreators';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { GeneralUtil } from '../../../utils/GeneralUtil';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';
const axios = require('axios');

interface IProps {
    noMoreIDs: boolean;
    database: string;
    processType: ProcessType;
    currentStage: CurrentStage;
    currentIndex: number;
    totalIDs: number;
    currentID: IDState;
    indexedID: IDState;
    internalID: InternalIDState;
    currentImage: ImageState;

    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    getPreviousID: () => GeneralActionTypes;
    getNextID: () => GeneralActionTypes;
    loadImageState: (currentImage: ImageState, passesCrop?: boolean) => ImageActionTypes;
    loadNextID: (ID: IDState) => IDActionTypes;
    createNewID: (IDBox: IDBox, passesCrop?: boolean) => IDActionTypes;

    // Video Liveness & Match
    updateVideoData: (liveness: boolean, flags: string[]) => IDActionTypes;
    setIDFaceMatch: (match: boolean) => IDActionTypes;

    // Saving to store
    saveToLibrary: (id: IDState) => GeneralActionTypes;
    restoreID: () => IDActionTypes;
    restoreImage: () => ImageActionTypes;
}

interface IState {
    showSaveAndQuitModal: boolean;
    previous: boolean;

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

class FacePanel extends React.Component<IProps, IState> {

    docTypeRef: any = undefined;

    constructor(props: IProps) {
        super(props);
        this.state = {
            showSaveAndQuitModal: false,
            previous: false,
            videoFlagsLoaded: false,
            videoFlags: [],
            selectedVideoFlags: [],
            livenessValidation: false,
        }
    }

    componentDidUpdate(previousProps: IProps, previousState: IState) {
        if (this.props.noMoreIDs) this.props.progressNextStage(CurrentStage.OUTPUT);
        if (this.props.indexedID === undefined) return;
        if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK && !this.state.videoFlagsLoaded) {
            this.loadVideoFlags();
        }

        console.log(this.props.indexedID.sessionID);
        console.log(this.props.indexedID);
        if (previousProps.indexedID !== this.props.indexedID) {
            console.log('here');
            if (!this.props.indexedID.dataLoaded) {
                GeneralUtil.toggleOverlay(true);
                axios.post('/loadSessionData', {
                    database: this.props.database,
                    date: this.props.indexedID.dateCreated,
                    sessionID:  this.props.indexedID.sessionID
                }).then((res: any) => {
                    if (res.status === 200) {
                        DatabaseUtil.loadSessionData(res.data, this.props.indexedID).then((completeID) => {
                            this.props.loadNextID(completeID);
                            GeneralUtil.toggleOverlay(false);
                        });
                    }
                }).catch((err: any) => {
                    console.error(err);
                    // GeneralUtil.toggleOverlay(false);
                });
            } else {
                this.props.loadNextID(this.props.indexedID);
                GeneralUtil.toggleOverlay(false);
            }
            return;
        } else if (previousProps.currentID !== this.props.currentID) {
            if (this.props.currentID.selfieVideo!.name === 'notfound') {
                // new ID has no video
                if ((this.props.currentID.selfieImage!.name !== 'notfound' || this.props.currentID.videoStills!.length > 0)
                    && this.props.currentID.croppedFace!.name !== 'notfound') {
                    // new ID has no video but can do face comparison
                    this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                } else {
                    this.loadNextID(this.state.previous);
                }
            }
            return;
        }
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK && !this.state.videoFlagsLoaded) {
            this.loadVideoFlags();
        }
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
                    GeneralUtil.toggleOverlay(false);
                })
            }
        }).catch((err: any) => {
            console.error(err);
            GeneralUtil.toggleOverlay(false);
        });
    }


    loadVideoFlags = () => {
        let vidFlags: {category: string, flags: string[]}[] = [];
        options.flags.video.keys.forEach((each, idx) => {
            let flags = options.flags.video.values[idx];
            vidFlags.push({category: each, flags: flags});
        });
        this.setState({videoFlags: vidFlags, videoFlagsLoaded: true});
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
            
            this.props.updateVideoData(this.state.passesLiveness!, this.state.selectedVideoFlags);
        }

        const submitLiveness = () => {
            if ((this.props.currentID.videoStills!.length > 0 || this.props.currentID.selfieImage!.name !== 'notfound') 
                && this.props.currentID.croppedFace!.name !== 'notfound'){
                this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
            } else {
                this.setState({previous: false}, () => this.loadNextID(false));
            }
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
                <Button className="common-button" onClick={submitLiveness} 
                disabled={!this.state.livenessValidation}>
                    Done
                </Button>
            </div>
        )
    }

    frCompareCheck = () => {
        const submitFaceCompareResults = () => {
            this.resetState();
            this.loadNextID(false);
        }

        return (
            <div>
                <Card className="individual-card">
                    <Card.Title>Match</Card.Title>
                    <Card.Body>
                        <ToggleButtonGroup type="radio" name="passessFRMatchButtons" style={{display: "block", width: "100%"}}
                            value={this.props.currentImage.faceCompareMatch} onChange={(val) => this.props.setIDFaceMatch(val)}>
                            <ToggleButton variant="light" className="common-button" value={false}>No Match</ToggleButton>
                            <ToggleButton variant="light" className="common-button" value={true}>Match</ToggleButton>
                        </ToggleButtonGroup>
                    </Card.Body>
                </Card>
                {
                    this.props.currentID.selfieVideo!.name !== 'notfound' ?
                    <Button variant="secondary" className="common-button" onClick={() => this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK)}>
                        Back
                    </Button>
                    : <div />
                }
                <Button className="common-button" onClick={submitFaceCompareResults} disabled={this.props.currentID.faceCompareMatch === undefined}>
                    Done
                </Button>
            </div>
        );
    }

    loadNextID = (prev: boolean) => {
        this.resetState();
        this.props.saveToLibrary(this.props.currentID);
        this.props.restoreID();
        this.props.restoreImage();
        this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
        if (prev) {
            this.props.getPreviousID();
        } else {
            this.props.getNextID();
        }
    }

    resetState = () => {
        this.setState({
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

        const navigateIDs = () => {
            // const handleClick = (prev: boolean) => {
                // switch (this.props.currentStage) {
                //     case (CurrentStage.LANDMARK_EDIT): {
                //         this.state.currentLandmarks.forEach((each) => {
                //             this.props.updateLandmarkFlags(each.name, each.flags);
                //         });
                //         this.props.saveToInternalID(this.props.currentImage, this.props.internalID.processStage !== IDProcess.MYKAD_FRONT);
                //         break;
                //     }
                //     case (CurrentStage.OCR_DETAILS): {

                //     }
                // }
                // need to save state first?
                // this.loadNextID(prev);
            // }

            const saveAndQuit = () => {
                this.props.saveToLibrary(this.props.currentID);
                this.setState({showSaveAndQuitModal: false}, () => this.props.progressNextStage(CurrentStage.OUTPUT));
            }

            return (
                <div id="folder-number">
                    <Button variant="light" 
                        onClick={() => this.setState({previous: true}, () => this.loadNextID(true))}
                        disabled={this.props.currentIndex === 0} 
                        className="nav-button"><GrFormPrevious /></Button>
                    <p>Folder:   {this.props.currentIndex + 1}/{this.props.totalIDs}</p>
                    <Button variant="light" 
                        onClick={() => this.setState({previous: false}, () => this.loadNextID(false))}
                        disabled={this.props.currentIndex + 1 === this.props.totalIDs}
                        className="nav-button"><GrFormNext /></Button>
                    <Button variant="secondary" id="quit-button" onClick={() => this.setState({showSaveAndQuitModal: true})}>Quit</Button>
                    <Modal show={this.state.showSaveAndQuitModal} onHide={() => this.setState({showSaveAndQuitModal: false})}>
                        <Modal.Header closeButton>
                        <Modal.Title>Save And Quit</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>Are you sure you would like to proceed?</Modal.Body>
                        <Modal.Footer>
                        <Button variant="secondary" onClick={() => this.setState({showSaveAndQuitModal: false})}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={saveAndQuit}>
                            Confirm
                        </Button>
                        </Modal.Footer>
                    </Modal>
                </div>
            );
        }

        return (
            <div style={{height: "100%"}}>
                {navigateIDs()}
                <div id="facePanel">
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
    loadNextID,
    createNewID,
    loadImageState,
    updateVideoData,
    setIDFaceMatch,
    saveToLibrary,
    restoreID,
    restoreImage,
};

const mapStateToProps = (state: AppState) => {
    return {
        noMoreIDs: state.general.currentIndex === state.general.IDLibrary.length,
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
)(FacePanel);