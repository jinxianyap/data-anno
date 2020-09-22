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
    dateCreated?: string;
    currentIDSource: string;
    database: string;
}

const BottomBar: React.FC<IProps> = ({index, numberOfIDs, processType, dateCreated, currentIDSource, database}) => {

    return (
        <Navbar fixed="bottom" style={{zIndex: 10000}}>
            <Navbar.Brand> Database: {database}</Navbar.Brand>
            <Navbar.Brand style={{marginLeft: "3rem"}}>Process Type: {processType}</Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
                { dateCreated !== undefined ? 
                    <Navbar.Text style={{marginRight: "3rem"}}>Date:   
                        {dateCreated.slice(0, 4) + '-' + dateCreated.slice(4, 6) + '-' + dateCreated.slice(6, 8)}</Navbar.Text> :
                        <div /> 
                }
                <Navbar.Text style={{marginRight: "3rem"}}>Session ID:   {currentIDSource}</Navbar.Text>
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
        dateCreated: ID ? ID.dateCreated : undefined,
        currentIDSource: ID ? ID.sessionID : '',
        database: state.general.setupOptions.database
    };
}

export default connect(
    mapStateToProps
)(BottomBar);
