import React from 'react';
import { Container, Table, Button } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { IDState } from '../../../store/id/types';
import { DatabaseUtil } from '../../../utils/DatabaseUtil';
import { CurrentStage } from '../../../utils/enums';
import { progressNextStage } from '../../../store/general/actionCreators';
import { GeneralActionTypes } from '../../../store/general/types';
import { GeneralUtil } from '../../../utils/GeneralUtil';
const axios = require('axios');

interface IProps {
    IDLibrary: IDState[],
    database: string,
    progressNextStage: (stage: CurrentStage) => GeneralActionTypes;
}

interface IState {
    saveSuccess?: boolean,
    errorMsg?: string,
    saveOutputStatus: {
        sessionID: string,
        success: boolean
    }[]
}

class Output extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            saveSuccess: undefined,
            errorMsg: undefined,
            saveOutputStatus: []
        }
    }

    componentDidMount() {
        console.log(this.props.IDLibrary.map(DatabaseUtil.extractOutput));
        GeneralUtil.toggleOverlay(true);
        axios.post('/returnOutput', {
            database: this.props.database,
            library: this.props.IDLibrary.map(DatabaseUtil.extractOutput),
            overwrite: true
        }).then((res: any) => {
            if (res.status === 200) {
                this.setState({ saveSuccess: true, saveOutputStatus: res.data.map((each: any) => {return {sessionID: each.sessionID, success: each.success}})});
            } else {
                this.setState({ saveSuccess: false, errorMsg: res.message });
            }
            GeneralUtil.toggleOverlay(false);
        }).catch((err: any) => {
            console.error(err);
            GeneralUtil.toggleOverlay(false);
            this.setState({ saveSuccess: false, errorMsg: err})
        });
    }

    render() {
        if (this.state.saveSuccess === undefined) {
            return <div />
        } else {
            return (
                <Container style={{padding: "2rem"}}>
                    <h5 style={{width: "fit-content", margin: "1rem auto"}}>
                    {this.state.saveSuccess ? 'Successfully saved annotation results.' : 'Failed to save annotation results.'}</h5>
                    {
                        this.state.saveSuccess ?
                        <Table striped bordered hover size="sm">
                            <thead>
                            <tr>
                                <th>Session ID</th>
                                <th>Saved</th>
                            </tr>
                            </thead>
                            <tbody>
                            {
                                this.state.saveOutputStatus.map((each) => {
                                    return (
                                        <tr>
                                            <td>{each.sessionID}</td>
                                            <td>{each.success.toString()}</td>
                                        </tr>
                                    )
                                })
                            }
                            </tbody>
                        </Table>
                        : <h6>{this.state.errorMsg}</h6>
                    }
                    <Button style={{margin: "1rem auto"}} onClick={() => this.props.progressNextStage(CurrentStage.SETUP)}>Go to Setup</Button>
                </Container>
            );
        }
    }
}

const mapDispatchToProps = {
    progressNextStage
}

const mapStateToProps = (state: AppState) => {
    return {
        database: state.general.setupOptions.database,
        IDLibrary: state.general.IDLibrary
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Output);
