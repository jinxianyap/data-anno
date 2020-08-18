import React from 'react';
import './SetupView.scss'
import { Form, Button, Container } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { ProcessType, CurrentStage, UsersTemp, DatabasesTemp } from '../../utils/enums';
import { SetupOptions, GeneralActionTypes } from '../../store/general/types';
import { saveSetupOptions, progressNextStage, loadFromDatabase } from '../../store/general/actionCreators';
import { AppState } from '../../store';
import {connect} from "react-redux";
import { DatabaseUtil } from '../../utils/DatabaseUtil';
import { IDState } from '../../store/id/types';

interface IProps {
    saveSetupOptions: (setupOptions: SetupOptions) => GeneralActionTypes;
    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    loadFromDatabase: (IDs: IDState[]) => GeneralActionTypes;
    setupOptions: SetupOptions;
}

interface IState {
    user: string,
    database: string,
    startDate: Date,
    endDate: Date,
    processType: ProcessType,
    incomplete: boolean,
    loadedIDs: boolean,
    // temp to simulate loading from database
    files: File[]
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
            incomplete: false,
            loadedIDs: false,
            files: []
        };
    }

    handleSubmit = (e: any) => {
        e.preventDefault();
        if (this.state.user === '' || this.state.database === '') {
            this.setState({incomplete: true});
        } else {
            // console.log('submitted');
            let st = this.state;
            let setup: SetupOptions = {
                user: st.user,
                database: st.database,
                startDate: st.startDate,
                endDate: st.endDate,
                processType: st.processType
            }
            this.props.saveSetupOptions(setup);
            // console.log(setup);
            //temp to simulate loading fileobjects from database
            let folders = [];
            let IDFolder = DatabaseUtil.loadIntoIDFolder(st.files);
            folders.push(IDFolder);
            folders.push(IDFolder);

            this.props.loadFromDatabase(folders);

            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
        }
    }

    handleUpload = (e: any) => {
        let files = this.state.files;
        files.push(e.target.files[0]);
        this.setState({files: files});
        // console.log(this.state.files);
    }

    render() {
        return (
            <Container className="setupView">
                <Form onSubmit={this.handleSubmit}>
                <Form.Group controlId="setupUser">
                    <Form.Label>User</Form.Label>
                    <Form.Control as="select" value={this.state.user} onChange={(e: any) => this.setState({user: e.target.value})} >
                        {Object.entries(UsersTemp).map(([key, value]) => <option key={value} value={value}>{key}</option>)}
                    </Form.Control>
                </Form.Group>

                <Form.Group controlId="database">
                    <Form.Label>Database</Form.Label>
                    <Form.Control as="select" value={this.state.database} onChange={(e: any) => this.setState({database: e.target.value})}>
                        {Object.entries(DatabasesTemp).map(([key, value]) => <option key={value} value={value}>{key}</option>)}
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

                <Form.Group controlId="process">
                    <Form.Label>Process</Form.Label>
                    <Form.Control as="select" defaultValue={this.state.processType} onChange={(e: any) => this.setState({processType: e.target.value})}>
                        <option key="full" value={ProcessType.WHOLE}>Full</option>
                        <option key="seg" value={ProcessType.SEGMENTATION}>Up to Segmentation</option>
                        <option key="landmark" value={ProcessType.LANDMARK}>Up to Landmark</option>
                        <option key="ocr" value={ProcessType.OCR}>Up To OCR</option>
                    </Form.Control>
                </Form.Group>

                

                <Form.Group controlId="fileUpload">
                <Form.File
                    className="position-relative"
                    required
                    name="file"
                    label="IC Front"
                    onChange={(e: any) => this.handleUpload(e)}
                    id="validationFormik107"
                    />
                {/* <Form.File
                    className="position-relative"
                    required
                    name="file"
                    label="IC cropped"
                    onChange={(e: any) => this.handleUpload(e)}
                    id="validationFormik107"
                    />
                <Form.File
                    className="position-relative"
                    required
                    name="file"
                    label="IC Back"
                    onChange={(e: any) => this.handleUpload(e)}
                    id="validationFormik107"
                    />
                <Form.File
                    className="position-relative"
                    required
                    name="file"
                    label="Selfie Video"
                    onChange={(e: any) => this.handleUpload(e)}
                    id="validationFormik107"
                    />
                <Form.File
                    className="position-relative"
                    required
                    name="file"
                    label="JSON"
                    onChange={(e: any) => this.handleUpload(e)}
                    id="validationFormik107"
                    /> */}
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
    setupOptions: state.general.setupOptions,
    loadedIDs: state.general.loadedIDs
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SetupView);