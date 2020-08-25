import React from 'react';
import { connect } from 'react-redux';
import { ImageState } from '../../store/image/types';
import { AppState } from '../../store';
import { ImageUtil } from '../../utils/ImageUtil';
import { Container, Row, Col } from 'react-bootstrap';
import './SegCheck.scss';
import { CurrentStage } from '../../utils/enums';
import { GeneralActionTypes } from '../../store/general/types';
import { progressNextStage } from '../../store/general/actionCreators';

interface IProps {
    noMoreIDs: boolean;
    originalProcessed?: boolean;
    originalID?: ImageState;
    backID?: ImageState;
    croppedID?: ImageState;
    progressNextStage: (stage: CurrentStage) => GeneralActionTypes;
}

// interface IState {
//     ID: IDFolder;
//     // validation + storing results stuff
// }

class SegCheck extends React.Component<IProps> {

    componentWillMount() {
        if (this.props.noMoreIDs) {
            this.props.progressNextStage(CurrentStage.SETUP);
        }
    }
    componentDidMount() {
        if (this.props.noMoreIDs) return;
        if (this.props.originalProcessed) {
            ImageUtil.loadImage("segCheckID", this.props.backID!.image);
        } else {
            ImageUtil.loadImage("segCheckID", this.props.originalID!.image);
        }
        ImageUtil.loadImage("segCheckCropped", this.props.croppedID!.image);
    }


    render() {
        return (
            <Container style={{height: "100%"}}>
                <Row style={{height: "100%", padding: "6rem 0"}}>
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
    progressNextStage
};

const mapStateToProps = (state: AppState) => {
    let index = state.general.currentIndex;
    let ID = state.general.IDLibrary[index];
    if (index >= state.general.IDLibrary.length) {
        return {
            noMoreIDs: true,
            originalProcessed: undefined,
            originalID: undefined,
            backID: undefined,
            // need to change later
            croppedID: undefined
        }
    }
    return {
        noMoreIDs: false,
        originalProcessed: state.id.originalIDProcessed,
        originalID: ID.originalID!,
        backID: ID.backID!,
        // need to change later
        croppedID: ID.originalID!
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SegCheck);