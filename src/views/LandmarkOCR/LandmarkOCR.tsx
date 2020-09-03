import React from 'react';
import { connect } from 'react-redux';
import { ImageState } from '../../store/image/types';
import { AppState } from '../../store';
import { Container, Row, Col } from 'react-bootstrap';
// import { ImageUtil } from '../../utils/ImageUtil';
import LandmarkLabeller from '../Common/LandmarkLabeller/LandmarkLabeller';
import './LandmarkOCR.scss';

// only show image and drawn boxes
interface IProps {
    currentImage: ImageState;
}

interface IState {
    // ID: IDFolder;
}

class LandmarkOCR extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            // ID: {
            //     processed: false,
            //     source: '',
            //     index: 0,
            // },
        }
    }

    componentWillMount() {

    }

    componentDidMount() {
        // ImageUtil.loadImage("segEditID", this.props.currentImage.image!);        
    }

    render() {
        return (
            <Container style={{height: "100%"}}>
                <Row style={{height: "100%"}}>
                    <Col xs={1}>
                    </Col>
                    <Col xs={10} id="landmark-ocr">
                        {/* <LabelView /> */}
                        <LandmarkLabeller />
                    </Col>
                    <Col xs={1}>
                    </Col>
                </Row>
            </Container>
        )
    }
}

const mapDispatchToProps = {
};

const mapStateToProps = (state: AppState) => ({
    currentImage: state.image
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LandmarkOCR);