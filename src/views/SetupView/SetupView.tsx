import React from 'react';
import './SetupView.scss'
import { Form, Button, Container, Card } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { ProcessType, CurrentStage, UsersTemp } from '../../utils/enums';
import { SetupOptions, GeneralActionTypes } from '../../store/general/types';
import { saveSetupOptions, progressNextStage, loadFromDatabase, restoreGeneral } from '../../store/general/actionCreators';
import { restoreID } from '../../store/id/actionCreators';
import { restoreImage } from '../../store/image/actionCreators';
import { AppState } from '../../store';
import {connect} from "react-redux";
import { DatabaseUtil } from '../../utils/DatabaseUtil';
import { IDState, IDActionTypes } from '../../store/id/types';
import { ImageActionTypes } from '../../store/image/types';
const axios = require('axios');

interface IProps {
    saveSetupOptions: (setupOptions: SetupOptions) => GeneralActionTypes;
    progressNextStage: (nextStage: CurrentStage) => GeneralActionTypes;
    loadFromDatabase: (IDs: IDState[]) => GeneralActionTypes;
    restoreGeneral: () => GeneralActionTypes;
    restoreID: () => IDActionTypes;
    restoreImage: () => ImageActionTypes;
    setupOptions: SetupOptions;
}

interface IState {
    databases: {
        name: string,
        dates: Date[],
    }[],
    selectedDates: Date[],
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
            databases: [],
            selectedDates: [],
            user: UsersTemp.Bob,
            database: '',
            startDate: new Date(),
            endDate:new Date(),
            processType: ProcessType.WHOLE,
            incomplete: false,
            loadedIDs: false,
            files: []
        };
    }

    componentWillMount() {
        this.props.restoreImage();
        this.props.restoreID();
        this.props.restoreGeneral();
    }

    componentDidMount() {
        axios.get('/getDatabases').then((res: any) => {
            if (res.status === 200) {
                let dbs = res.data.map((each: any) => {
                    return {
                        name: each.database,
                        dates: each.dates.map((date: string) => new Date(
                            parseInt(date.slice(0, 4)), 
                            parseInt(date.slice(4, 6)) - 1, 
                            parseInt(date.slice(6, 8))))
                    }
                });
                this.setState({
                    databases: dbs, 
                    database: dbs[0].name, 
                    selectedDates: dbs[0].dates, 
                    startDate: dbs[0].dates[0],
                    endDate: dbs[0].dates.slice(-1)[0]
                });
            }
        });
    }

    handleSubmit = (e: any) => {
        e.preventDefault();
        if (this.state.user === '' || this.state.database === '') {
            this.setState({incomplete: true});
        } else {
            let st = this.state;
            let setup: SetupOptions = {
                user: st.user,
                database: st.database,
                startDate: st.startDate,
                endDate: st.endDate,
                processType: st.processType
            }
            this.props.saveSetupOptions(setup);
            axios.post('/loadDatabase', {
                database: st.database,
                startDate: DatabaseUtil.dateToString(st.startDate),
                endDate: DatabaseUtil.dateToString(st.endDate)
            }).then((res: any) => {
                if (res.status === 200) {
                    let IDs: IDState[] = [];
                    for (let i = 0; i < res.data.length; i++) {
                        for (let j = 0; j < res.data[i].sessions.length; j++) {
                            IDs.push(DatabaseUtil.initializeID(res.data[i].sessions[j], res.data[i].date, IDs.length));
                        }
                    }
                    this.props.loadFromDatabase(IDs);

                    this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                }
            })
        }
    }

    handleDBSelect = (e: any) => {
        let db = this.state.databases.find((each) => each.name === e.target.value)!;
        this.setState({
            database: e.target.value,
            selectedDates: db.dates,
            startDate: db.dates[0],
            endDate: db.dates[db.dates.length - 1]
        })
    }

    handleUpload = (e: any) => {
        let files = this.state.files;
        files.push(e.target.files[0]);
        this.setState({files: files});
    }

    render() {
        return (
            <Container className="setupView">
                <Card style={{padding: "2rem"}}>               
                    <Form onSubmit={this.handleSubmit}>
                        <Form.Group controlId="setupUser">
                            <Form.Label>User</Form.Label>
                            <Form.Control as="select" value={this.state.user} onChange={(e: any) => this.setState({user: e.target.value})} >
                                {Object.entries(UsersTemp).map(([key, value]) => <option key={value} value={value}>{key}</option>)}
                            </Form.Control>
                        </Form.Group>

                        <Form.Group controlId="database">
                            <Form.Label>Database</Form.Label>
                            <Form.Control as="select" value={this.state.database} onChange={(e: any) => this.handleDBSelect(e)}>
                                {this.state.databases.map((each, idx) => <option key={idx} value={each.name}>{each.name}</option>)}
                            </Form.Control>
                        </Form.Group>
            
                        <Form.Group controlId="startDate">
                            <Form.Label>Start Date</Form.Label>
                            <DatePicker id="startDatepicker" includeDates={this.state.selectedDates} 
                            selected={this.state.startDate} onChange={(date: Date) => this.setState({startDate: date})} />
                        </Form.Group>

                        <Form.Group controlId="endDate">
                            <Form.Label>End Date</Form.Label>
                            <DatePicker id="endDatepicker" includeDates={this.state.selectedDates}
                            selected={this.state.endDate} onChange={(date: Date) => this.setState({endDate: date})} />
                        </Form.Group>

                        <Form.Group controlId="process">
                            <Form.Label>Process</Form.Label>
                            <Form.Control as="select" defaultValue={this.state.processType} onChange={(e: any) => this.setState({processType: e.target.value})}>
                                <option key="full" value={ProcessType.WHOLE}>Full</option>
                                <option key="seg" value={ProcessType.SEGMENTATION}>Up to Segmentation</option>
                                <option key="landmark" value={ProcessType.LANDMARK}>Up to Landmark</option>
                                <option key="ocr" value={ProcessType.OCR}>Up To OCR</option>
                                <option key="liveness" value={ProcessType.LIVENESS}>Up To Liveness</option>
                                <option key="face" value={ProcessType.FACE}>Liveness &amp; Face Comparison Only</option>
                            </Form.Control>
                        </Form.Group>

                        

                        {/* <Form.Group controlId="fileUpload">
                        <Form.File
                            className="position-relative"
                            required
                            name="file"
                            label="IC Front"
                            onChange={(e: any) => this.handleUpload(e)}
                            />
                        <Form.File
                            className="position-relative"
                            required
                            name="file"
                            label="IC cropped"
                            onChange={(e: any) => this.handleUpload(e)}
                            />
                        <Form.File
                            className="position-relative"
                            required
                            name="file"
                            label="IC Back"
                            onChange={(e: any) => this.handleUpload(e)}
                            />
                        <Form.File
                            className="position-relative"
                            required
                            name="file"
                            label="Selfie Video"
                            onChange={(e: any) => this.handleUpload(e)}
                            />
                        <Form.File
                            className="position-relative"
                            required
                            name="file"
                            label="JSON"
                            onChange={(e: any) => this.handleUpload(e)}
                            />
                        </Form.Group> */}

                        { this.state.incomplete
                            ? <p color='red'>Form not complete.</p>
                            : <div />
                        }

                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </Form>
                </Card>
            </Container>
        )
    }
}

const mapDispatchToProps = {
    saveSetupOptions,
    progressNextStage,
    loadFromDatabase,
    restoreGeneral,
    restoreID,
    restoreImage
};

const mapStateToProps = (state: AppState) => ({
    setupOptions: state.general.setupOptions,
    loadedIDs: state.general.loadedIDs
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SetupView);