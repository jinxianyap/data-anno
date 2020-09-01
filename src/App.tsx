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
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import SegEdit from './views/SegEdit/SegEdit';
import Landmark from './views/LandmarkOCR/LandmarkOCR';
import LivenessAndMatch from './views/LivenessAndMatch/LivenessAndMatch';

interface IProps {
  state: AppState,
  currentStage: CurrentStage
}

const App: React.FC<IProps> = ({state, currentStage}) => {

  const paintContent = () => {
    switch (currentStage) {
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
        return <LivenessAndMatch />;
      default:
       return <h4>ERROR</h4>;
    }
  }
  console.log(state);
  return (
    <div className="app-wrapper">
      <div id="overlay">
        <div id="spinner">
          <Spinner animation="border" variant="light" />
        </div>
      </div>
      <TopBar />
        <Container className="content-container">
            {currentStage !== CurrentStage.SETUP ?
              (
                <Row style={{height: "100%", width: "100%", margin: 0}}>
                  <Col md={7} lg={9} id="paint-area" style={{ maxHeight: "100%", overflowY: "auto" }}>
                    {paintContent()}
                  </Col>
                  <Col style={{padding: 0, height: "100%"}}>
                    <div id="folder-number">
                      <p>Folder:   {state.general.currentIndex + 1}/{state.general.IDLibrary.length}</p>
                    </div>
                    <ControlPanel />
                  </Col>
                </Row>)
              : <Row style={{height: "100%", width: "100%", margin: 0}}>
                  <Col md={3} lg={2} />
                  <Col md={6} lg={8}><SetupView/></Col>
                  <Col md={3} lg={2} />
                </Row>
            }
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