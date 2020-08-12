import React from 'react';
import './App.scss';
import SetupView from './views/SetupView/SetupView';
import { CurrentStage } from './utils/enums';
import { AppState } from './store';
import { connect } from 'react-redux';

interface IProps {
  currentStage: CurrentStage
}

const App: React.FC<IProps> = ({currentStage}) => {

  switch (currentStage) {
    case (CurrentStage.SETUP):
     return <SetupView />;
    case (CurrentStage.SEGMENTATION_CHECK):
     return <h4>SEGCHECK</h4>;
    default:
     return <h4>ERROR</h4>;
  }
  
}

const mapStateToProps = (state: AppState) => ({
  currentStage: state.general.currentStage
});

export default connect(
  mapStateToProps
)(App);