import React from 'react';
import './SetupView.scss'
import { Form, Button, Container, Card, Modal, Table } from 'react-bootstrap';
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
import bsCustomFileInput from 'bs-custom-file-input'
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
    useCSV: boolean,
    showCSVResultModal: boolean,
    CSVResults: {date: string, sessionID: string, success: boolean}[],
    CSVFile?: File
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
            useCSV: false,
            showCSVResultModal: false,
            CSVResults: []
        };
    }

    componentWillMount() {
        this.props.restoreImage();
        this.props.restoreID();
        this.props.restoreGeneral();
    }

    componentDidMount() {
        bsCustomFileInput.init();
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

    handleSubmit = async (e: any) => {
        e.preventDefault();
        if (this.state.user === '' || this.state.database === '') {
            this.setState({incomplete: true});
        } else {
            if (this.state.useCSV) {
                if (this.state.CSVFile!.name.slice(-3) !== 'csv') {
                    alert('Please upload a CSV file.');
                    return;
                }
                const parseCSVText = () => {
                    return new Promise<{date: string, sessionID: string}[]>((res, rej) => {
                        let fr = new FileReader();
                        fr.onload = function() {
                            if (fr.result !== undefined && fr.result !== null && typeof(fr.result) === 'string') {
                                let str = fr.result;
                                let lines = str.split('\n');
                                let entries: {date: string, sessionID: string}[] = [];
                                
                                lines.forEach((each: string) => {
                                    if (entries.find((e) => e.date === each.split(',')[0] && e.sessionID === each.split(',')[1]) === undefined) {
                                        entries.push({
                                            date: each.split(',')[0],
                                            sessionID: each.split(',')[1]
                                        });
                                    }
                                })
                                entries.sort((a, b) => {
                                    if (a.date == b.date) {
                                        return a.sessionID.localeCompare(b.sessionID);
                                    } else {
                                        return a.date.localeCompare(b.date);
                                    }
                                })
                                res(entries);
                            } else {
                                alert('Could not read CSV file.');
                                res([]);
                            }
                        }
                        fr.readAsText(this.state.CSVFile!);
                    })
                }

                let st = this.state;
                let setup: SetupOptions = {
                    user: st.user,
                    database: st.database,
                    processType: st.processType
                }
                this.props.saveSetupOptions(setup);

                parseCSVText().then((sessions: {date: string, sessionID: string}[]) => {
                    if (sessions.length > 0) {
                        axios.post('/loadDatabaseSelective', {
                            database: st.database,
                            sessions: sessions.filter((each) => each.date !== undefined && each.sessionID !== undefined 
                                && each.date.length > 0 && each.sessionID.length > 0)
                        }).then((res: any) => {
                            if (res.status === 200) {
                                let IDs: IDState[] = [];
                                for (let i = 0; i < res.data.length; i++) {
                                    if (res.data[i].success) {
                                        IDs.push(DatabaseUtil.initializeID(res.data[i].session, res.data[i].date, IDs.length));
                                    }
                                }
                                this.props.loadFromDatabase(IDs);
                                this.reportCSVLoadStatus(res.data);
                            }
                        }).catch((err: any) => {throw err});
                    }
                }).catch((err) => console.error(err));
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

                        if (st.processType === ProcessType.FACE) {
                            this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                        } else {
                            this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                        }
                    }
                }).catch((err: any) => console.error(err));
            }
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

    handleCSVUpload = (e:any) => {
        if (e.target.files.length > 0) {
            this.setState({useCSV: true, CSVFile: e.target.files[0]});
        }
    }

    reportCSVLoadStatus = (data: any) => {
        this.setState({showCSVResultModal: true, CSVResults: data.map((each: any) => {
            return {
                date: each.date,
                sessionID: each.session.sessionID,
                success: each.success
            }
        })})
    }

    render() {

        const hideCSVModal = () => {
            this.setState({showCSVResultModal: false}, () => {
                if (this.state.processType === ProcessType.FACE) {
                    this.props.progressNextStage(CurrentStage.FR_LIVENESS_CHECK);
                } else {
                    this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                }
            })
        }

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

                        <Form.Group>
                            <Form.Label style={{width: "100%"}}>Upload CSV</Form.Label>
                            <Form.File 
                                id="custom-file"
                                label="*.csv files only"
                                custom
                                onChange={this.handleCSVUpload}
                                style={{width: "calc(100% - 6rem)", display: "inline-block"}}
                            />
                            <Button style={{width: "5rem", verticalAlign: "bottom", marginLeft: "1rem", display: "inline-block"}} 
                                variant="danger" disabled={this.state.CSVFile === undefined}
                                onClick={() => this.setState({useCSV: false, CSVFile: undefined}, () => {
                                    let doc: any = document.getElementById("custom-file");
                                    doc.value = "";
                                    bsCustomFileInput.destroy();
                                    bsCustomFileInput.init();
                                })}>Delete</Button>
                        </Form.Group>
            
                        <Form.Group controlId="startDate">
                            <Form.Label style={{width: "100%"}}>Start Date</Form.Label>
                            <DatePicker id="startDatepicker" includeDates={this.state.selectedDates} disabled={this.state.CSVFile !== undefined}
                            selected={this.state.startDate} onChange={(date: Date) => this.setState({startDate: date})} />
                        </Form.Group>

                        <Form.Group controlId="endDate">
                            <Form.Label style={{width: "100%"}}>End Date</Form.Label>
                            <DatePicker id="endDatepicker" includeDates={this.state.selectedDates} disabled={this.state.CSVFile !== undefined}
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

                        { this.state.incomplete
                            ? <p color='red'>Form not complete.</p>
                            : <div />
                        }

                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </Form>
                </Card>
                <Modal style={{marginTop: '2rem'}} show={this.state.showCSVResultModal} onHide={hideCSVModal}>
                    <Modal.Header closeButton>
                    <Modal.Title>CSV Load Status</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{maxHeight: '50vh', overflowY: 'auto'}}>
                        <p>Loaded {this.state.CSVResults.filter((each) => each.success).length} sessions.</p>
                        <Table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Session ID</th>
                                    <th>Success</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    this.state.CSVResults.map((each, idx) => {
                                        return (
                                            <tr key={idx}>
                                                <td>{each.date}</td>
                                                <td>{each.sessionID}</td>
                                                <td>{each.success.toString()}</td>
                                            </tr>
                                        )
                                    })
                                }
                            </tbody>
                        </Table>
                    </Modal.Body>
                    <Modal.Footer>
                    <Button variant="secondary" onClick={hideCSVModal}>
                        Close
                    </Button>
                    </Modal.Footer>
                </Modal>
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