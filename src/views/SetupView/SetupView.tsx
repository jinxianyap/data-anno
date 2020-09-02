import React from 'react';
import './SetupView.scss'
import { Form, Button, Container, Card } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import { ProcessType, CurrentStage, UsersTemp, DatabasesTemp } from '../../utils/enums';
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

    componentWillMount() {
        this.props.restoreImage();
        this.props.restoreID();
        this.props.restoreGeneral();
    }

    componentDidMount() {
        axios.get('http://localhost:3000/getImage/0001').then((res: any) => {
            console.log(res);
            let img = new Image();
            img.src = 'data:image/jpg;base64,' + res.data;
            img.onload = () => {
                document.getElementById("root")!.appendChild(img);
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
            var reader = new FileReader();
            reader.onload = (event: any) => {
                //temp to simulate loading fileobjects from database
                let json: any;
                try {
                    json = JSON.parse(event.target!.result!);
                } catch (err) {
                    console.error(err);
                    let folders = [];
                    let IDFolder1 = DatabaseUtil.loadIntoIDFolder(st.files, 0);
                    folders.push(IDFolder1);
                    let IDFolder2 = DatabaseUtil.loadIntoIDFolder(st.files, 1);
                    folders.push(IDFolder2);
                    this.props.loadFromDatabase(folders);
                    this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                } finally {
                    let folders = [];
                    let IDFolder1 = DatabaseUtil.loadIntoIDFolder(st.files, 0, json);
                    folders.push(IDFolder1);
                    let IDFolder2 = DatabaseUtil.loadIntoIDFolder(st.files, 1, json);
                    folders.push(IDFolder2);
                    this.props.loadFromDatabase(folders);
                    this.props.progressNextStage(CurrentStage.SEGMENTATION_CHECK);
                }
            }
            reader.readAsText(st.files[4]);
        }
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
                        {/* <input type="file" multiple/> */}
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