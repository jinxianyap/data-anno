import React from 'react';
// import './SetupView.scss'
import { AppState } from '../../store';
import { connect } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';
import ReactPlayer from 'react-player/lazy';
import { IDState } from '../../store/id/types';
import { CurrentStage } from '../../utils/enums';
import { ImageUtil } from '../../utils/ImageUtil';

interface IProps {
    id: IDState,
    currentStage: CurrentStage,
    image: File
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

    componentDidUpdate() {
        if (this.props.currentStage === CurrentStage.FR_COMPARE_CHECK && !this.state.croppedImageLoaded) {
            ImageUtil.loadImage("frCompare", this.props.image, "frCompareID");
            this.setState({croppedImageLoaded: true});
        }
    }

    render() {
        if (this.props.currentStage === CurrentStage.FR_LIVENESS_CHECK) {
            return (
                <Container className="setupView">
                    {
                        this.props.id.selfieVideo !== undefined ?
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
                            <div id="frCompare" className="pairDisplay"></div>
                        </Col>
                        <Col xs={6}>
                        {
                            this.props.id.selfieVideo !== undefined ?
                            <ReactPlayer
                                url={URL.createObjectURL(this.props.id.selfieVideo)}
                                playing={true}
                                loop={true}
                                width="100%"
                                height="70vh"
                            />
                            : <div />
                        }
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
        image: state.id.croppedFace!
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LivenessAndMatch);