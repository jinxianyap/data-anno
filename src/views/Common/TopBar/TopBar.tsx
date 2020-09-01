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

    const getNavbarItems = () => {
        let id = 100;
        let values = Object.values(CurrentStage);
        values = values.slice(0, values.length - 2);

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
                            <Navbar.Brand className={name} key={idx} style={{width: (each.length / 101 * 100) + "%"}}>{each}</Navbar.Brand>
                        )
                    })
                }
            </div>
        )
    }

    return (
        <Navbar>
            {getNavbarItems()}
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

