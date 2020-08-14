import React from 'react';
import { Navbar } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import './BottomBar.scss';

interface IProps {
    currentIDSource: string;
    database: string;
}

const BottomBar: React.FC<IProps> = ({currentIDSource, database}) => {

    return (
        <Navbar fixed="bottom">
            <Navbar.Brand href="#home">{currentIDSource} {database}</Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
            </Navbar.Collapse>
        </Navbar>
    );
}

const mapStateToProps = (state: AppState) => {
    let index = state.general.currentIndex;
    let ID = state.general.IDLibrary[index];
    return {
        currentIDSource: ID ? ID.source : '',
        database: state.general.setupOptions.database
    };
}

export default connect(
    mapStateToProps
)(BottomBar);
