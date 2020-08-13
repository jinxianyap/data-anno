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

interface IProps {
  currentStage: CurrentStage
}

const App: React.FC<IProps> = ({currentStage}) => {

  const paintContent = () => {
    switch (currentStage) {
      case (CurrentStage.SETUP):
       return <SetupView />;
      case (CurrentStage.SEGMENTATION_CHECK):
       return <SegCheck />;
      case (CurrentStage.SEGMENTATION_EDIT):
        return <SegEdit />;
      default:
       return <h4>ERROR</h4>;
    }
  }

  if (currentStage === CurrentStage.SETUP) {
    return <SetupView />;
  } else {
    return (
      <div className="app-wrapper">
        <TopBar />
          <Container className="content-container">
            <Row style={{height: "100%", width: "100%", margin: 0}}>
              <Col md={7} lg={9}>
                {paintContent()}
              </Col>
              <Col style={{padding: 0}}>
                <ControlPanel />
              </Col>
            </Row>
          </Container> 
        <BottomBar />
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  currentStage: state.general.currentStage
});

export default connect(
  mapStateToProps
)(App);