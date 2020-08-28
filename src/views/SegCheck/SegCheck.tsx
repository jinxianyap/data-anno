import React from 'react';
import { connect } from 'react-redux';
import { ImageState } from '../../store/image/types';
import { AppState } from '../../store';
import { ImageUtil } from '../../utils/ImageUtil';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './SegCheck.scss';
import { CurrentStage, Rotation } from '../../utils/enums';
import { GeneralActionTypes } from '../../store/general/types';
import { progressNextStage } from '../../store/general/actionCreators';
import { setImageRotation } from '../../store/id/actionCreators';
import { FiRotateCw } from 'react-icons/fi';
import { IDActionTypes, IDState } from '../../store/id/types';

interface IProps {
    noMoreIDs: boolean;
    currentID?: IDState;
    originalProcessed?: boolean;
    originalID?: ImageState;
    backID?: ImageState;
    croppedID?: ImageState;
    progressNextStage: (stage: CurrentStage) => GeneralActionTypes;
    setImageRotation: (croppedId: boolean, id: File, idRotation: Rotation) => IDActionTypes;
}

interface IState {
    originalImageRotation: Rotation;
    croppedImageRotation: Rotation;
    originalImage?: HTMLImageElement;
    croppedImage?: HTMLImageElement;
}

class SegCheck extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            originalImageRotation: Rotation.ROT0,
            croppedImageRotation: Rotation.ROT0,
        }
    }

    componentWillMount() {
        if (this.props.noMoreIDs) {
            this.props.progressNextStage(CurrentStage.SETUP);
        }
    }

    componentDidMount() {
        if (this.props.noMoreIDs) return;
        if (this.props.originalProcessed) {
            this.setState({
                originalImage: ImageUtil.loadImage("segCheckID", this.props.backID!.image, "segCheckBackID"),
                croppedImage: ImageUtil.loadImage("segCheckCropped", this.props.backID!.croppedImage!, "segCheckCroppedID")
            })
        } else if (this.props.originalID !== undefined) {
            this.setState({
                originalImage: ImageUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                croppedImage: ImageUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID")
            })
        }
    }

    componentDidUpdate(previousProps: IProps) {
        if (!this.props.originalProcessed && this.state.originalImage === undefined && this.state.croppedImage === undefined) {
            this.setState({
                originalImage: ImageUtil.loadImage("segCheckID", this.props.originalID!.image, "segCheckOriginalID"),
                croppedImage: ImageUtil.loadImage("segCheckCropped", this.props.originalID!.croppedImage!, "segCheckCroppedID")
            })
        }
    }

    disableControls = (cropped: boolean) => {
        let button: HTMLButtonElement = document.getElementById('segcheck-submit-btn')! as HTMLButtonElement;
        let initial = button.disabled;
        button.disabled = true;
        this.rotateCropped(cropped, initial);
    }

    rotateCropped = (cropped: boolean, buttonDisabled: boolean) => {
        let newRotation = Rotation.ROT0;
        switch (cropped ? this.state.croppedImageRotation : this.state.originalImageRotation) {
            case (Rotation.ROT0): {
                newRotation = Rotation.ROT90;
                break;
            }
            case (Rotation.ROT90): {
                newRotation = Rotation.ROT180;
                break;
            }
            case (Rotation.ROT180): {
                newRotation = Rotation.ROT270;
                break;
            }
            case (Rotation.ROT270): {
                newRotation = Rotation.ROT0;
                break;
            }
        }
        this.setState({
            originalImageRotation: cropped ? this.state.originalImageRotation : newRotation,
            croppedImageRotation: cropped ? newRotation : this.state.croppedImageRotation
        }, () => {
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
            ctx.transform(0, 1, -1, 0, height, 0)
            ctx.drawImage(img, 0, 0);
            img.src = canvas.toDataURL();
            canvas.toBlob((blob) => {
                let filename = this.props.originalProcessed ? 
                    (cropped ? this.props.backID!.croppedImage!.name : this.props.backID!.image.name) : 
                    (cropped ? this.props.originalID!.croppedImage!.name : this.props.originalID!.image.name);
                filename += "_" + newRotation;
                this.props.setImageRotation(cropped, new File([blob!], filename), newRotation);
            }, "image/jpeg", 1);
            parent.appendChild(img);

            setTimeout(() => {
                let button: HTMLButtonElement = document.getElementById('segcheck-submit-btn')! as HTMLButtonElement;
                button.disabled = false;
            }, 2000);
        })
    }

    render() {
        return (
            <Container style={{height: "100%"}}>
                <Row style={{height: "100%", padding: "4rem 0"}}>
                    <Col xs={6} style={{maxHeight: "100%"}}>
                        <p>Original</p>
                        <Button variant="light" onClick={() => this.disableControls(false)}><FiRotateCw /></Button>
                        <div id="segCheckID" className="pairDisplay"  style={{maxHeight: "100%"}}></div>
                    </Col>
                    <Col xs={6} style={{maxHeight: "100%"}}>
                        <p>Cropped</p>
                        <Button variant="light" onClick={() => this.disableControls(true)}><FiRotateCw /></Button>
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