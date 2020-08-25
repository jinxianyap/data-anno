import React from 'react';
import { Navbar } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import './BottomBar.scss';

interface IProps {
    index: number;
    numberOfIDs: number;
    currentIDSource: string;
    database: string;
}

const BottomBar: React.FC<IProps> = ({index, numberOfIDs, currentIDSource, database}) => {

    return (
        <Navbar fixed="bottom">
            <Navbar.Brand href="#home">{database}</Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
                <Navbar.Text style={{marginRight: "3rem"}}>Source:   {currentIDSource}</Navbar.Text>
                <Navbar.Text style={{marginRight: "2rem"}}>Folder:   {index + 1}/{numberOfIDs}</Navbar.Text>
            </Navbar.Collapse>
        </Navbar>
    );
}

const mapStateToProps = (state: AppState) => {
    let index = state.general.currentIndex;
    let ID = state.general.IDLibrary[index];
    return {
        index: index,
        numberOfIDs: state.general.IDLibrary.length,
        currentIDSource: ID ? ID.source : '',
        database: state.general.setupOptions.database
    };
}

export default connect(
    mapStateToProps
)(BottomBar);
