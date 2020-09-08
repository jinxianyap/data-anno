import React from 'react';
import { connect } from 'react-redux';
import { ImageState } from '../../store/image/types';
import { AppState } from '../../store';
import { GeneralUtil } from '../../utils/GeneralUtil';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './SegCheck.scss';
import { CurrentStage, Rotation } from '../../utils/enums';
import { GeneralActionTypes } from '../../store/general/types';
import { progressNextStage } from '../../store/general/actionCreators';
import { setImageRotation } from '../../store/id/actionCreators';
import { FiRotateCw, FiRotateCcw } from 'react-icons/fi';
import { IDActionTypes, IDState } from '../../store/id/types';

interface IProps {
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
    isRotating: boolean;
    ccw: boolean;
}

class SegCheck extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
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
            this.setState({
                originalImage: GeneralUtil.loadImage("segCheckID", this.props.backID!.image, "segCheckBackID"),
                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.backID!.croppedImage!, "segCheckCroppedID")
            })
        } else if (this.props.originalID !== undefined) {
            this.setState({
                originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID")
            })
        }
    }

    componentDidUpdate(previousProps: IProps) {
        if (this.props.noMoreIDs) {
            this.props.progressNextStage(CurrentStage.OUTPUT);
        }
        if (!previousProps.originalProcessed && this.props.originalProcessed) {
            let originalImage = this.state.originalImage!;
            let croppedImage = this.state.croppedImage!;
            originalImage.src = GeneralUtil.getSource(this.props.backID!.image);
            croppedImage.src = GeneralUtil.getSource(this.props.backID!.croppedImage!);
            this.setState({
                originalImage: originalImage,
                croppedImage: croppedImage
            })
        }
        if (!this.props.originalProcessed && this.state.originalImage === undefined && this.state.croppedImage === undefined) {
            this.setState({
                originalImage: GeneralUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                croppedImage: GeneralUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID")
            })
        }
        if (!previousProps.currentID!.dataLoaded && this.props.currentID!.dataLoaded) {
            if (!this.state.originalImage || !this.state.croppedImage) return;
            let originalImage = this.state.originalImage!;
            let croppedImage = this.state.croppedImage!;
            originalImage.src = GeneralUtil.getSource(this.props.originalID!.image);
            croppedImage.src = GeneralUtil.getSource(this.props.originalID!.croppedImage!);
            this.setState({
                originalImage: originalImage,
                croppedImage: croppedImage
            })
        }

        if (this.state.isRotating) {
            setTimeout(() => this.rotateCropped(false, this.state.ccw), 1);
        }
    }

    disableControls = (cropped: boolean, ccw: boolean) => {
        GeneralUtil.toggleOverlay(true);
        this.setState({isRotating: true, ccw: ccw});
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
        return (
            <Container style={{height: "100%"}}>
                <Row style={{height: "100%", padding: "4rem 0"}}>
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
    let ID = state.general.IDLibrary[index];
    if (index >= state.general.IDLibrary.length) {
        return {
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