import React from 'react';
import { Navbar } from 'react-bootstrap';
import { CurrentStage } from '../../../utils/enums';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import './TopBar.scss';

interface IProps {
    currentStage: CurrentStage;
}

const TopBar: React.FC<IProps> = ({currentStage}) => {

    return (
        <Navbar>
            <Navbar.Brand>{currentStage}</Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
            </Navbar.Collapse>
        </Navbar>
    );
}

const mapStateToProps = (state: AppState) => ({
    currentStage: state.general.currentStage
});

export default connect(
    mapStateToProps
)(TopBar);

