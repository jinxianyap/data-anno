import React from 'react';
import { Container, Table, Button } from 'react-bootstrap';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { CurrentStage } from '../../../utils/enums';
import { progressNextStage } from '../../../store/general/actionCreators';
import { GeneralActionTypes } from '../../../store/general/types';

interface IProps {
    saveResults: {sessionID: string, success: boolean}[],
    database: string,
    progressNextStage: (stage: CurrentStage) => GeneralActionTypes;
}

interface IState {
}

class Output extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
        }
    }

    componentDidMount() {
    }

    render() {
        return (
            <Container style={{padding: "2rem"}}>
                <h5 style={{width: "fit-content", margin: "1rem auto"}}>Database: {this.props.database}</h5>
                <Table striped bordered hover size="sm">
                    <thead>
                    <tr>
                        <th>Session ID</th>
                        <th>Saved</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.saveResults.map((each, idx) => {
                            return (
                                <tr key={idx}>
                                    <td>{each.sessionID}</td>
                                    <td>{each.success.toString()}</td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </Table>
                <Button style={{margin: "1rem auto"}} onClick={() => this.props.progressNextStage(CurrentStage.SETUP)}>Go to Setup</Button>
            </Container>
        );
    }
}

const mapDispatchToProps = {
    progressNextStage
}

const mapStateToProps = (state: AppState) => {
    return {
        database: state.general.setupOptions.database,
        saveResults: state.general.saveResults
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Output);
