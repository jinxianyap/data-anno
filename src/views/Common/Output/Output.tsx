import React from 'react';
import { Navbar } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { IDState } from '../../../store/id/types';
const axios = require('axios');

interface IProps {
    IDLibrary: IDState[]
}

const Output: React.FC<IProps> = ({ IDLibrary }) => {
    // const displayDate: string = dateCreated !== undefined 
    //     ? dateCreated.getFullYear() + '-' + (dateCreated.getMonth() < 10 ? '0' + dateCreated.getMonth()  : dateCreated.getMonth())
    //       + '-' + (dateCreated.getDate() < 10 ? '0' + dateCreated.getDate()  : dateCreated.getDate())
    //     : '';
    axios.post('/returnOutput', {
        library: IDLibrary,
        overwrite: true
    });

    return (
        <Navbar fixed="bottom">
            <Navbar.Brand> Database:</Navbar.Brand>

        </Navbar>
    );
}

const mapStateToProps = (state: AppState) => {
    return {
        IDLibrary: state.general.IDLibrary
    }
}

export default connect(
    mapStateToProps
)(Output);
