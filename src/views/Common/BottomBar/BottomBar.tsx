import React from 'react';
import { Navbar } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import './BottomBar.scss';
import { ProcessType } from '../../../utils/enums';

interface IProps {
    index: number;
    numberOfIDs: number;
    processType: ProcessType;
    currentIDSource: string;
    database: string;
}

const BottomBar: React.FC<IProps> = ({index, numberOfIDs, processType, currentIDSource, database}) => {

    return (
        <Navbar fixed="bottom">
            <Navbar.Brand>{database}</Navbar.Brand>
            <Navbar.Brand style={{marginLeft: "3rem"}}>Process Type: {processType}</Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
                <Navbar.Text style={{marginRight: "3rem"}}>Source:   {currentIDSource}</Navbar.Text>
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
        processType: state.general.setupOptions.processType,
        currentIDSource: ID ? ID.source : '',
        database: state.general.setupOptions.database
    };
}

export default connect(
    mapStateToProps
)(BottomBar);
