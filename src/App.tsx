import React from 'react';
import './App.scss';
import SetupView from './views/SetupView/SetupView';
import { CurrentStage } from './utils/enums';
import { AppState } from './store';
import { connect } from 'react-redux';
import SegCheck from './views/SegCheck/SegCheck';
import TopBar from './views/Common/TopBar/TopBar';
import BottomBar from './views/Common/BottomBar/BottomBar';
import ControlPanel from './views/Common/ControlPanel/ControlPanel';
import { Container, Row, Col } from 'react-bootstrap';
import SegEdit from './views/SegEdit/SegEdit';
import Landmark from './views/LandmarkOCR/LandmarkOCR';
import FaceRecognition from './views/FaceRecognition/FaceRecognition';

interface IProps {
  state: AppState,
  currentStage: CurrentStage
}

const App: React.FC<IProps> = ({state, currentStage}) => {

  const paintContent = () => {
    console.log(state);
    switch (currentStage) {
      case (CurrentStage.SETUP):
       return <SetupView />;
      case (CurrentStage.SEGMENTATION_CHECK):
       return <SegCheck />;
      case (CurrentStage.SEGMENTATION_EDIT):
        return <SegEdit />;
      case (CurrentStage.LANDMARK_EDIT):
      case (CurrentStage.OCR_DETAILS):
      case (CurrentStage.OCR_EDIT):
        return <Landmark />;
      case (CurrentStage.FR_LIVENESS_CHECK):
      case (CurrentStage.FR_COMPARE_CHECK):
        return <FaceRecognition />;
      default:
       return <h4>ERROR</h4>;
    }
  }

  return (
    <div className="app-wrapper">
      <TopBar />
        <Container className="content-container">
          <Row style={{height: "100%", width: "100%", margin: 0}}>
            <Col md={7} lg={9}>
              {paintContent()}
            </Col>
            <Col style={{padding: 0}}>
              {currentStage === CurrentStage.SETUP ? <div/> : <ControlPanel />}
            </Col>
          </Row>
        </Container> 
        {currentStage === CurrentStage.SETUP ? <div/> : <BottomBar />}
    </div>
  );
}

const mapStateToProps = (state: AppState) => ({
  state: state,
  currentStage: state.general.currentStage
});

export default connect(
  mapStateToProps
)(App);