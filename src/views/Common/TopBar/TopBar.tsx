import React from 'react';
import { Navbar } from 'react-bootstrap';
import { CurrentStage, ProcessType } from '../../../utils/enums';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import './TopBar.scss';

interface IProps {
    processType: ProcessType;
    currentStage: CurrentStage;
}

const TopBar: React.FC<IProps> = ({processType, currentStage}) => {

    const getNavbarItems = () => {
        let id = 100;
        let values = Object.values(CurrentStage);
        let length = 101;

        switch (processType) {
            case (ProcessType.WHOLE): { values = values.slice(0, 8); break; }
            case (ProcessType.SEGMENTATION): { values = values.slice(0, 3); length = 46; break; }
            case (ProcessType.LANDMARK): { values = values.slice(0, 4); length = 54; break; }
            case (ProcessType.OCR): { values = values.slice(0, 6); length -= 28; break; }
            case (ProcessType.LIVENESS): { values = values.slice(0, 7); length -= 15; break; }
            case (ProcessType.FACE): { values = values.slice(6, 8); length = 28; break; }
        }

        return (
            <div style={{width: "100%"}}>
                {
                    values.map((each, idx) => {
                        let name = "topbar-nav topbar-inactive";
                        if (each === currentStage) {
                            name = "topbar-nav";
                            id = idx;
                        }
                        // if (idx > id) {
                        //     name += " topbar-hidden";
                        // }
                        return (
                            <Navbar.Brand className={name} key={idx} style={{width: (each.length / length * 100) + "%"}}>{each}</Navbar.Brand>
                        )
                    })
                }
            </div>
        )
    }

    return (
        <Navbar style={{zIndex: 10000}}>
            {getNavbarItems()}
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
            </Navbar.Collapse>
        </Navbar>
    );
}

const mapStateToProps = (state: AppState) => ({
    processType: state.general.setupOptions.processType,
    currentStage: state.general.currentStage
});

export default connect(
    mapStateToProps
)(TopBar);

