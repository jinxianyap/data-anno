import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage, ProcessType, AnnotationStatus } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Button, ToggleButton, ToggleButtonGroup, Card } from 'react-bootstrap';
import options from '../../../options.json';
import './FacePanel.scss';
import { GeneralActionTypes } from '../../../store/general/types';
import { IDActionTypes, IDState, InternalIDState } from '../../../store/id/types';
import { ImageActionTypes, ImageState, IDBox } from '../../../store/image/types';
import { progressNextStage, getPreviousID, getNextID, getSelectedID, saveToLibrary } from '../../../store/general/actionCreators';
import { loadNextID, createNewID, updateVideoData, restoreID, setIDFaceMatch } from '../../../store/id/actionCreators';
import { loadImageState, restoreImage } from '../../../store/image/actionCreators';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { GeneralUtil } from '../../../utils/GeneralUtil';
import SessionDropdown from '../SessionDropdown/SessionDropdown';
const axios = require('axios');

interface IProps {
    noMoreIDs: boolean;
    database: string;
    processType: ProcessType;
    currentStage: CurrentStage;
    currentIndex: number;
    library: IDState[];
    totalIDs: number;
    currentID: IDState;
    indexedID: IDState;
    internalID: InternalIDState;
    currentImage: ImageState;

    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    getPreviousID: (res?: any) => GeneralActionTypes;
    getNextID: (res?: any) => GeneralActionTypes;
    getSelectedID: (index: number, res?: any) => GeneralActionTypes;
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
    sortedList: {ID: IDState, libIndex: number, status: AnnotationStatus}[];
    sortedIndex: number;

    showSaveAndQuitModal: boolean;
    previous: boolean;

