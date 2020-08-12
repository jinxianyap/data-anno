import React from 'react';
import { Navbar } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import './BottomBar.scss';

interface IProps {
    currentImageSource: string;
    database: string;
}

const BottomBar: React.FC<IProps> = ({currentImageSource, database}) => {

    return (
        <Navbar fixed="bottom">
            <Navbar.Brand href="#home">{currentImageSource} {database}</Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
            </Navbar.Collapse>
        </Navbar>
    );
}

const mapStateToProps = (state: AppState) => ({
    currentImageSource: state.image.currentImage.source,
    database: state.general.setupOptions.database
});

export default connect(
    mapStateToProps
)(BottomBar);
