import React from 'react';
import { connect } from 'react-redux';
import { ImageState } from '../../store/image/types';
import { AppState } from '../../store';
import { GeneralUtil } from '../../utils/GeneralUtil';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './SegCheck.scss';
import { CurrentStage, Rotation, IDProcess } from '../../utils/enums';
import { GeneralActionTypes } from '../../store/general/types';
import { progressNextStage } from '../../store/general/actionCreators';
import { setImageRotation } from '../../store/id/actionCreators';
import { FiRotateCw, FiRotateCcw } from 'react-icons/fi';
import { IDActionTypes, IDState } from '../../store/id/types';

interface IProps {
    currentIndex: number;
    noMoreIDs: boolean;
    currentID?: IDState;
    originalProcessed?: boolean;
    originalID?: ImageState;
    backID?: ImageState;
    croppedID?: ImageState;
    progressNextStage: (stage: CurrentStage) => GeneralActionTypes;
    setImageRotation: (id: File, idRotation: Rotation) => IDActionTypes;
}

interface IState {
    originalImageRotation: Rotation;
    croppedImageRotation: Rotation;
    originalImage?: HTMLImageElement;
    croppedImage?: HTMLImageElement;
    front: boolean;
    isRotating: boolean;
    ccw: boolean;
}

class SegCheck extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            front: true,
            originalImageRotation: Rotation.ROT0,
            croppedImageRotation: Rotation.ROT0,
            isRotating: false,
            ccw: false
        }
    }

    componentWillMount() {
        if (this.props.noMoreIDs) {
            this.props.progressNextStage(CurrentStage.OUTPUT);
        }
    }

    componentDidMount() {
        if (this.props.noMoreIDs) return;
        if (this.props.originalProcessed) {
            if (this.props.currentID === undefined) return;
            let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
            if (internalID !== undefined && internalID.processStage === IDProcess.DOUBLE_BACK) {
                this.setState({
                    originalImage: GeneralUtil.loadImage("segCheckID", this.props.backID!.image, "segCheckBackID"),
                    croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.backID!.croppedImage!, "segCheckCroppedID"),
                    front: false,
                    originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.backIDRotation : Rotation.ROT0
                })
            } else {
                this.setState({
                    originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                    croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID"),
                    front: true,
                    originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
                })
            }
        } else if (this.props.originalID !== undefined) {
            this.setState({
                originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID"),
                front: true,
                originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
            })
        }
    }

    componentDidUpdate(previousProps: IProps) {
        if (this.props.noMoreIDs) {
            this.props.progressNextStage(CurrentStage.OUTPUT);
            return;
        }
        if (!previousProps.originalProcessed && this.props.originalProcessed) {
            // when reverting to a previous ID that has already been processed
            let originalImage = this.state.originalImage;
            let croppedImage = this.state.croppedImage;
            let front = true;
            let rot = Rotation.ROT0;
            if (this.props.currentID !== undefined) {
                let intId = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
                if (intId !== undefined) {
                    if (originalImage !== undefined && croppedImage !== undefined) {
                        if (intId.processStage === IDProcess.DOUBLE_BACK) {
                            originalImage.src = GeneralUtil.getSource(this.props.backID!.image);
                            croppedImage.src = GeneralUtil.getSource(this.props.backID!.croppedImage!);
                            front = false;                
                            rot = this.props.currentID !== undefined ? this.props.currentID.backIDRotation : Rotation.ROT0;
                        } else {
                            originalImage.src = GeneralUtil.getSource(this.props.originalID!.image);
                            croppedImage.src = GeneralUtil.getSource(this.props.originalID!.croppedImage!);
                            front = true;
                            rot = this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0;
                        }
                    } else {
                        if (intId.processStage === IDProcess.DOUBLE_BACK) {
                            this.setState({
                                originalImage: GeneralUtil.loadImage("segCheckID", this.props.backID!.image, "segCheckOriginalID"),
                                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.backID!.croppedImage!, "segCheckCroppedID"),
                                front: false,
                                originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.backIDRotation : Rotation.ROT0
                            })
                        } else {
                            this.setState({
                                originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID"),
                                front: true,
                                originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
                            })
                        }
                    }
                }
            }

            this.setState({
                originalImage: originalImage,
                croppedImage: croppedImage,
                front: front,
                originalImageRotation: rot
            })
        } else if (!this.props.originalProcessed && this.state.originalImage === undefined && this.state.croppedImage === undefined
            && this.props.originalID !== undefined) {
            // when segCheck first loads
            this.setState({
                originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID"),
                front: true,
                originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
            })
        } else if ((!previousProps.currentID!.dataLoaded && this.props.currentID!.dataLoaded) || 
            (previousProps.currentID!.sessionID !== this.props.currentID!.sessionID)) {
            // when moving from one ID to another processed or unprocessed
            if (this.state.originalImage === undefined || this.state.croppedImage === undefined) {
                this.setState({
                    originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                    croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID"),
                    front: true,
                    originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
                })
            } else {
                let originalImage = this.state.originalImage!;
                let croppedImage = this.state.croppedImage!;
                if (this.props.originalID === undefined) return;
                originalImage.src = GeneralUtil.getSource(this.props.originalID!.image);
                croppedImage.src = GeneralUtil.getSource(this.props.originalID!.croppedImage!);
                this.setState({
                    originalImage: originalImage,
                    croppedImage: croppedImage,
                    front: true,
                    originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
                })
            }
        } else if (this.props.originalProcessed && this.props.currentID !== undefined && this.props.currentID.internalIDs.length > 0
            && previousProps.currentID !== undefined && previousProps.currentID.internalIDs.length > 0) {
                // when moving from back id to original id and v.v.
            let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
            let originalImage = this.state.originalImage!;
            let croppedImage = this.state.croppedImage!;
            if (internalID === undefined) return;
            if (!this.state.originalImage || !this.state.croppedImage) {
                if (internalID.processStage === IDProcess.DOUBLE_BACK && this.state.front) {
                    this.setState({
                        originalImage: GeneralUtil.loadImage("segCheckID", this.props.backID!.image, "segCheckOriginalID"),
                        croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.backID!.croppedImage!, "segCheckCroppedID"),
                        front: false,
                        originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.backIDRotation : Rotation.ROT0
                    })
                } else {
                    this.setState({
                        originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                        croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID"),
                        front: true,
                        originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
                    })
                }
            } else {
                if (internalID.processStage === IDProcess.DOUBLE_BACK && this.state.front) {
                    originalImage.src = GeneralUtil.getSource(this.props.backID!.image);
                    croppedImage.src = GeneralUtil.getSource(this.props.backID!.croppedImage!);
                    this.setState({
                        originalImage: originalImage,
                        croppedImage: croppedImage,
                        front: false,
                        originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.backIDRotation : Rotation.ROT0
                    })
                } else if (internalID.processStage === IDProcess.DOUBLE_FRONT && !this.state.front) {
                    originalImage.src = GeneralUtil.getSource(this.props.originalID!.image);
                    croppedImage.src = GeneralUtil.getSource(this.props.originalID!.croppedImage!);
                    this.setState({
                        originalImage: originalImage,
                        croppedImage: croppedImage,
                        front: true,
                        originalImageRotation: this.props.currentID !== undefined ? this.props.currentID.originalIDRotation : Rotation.ROT0
                    })
                }
            }
        }

        // if (this.state.isRotating) {
        //     setTimeout(, 1);
        // }
    }

    disableControls = (cropped: boolean, ccw: boolean) => {
        GeneralUtil.toggleOverlay(true);
        this.setState({isRotating: true, ccw: ccw}, () => this.rotateCropped(false, this.state.ccw));
    }

    rotateCropped = (cropped: boolean, ccw: boolean) => {
        let newRotation = Rotation.ROT0;
        switch (cropped ? this.state.croppedImageRotation : this.state.originalImageRotation) {
            case (Rotation.ROT0): {
                newRotation = ccw ? Rotation.ROT270 : Rotation.ROT90;
                break;
            }
            case (Rotation.ROT90): {
                newRotation = ccw ? Rotation.ROT0 : Rotation.ROT180;
                break;
            }
            case (Rotation.ROT180): {
                newRotation = ccw ? Rotation.ROT90 : Rotation.ROT270;
                break;
            }
            case (Rotation.ROT270): {
                newRotation = ccw ? Rotation.ROT180 : Rotation.ROT0;
                break;
            }
        }

        let parent: HTMLElement = document.getElementById(cropped ? "segCheckCropped" : "segCheckID")!;
        let img: HTMLImageElement = cropped ? this.state.croppedImage! : this.state.originalImage!;
        parent.removeChild(img);
        
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext("2d")!;
        
        canvas.width = height;
        canvas.height = width;

        // transform context before drawing image
        if (ccw) {
            ctx.transform(0, -1, 1, 0, 0, width);
        } else {
            ctx.transform(0, 1, -1, 0, height, 0);
        }
        ctx.drawImage(img, 0, 0);
        img.src = canvas.toDataURL();
        canvas.toBlob((blob) => {
            let filename = this.props.originalProcessed ? 
                (cropped ? this.props.backID!.croppedImage!.name : this.props.backID!.image.name) : 
                (cropped ? this.props.originalID!.croppedImage!.name : this.props.originalID!.image.name);
            filename += "_" + newRotation;
            this.props.setImageRotation(new File([blob!], filename), newRotation);
        }, "image/jpeg", 1);
        parent.appendChild(img);

        setTimeout(() => {
            GeneralUtil.toggleOverlay(false);
            this.setState({
                originalImageRotation: cropped ? this.state.originalImageRotation : newRotation,
                croppedImageRotation: cropped ? newRotation : this.state.croppedImageRotation,
                isRotating: false
            });
        }, 1000);
    }

    render() {
        const showIndex = () => {
            if (this.props.currentID !== undefined && this.props.currentID.internalIDs[this.props.currentID.internalIndex] !== undefined
                && this.props.currentID.internalIDs[this.props.currentID.internalIndex].processStage === IDProcess.DOUBLE_BACK) {
                return (
                    <div id="backTitle">
                        <p>Internal ID {(this.props.currentID.internalIndex + 1).toString() + " of " + this.props.currentID.internalIDs.length.toString()}</p>
                        <p>{this.props.currentID.internalIDs[this.props.currentID.internalIndex].documentType} Back</p>
                    </div>
                ); 
            }
        }
        return (
            <Container style={{height: "100%"}}>
                {showIndex()}
                <Row style={{height: "100%", padding: "2rem 0"}}>
                    <Col xs={6} style={{maxHeight: "100%"}}>
                        <div className="segCheckTools">
                            <p>Original</p>
                            <Button variant="light" disabled={this.state.isRotating} onClick={() => this.disableControls(false, false)}><FiRotateCw /></Button>
                            <Button variant="light" disabled={this.state.isRotating} onClick={() => this.disableControls(false, true)}><FiRotateCcw /></Button>
                        </div>
                        <div id="segCheckID" className="pairDisplay"  style={{maxHeight: "100%"}}></div>
                    </Col>
                    <Col xs={6} style={{maxHeight: "100%"}}>
                        <div className="segCheckTools">
                            <p>Cropped</p>
                            {/* <Button variant="light" onClick={() => this.disableControls(true, true)}><FiRotateCcw /></Button>
                            <Button variant="light" onClick={() => this.disableControls(true, false)}><FiRotateCw /></Button> */}
                        </div>
                        <div id="segCheckCropped" className="pairDisplay"  style={{maxHeight: "100%"}}></div>
                    </Col>
                </Row>
            </Container>
        );
    }
}

const mapDispatchToProps = {
    progressNextStage,
    setImageRotation
};

const mapStateToProps = (state: AppState) => {
    let index = state.general.currentIndex;
    if (index >= state.general.IDLibrary.length) {
        return {
            currentIndex: index,
            noMoreIDs: true,
            currentID: undefined,
            originalProcessed: undefined,
            originalID: undefined,
            backID: undefined,
            // need to change later
            croppedID: undefined
        }
    }
    return {
        currentIndex: index,
        noMoreIDs: false,
        currentID: state.id,
        originalProcessed: state.id.originalIDProcessed,
        originalID: state.id.originalID!,
        backID: state.id.backID!,
        // need to change later
        // croppedID: ID.croppedID!
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SegCheck);