    livenessInit: boolean;
    matchInit: boolean;

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
            sortedList: [],
            sortedIndex: 0,
            showSaveAndQuitModal: false,
            previous: false,
            videoFlagsLoaded: false,
            videoFlags: [],
            selectedVideoFlags: [],
            livenessValidation: false,
            livenessInit: false,
            matchInit: false
        }
    }

    componentDidUpdate(previousProps: IProps, previousState: IState) {
        if (this.props.noMoreIDs) this.props.progressNextStage(CurrentStage.OUTPUT);
        if (this.props.indexedID === undefined) return;
        if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK && !this.state.videoFlagsLoaded) {
            this.loadVideoFlags();
        }

        if (previousProps.currentIndex !== this.props.currentIndex) {
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
                            this.initializeFaceCompareMatch();
                            this.initializeLiveness();
                            GeneralUtil.toggleOverlay(false);
                        });
                    }
                }).catch((err: any) => {
                    console.error(err);
                });
            } else {
                this.props.loadNextID(this.props.indexedID);
                GeneralUtil.toggleOverlay(false);
            }
            return;
        }
        if (this.props.currentID.sessionID !== '') {
            if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK) {
                if (this.props.currentID.selfieVideo !== undefined && this.props.currentID.selfieVideo!.name === 'notfound') {
                    // new ID has no video
                    if (((this.props.currentID.selfieImage !== undefined && this.props.currentID.selfieImage!.name !== 'notfound') 
                    || (this.props.currentID.videoStills !== undefined && this.props.currentID.videoStills!.length > 0))
                        && (this.props.currentID.croppedFace !== undefined && this.props.currentID.croppedFace!.name !== 'notfound')) {
                        // new ID has no video but can do face comparison
                        this.props.progressNextStage(CurrentStage.FR_COMPARE_CHECK);
                    } else {
                        this.loadNextID(this.state.previous);
                    }
                } else if (!this.state.livenessInit) {
                    this.initializeLiveness();
                }
            } else if (this.props.currentStage === CurrentStage.FR_COMPARE_CHECK) {
                if (!this.state.matchInit) {
                    this.initializeFaceCompareMatch();
                }
            }
            return;
        }

        if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.face !== undefined
             && this.props.currentID.givenData.face.match !== undefined && this.props.currentID.givenData.face.match[this.props.currentID.internalIndex] !== undefined
            && this.state.faceCompareMatch !== this.props.currentID.givenData.face.match[this.props.currentID.internalIndex]) {
                this.initializeFaceCompareMatch();
            }
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK && !this.state.videoFlagsLoaded) {
            this.loadVideoFlags();
        }

        this.mapIDLibrary().then(() => {
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
        });
    }


    loadVideoFlags = () => {
        let vidFlags: {category: string, flags: string[]}[] = [];
        options.flags.video.keys.forEach((each, idx) => {
            let flags = options.flags.video.values[idx];
            vidFlags.push({category: each, flags: flags});
        });
        this.setState({videoFlags: vidFlags, videoFlagsLoaded: true, livenessInit: false}, this.initializeLiveness);
    }

    initializeLiveness = () => {
        if (this.state.videoFlagsLoaded) {
            if (this.props.currentID.videoLiveness !== undefined || (this.props.currentID.videoFlags !== undefined && this.props.currentID.videoFlags.length > 0)) {
                this.setState({
                    passesLiveness: this.props.currentID.videoLiveness,
                    selectedVideoFlags: this.props.currentID.videoFlags !== undefined ? this.props.currentID.videoFlags: [],
                    livenessInit: true,
                }, this.frLivenessValidate);
            } else if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.face !== undefined) {
                let face = this.props.currentID.givenData.face;
                this.setState({
                    passesLiveness: face.liveness, 
                    selectedVideoFlags: face.videoFlags !== undefined ? face.videoFlags : [],
                    livenessInit: true
                }, this.frLivenessValidate);
            }
        }
    }

    initializeFaceCompareMatch = () => {
        if (this.state.faceCompareMatch === undefined) {
            if (this.props.currentID.faceCompareMatch !== undefined) {
                this.setState({livenessInit: false, faceCompareMatch: this.props.currentID.faceCompareMatch, matchInit: true});
            } else if (this.props.currentID.givenData !== undefined && this.props.currentID.givenData.face !== undefined) {
                let match = this.props.currentID.givenData.face.match;
                if (match === undefined || match.length === 0) return;
                let value = match[this.props.currentID.internalIndex];
                this.setState({faceCompareMatch: value, matchInit: true, livenessInit: false}, () => {
                    if (value !== undefined) this.props.setIDFaceMatch(value);
                });
            }
        }
    }

    frLivenessValidate = () => {
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

    frLivenessCheck = () => {
        const setFlag = (flags: string[], possibleFlags: string[]) => {
            this.setState({selectedVideoFlags: flags}, this.frLivenessValidate);
        }

        const submitLiveness = () => {
            if (((this.props.currentID.videoStills !== undefined && this.props.currentID.videoStills!.length > 0) 
            || (this.props.currentID.selfieImage !== undefined && this.props.currentID.selfieImage!.name !== 'notfound')) 
                && (this.props.currentID.croppedFace !== undefined && this.props.currentID.croppedFace!.name !== 'notfound')) {
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
                            value={this.state.passesLiveness} onChange={(val) => this.setState({passesLiveness: val}, this.frLivenessValidate)}>
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
                                        <p>{GeneralUtil.beautifyWord(each.category)}</p>
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
                                                        {GeneralUtil.beautifyWord(flag)}
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
                            value={this.props.currentID.faceCompareMatch} onChange={(val) => this.props.setIDFaceMatch(val)}>
                            <ToggleButton variant="light" className="common-button" value={false}>No Match</ToggleButton>
                            <ToggleButton variant="light" className="common-button" value={true}>Match</ToggleButton>
                        </ToggleButtonGroup>
                    </Card.Body>
                </Card>
                {
                    this.props.currentID.selfieVideo !== undefined && this.props.currentID.selfieVideo!.name !== 'notfound' ?
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
        this.props.saveToLibrary(this.props.currentID);
        if (this.props.currentID.videoLiveness !== undefined || this.props.currentID.faceCompareMatch !== undefined) {
            axios.post('/saveOutput', {
                database: this.props.database,
                ID: DatabaseUtil.extractOutput(this.props.currentID, this.props.processType === ProcessType.FACE),
                overwrite: true
            }).then((res: any) => {
                this.resetState();
                this.props.restoreID();
                this.props.restoreImage();
                this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                if (prev) {
                    let idx = this.state.sortedList[this.state.sortedIndex - 1].libIndex;
                    this.props.getSelectedID(idx, res.data);
                    this.setState({sortedIndex: this.state.sortedIndex - 1});
                } else {
                    if (this.state.sortedIndex + 1 === this.state.sortedList.length) {
                        // go back to the first session
                        let idx = this.state.sortedList[0].libIndex;
                        this.props.getSelectedID(idx, res.data);
                        this.setState({sortedIndex: 0});
                    } else {
                        let next = this.state.sortedList[this.state.sortedIndex + 1];
                        if (DatabaseUtil.getOverallStatus(next.ID.phasesChecked, next.ID.annotationState, this.props.processType)
                        === AnnotationStatus.NOT_APPLICABLE) {
                            let idx = this.state.sortedList[0].libIndex;
                            this.props.getSelectedID(idx, res.data);
                            this.setState({sortedIndex: 0});
                        } else {
                            let idx = next.libIndex;
                            this.props.getSelectedID(idx, res.data);
                            this.setState({sortedIndex: this.state.sortedIndex + 1});
                        }
                    }
                }
                if (DatabaseUtil.getOverallStatus(res.data.phasesChecked, res.data.annotationState, this.props.processType)
                    === AnnotationStatus.COMPLETE) {
                    this.mapIDLibrary();
                }
            }).catch((err: any) => {
                console.error(err);
            })
        } else {
            this.resetState();
            this.props.restoreID();
            this.props.restoreImage();
            this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
            if (prev) {
                let idx = this.state.sortedList[this.state.sortedIndex - 1].libIndex;
                this.props.getSelectedID(idx);
                this.setState({sortedIndex: this.state.sortedIndex - 1});
            } else {
                if (this.state.sortedIndex + 1 === this.state.sortedList.length) {
                    // go back to the first session
                    let idx = this.state.sortedList[0].libIndex;
                    this.props.getSelectedID(idx);
                    this.setState({sortedIndex: 0});
                } else {
                    let idx = this.state.sortedList[this.state.sortedIndex + 1].libIndex;
                    this.props.getSelectedID(idx);
                    this.setState({sortedIndex: this.state.sortedIndex + 1});
                }
            }
        }
    }

    loadSelectedID = (index: number, sortedIndex: number) => {
        if (index === this.props.currentIndex) return;
        this.resetState();
        this.props.saveToLibrary(this.props.currentID);
        axios.post('/saveOutput', {
            database: this.props.database,
            ID: DatabaseUtil.extractOutput(this.props.currentID, this.props.processType === ProcessType.FACE),
            overwrite: true
        }).then((res: any) => {
            this.props.restoreID();
            this.props.restoreImage();
            this.props.getSelectedID(index, res.data);
            if (DatabaseUtil.getOverallStatus(res.data.phasesChecked, res.data.annotationState, this.props.processType)
                === AnnotationStatus.COMPLETE) {
                    this.mapIDLibrary();
                }
            this.setState({sortedIndex: sortedIndex});
            this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
        }).catch((err: any) => {
            console.error(err);
        })
    }

    mapIDLibrary = () => {
        return new Promise((res, rej) => {
            const mappedList = this.props.library.map((each, idx) => {
                return {
                    ID: each,
                    libIndex: idx,
                    status: DatabaseUtil.getOverallStatus(each.phasesChecked, each.annotationState, this.props.processType)
                }
            });
            const incompleteSessions = mappedList.filter((each) => 
                DatabaseUtil.getOverallStatus(each.ID.phasesChecked, each.ID.annotationState, this.props.processType) 
                    === AnnotationStatus.INCOMPLETE);
            const completeSessions = mappedList.filter((each) => 
                DatabaseUtil.getOverallStatus(each.ID.phasesChecked, each.ID.annotationState, this.props.processType) 
                    === AnnotationStatus.COMPLETE);
            const naSessions = mappedList.filter((each) => 
                DatabaseUtil.getOverallStatus(each.ID.phasesChecked, each.ID.annotationState, this.props.processType) 
                    === AnnotationStatus.NOT_APPLICABLE);
            const sortedList = incompleteSessions.concat(completeSessions).concat(naSessions);

            if (this.state.sortedList.length === sortedList.length) {
                if (completeSessions.length === this.state.sortedList.filter((each) => each.status === AnnotationStatus.COMPLETE).length) {
                    return;
                } else {
                    this.initializeFirstSortedID(sortedList[0].libIndex);
                    this.setState({sortedList: sortedList, sortedIndex: 0}, res);
                }
            }
            this.initializeFirstSortedID(sortedList[0].libIndex);
            this.setState({sortedList: sortedList}, res);
        })
    }

    initializeFirstSortedID = (libIndex: number) => {
        if (this.props.currentIndex !== libIndex) {
            this.props.getSelectedID(libIndex);
        }
    }

    resetState = () => {
        this.setState({
            livenessInit: false,
            matchInit: false,
            videoFlagsLoaded: false,
            videoFlags: [],
            selectedVideoFlags: [],
            passesLiveness: undefined,
            livenessValidation: false,
            faceCompareMatch: undefined
        });
    }

    handleGetSession = (libIndex: number, sortedIndex: number, status: AnnotationStatus) => {
        if (status === AnnotationStatus.NOT_APPLICABLE) return;
        this.loadSelectedID(libIndex, sortedIndex);
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
            const saveAndQuit = () => {
                this.props.saveToLibrary(this.props.currentID);
                this.setState({showSaveAndQuitModal: false}, () => this.props.progressNextStage(CurrentStage.OUTPUT));
            }

            const toggleModal = (show: boolean) => {
                this.setState({showSaveAndQuitModal: show});
            }

            // const load = (previous: boolean) => {
            //     this.setState({previous: previous}, () => this.loadNextID(previous));
            // }

            return (
                <SessionDropdown showModal={this.state.showSaveAndQuitModal} toggleModal={toggleModal} 
                    saveAndQuit={saveAndQuit} sortedList={this.state.sortedList} sortedIndex={this.state.sortedIndex}
                    handleGetSession={this.handleGetSession} />
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
    getSelectedID,
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
        library: state.general.IDLibrary,
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