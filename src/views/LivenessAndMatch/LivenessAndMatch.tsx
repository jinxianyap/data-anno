import React from 'react';
// import './SetupView.scss'
import { AppState } from '../../store';
import { connect } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';
import ReactPlayer from 'react-player/lazy';
import { IDState, InternalIDState } from '../../store/id/types';
import { CurrentStage } from '../../utils/enums';
import { GeneralUtil } from '../../utils/GeneralUtil';

interface IProps {
    id: IDState,
    currentStage: CurrentStage,
    internalID: InternalIDState
}

interface IState {
    croppedImageLoaded: boolean
}

class LivenessAndMatch extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            croppedImageLoaded: false
        };
    }

    componentDidMount() {
        if (this.props.currentStage === CurrentStage.FR_COMPARE_CHECK && !this.state.croppedImageLoaded) {
            if (this.props.id.croppedFace!.name !== 'notfound') {
                GeneralUtil.loadImage("frCompareFace", this.props.id.croppedFace!, "frCompareID");
            } else if (this.props.internalID.originalID!.croppedImage!.name !== 'notfound') {
                GeneralUtil.loadImage("frCompareFace", this.props.internalID.originalID!.croppedImage!, "frCompareID");
            }
            if (this.props.id.selfieImage!.name !== 'notfound') {
                GeneralUtil.loadImage("frCompareSelfie", this.props.id.selfieImage!, "frCompareSelfieImage");
            } else if (this.props.id.videoStills!.length > 0) {
                GeneralUtil.loadImage("frCompareSelfie", this.props.id.videoStills![0], "frCompareSelfieImage");
            }
            this.setState({croppedImageLoaded: true});
        }
    }

    componentDidUpdate() {
        if (this.props.currentStage === CurrentStage.FR_COMPARE_CHECK && !this.state.croppedImageLoaded) {
            if (this.props.id.croppedFace!.name !== 'notfound') {
                GeneralUtil.loadImage("frCompareFace", this.props.id.croppedFace!, "frCompareID");
            } else if (this.props.internalID.originalID!.croppedImage!.name !== 'notfound') {
                GeneralUtil.loadImage("frCompareFace", this.props.internalID.originalID!.croppedImage!, "frCompareID");
            }
            if (this.props.id.selfieImage!.name !== 'notfound') {
                GeneralUtil.loadImage("frCompareSelfie", this.props.id.selfieImage!, "frCompareSelfieImage");
            } else if (this.props.id.videoStills!.length > 0) {
                GeneralUtil.loadImage("frCompareSelfie", this.props.id.videoStills![0], "frCompareSelfieImage");
            }
            this.setState({croppedImageLoaded: true});
        }
    }

    render() {
        if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK) {
            return (
                <Container className="setupView">
                    {
                        this.props.id.selfieVideo!.name !== 'notfound' ?
                        <ReactPlayer
                            url={URL.createObjectURL(this.props.id.selfieVideo)}
                            playing={true}
                            loop={true}
                            width="100%"
                            height="70vh"
                        />
                        : <div />
                    }
                </Container>
            );
        } else {
            return (
                <Container style={{height: "100%"}}>
                    <Row style={{height: "100%"}}>
                        <Col xs={6}>
                            <div id="frCompareFace" className="pairDisplay"></div>
                        </Col>
                        <Col xs={6}>
                            <div id="frCompareSelfie" className="pairDisplay"></div>
                        </Col>
                    </Row>
                </Container>
            );
        }
    }
}

const mapDispatchToProps = {
};

const mapStateToProps = (state: AppState) => {
    return {
        currentStage: state.general.currentStage,
        id: state.id,
        internalID: state.id.internalIDs[state.id.internalIndex]
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LivenessAndMatch);