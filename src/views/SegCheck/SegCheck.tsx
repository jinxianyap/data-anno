import React from 'react';
import { connect } from 'react-redux';
import { ImageState } from '../../store/image/types';
import { AppState } from '../../store';
import { ImageUtil } from '../../utils/ImageUtil';
import { Container, Row, Col } from 'react-bootstrap';
import './SegCheck.scss';

interface IProps {
    originalID: ImageState;
    croppedID: ImageState;
}

// interface IState {
//     ID: IDFolder;
//     // validation + storing results stuff
// }

class SegCheck extends React.Component<IProps> {

    componentDidMount() {
        ImageUtil.loadImage("segCheckID", this.props.originalID.image);
        ImageUtil.loadImage("segCheckCropped", this.props.croppedID.image);
    }


    render() {
        return (
            <Container style={{height: "100%"}}>
                <Row style={{height: "100%"}}>
                    <Col xs={6}>
                        <div id="segCheckID" className="pairDisplay"></div>
                    </Col>
                    <Col xs={6}>
                        <div id="segCheckCropped" className="pairDisplay"></div>
                    </Col>
                </Row>
            </Container>
        );
    }
}

const mapDispatchToProps = {
};

const mapStateToProps = (state: AppState) => {
    let index = state.general.currentIndex;
    let ID = state.general.IDLibrary[index];
    return {
        originalID: ID.originalID!,
        // need to change later
        croppedID: ID.originalID!
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SegCheck);