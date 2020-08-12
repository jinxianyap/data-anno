import React from 'react';
import './SetupView.scss'
import { Form, Button, Container } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { ProcessType, CurrentStage, UsersTemp, DatabasesTemp } from '../../utils/enums';
import { SetupOptions, GeneralActionTypes, IDFolder } from '../../store/general/types';
import { saveSetupOptions, progressNextStage, loadFromDatabase } from '../../store/general/actionCreators';
import { AppState } from '../../store';
import {connect} from "react-redux";

interface IProps {
    saveSetupOptions: (setupOptions: SetupOptions) => GeneralActionTypes;
    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    loadFromDatabase: (IDs: IDFolder[]) => GeneralActionTypes;
    setupOptions: SetupOptions;
}

interface IState {
    user: string,
    database: string,
    startDate: Date,
    endDate: Date,
    processType: ProcessType,
    incomplete: boolean
}

class SetupView extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            user: UsersTemp.Bob,
            database: DatabasesTemp.DB2,
            startDate: new Date(),
            endDate:new Date(),
            processType: ProcessType.WHOLE,
            incomplete: false
        };
    }

    componentWillUpdate() {
        console.log(this.state);
    }


    loadIDs = () => {
        let db = this.state.database;
    }

    handleSubmit = (e: any) => {
        e.preventDefault();
        if (this.state.user === '' || this.state.database === '') {
            this.setState({incomplete: true});
        } else {
            console.log('submitted');
            let st = this.state;
            let setup: SetupOptions = {
                user: st.user,
                database: st.database,
                startDate: st.startDate,
                endDate: st.endDate,
                processType: st.processType
            }
            this.props.saveSetupOptions(setup);
            console.log(setup);
            this.loadIDs();
            // this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }
    }

    render() {
        return (
            <Container className="setupView">
                <Form onSubmit={this.handleSubmit}>
                <Form.Group controlId="setupUser">
                    <Form.Label>User</Form.Label>
                    <Form.Control as="select" value={this.state.user} onChange={(e: any) => this.setState({user: e.target.value})} >
                        {Object.entries(UsersTemp).map(([key, value]) => <option value={value}>{key}</option>)}
                    </Form.Control>
                </Form.Group>

                <Form.Group controlId="setupUser">
                    <Form.Label>Database</Form.Label>
                    <Form.Control as="select" value={this.state.database} onChange={(e: any) => this.setState({database: e.target.value})}>
                        {Object.entries(DatabasesTemp).map(([key, value]) => <option value={value}>{key}</option>)}
                    </Form.Control>
                </Form.Group>
    
                <Form.Group controlId="startDate">
                    <Form.Label>Start Date</Form.Label>
                    <DatePicker id="startDatepicker" selected={this.state.startDate} onChange={(date: Date) => this.setState({startDate: date})} />
                </Form.Group>

                <Form.Group controlId="endDate">
                    <Form.Label>End Date</Form.Label>
                    <DatePicker id="endDatepicker" selected={this.state.endDate} onChange={(date: Date) => this.setState({endDate: date})} />
                </Form.Group>

                <Form.Group controlId="setupUser">
                    <Form.Label>Process</Form.Label>
                    <Form.Control as="select" defaultValue={this.state.processType} onChange={(e: any) => this.setState({processType: e.target.value})}>
                        <option value={ProcessType.WHOLE}>Full</option>
                        <option value={ProcessType.SEGMENTATION}>Up to Segmentation</option>
                        <option value={ProcessType.LANDMARK}>Up to Landmark</option>
                        <option value={ProcessType.OCR}>Up To OCR</option>
                    </Form.Control>
                </Form.Group>

                { this.state.incomplete
                    ? <p color='red'>Form not complete.</p>
                    : <div />
                }

                <Button variant="primary" type="submit">
                    Submit
                </Button>
                </Form>
            </Container>
        )
    }
}

const mapDispatchToProps = {
    saveSetupOptions,
    progressNextStage,
    loadFromDatabase,
};

const mapStateToProps = (state: AppState) => ({
    setupOptions: state.general.setupOptions
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SetupView);