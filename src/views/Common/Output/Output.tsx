import React from 'react';
import { Navbar } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { IDState } from '../../../store/id/types';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
const axios = require('axios');

interface IProps {
    IDLibrary: IDState[],
}

const Output: React.FC<IProps> = ({ IDLibrary }) => {
    console.log(IDLibrary.map(DatabaseUtil.extractOutput));
    axios.post('/returnOutput', {
        library: IDLibrary.map(DatabaseUtil.extractOutput),
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
