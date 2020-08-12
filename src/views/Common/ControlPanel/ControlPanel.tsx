import React from 'react';
import { connect } from 'react-redux';
import { CurrentStage } from '../../../utils/enums';
import { AppState } from '../../../store';
import { Form } from 'react-bootstrap';
import options from '../../../options.json';
import './ControlPanel.scss';

interface IProps {
    currentStage: CurrentStage;


}

interface IState {
    // Seg Check
    documentTypes: string[];
    docType: string;
    cropPass: boolean;
    cropDirty: boolean;
    validation: boolean;
}

class ControlPanel extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            documentTypes: [],
            docType: '',
            cropPass: false,
            cropDirty: false,
            validation: false
        }
    }

    componentWillMount() {
        this.loadDocumentTypes();
    }


    loadDocumentTypes = () => {
        this.setState({
            documentTypes: options.documentTypes,
            docType: options.documentTypes[0]
        });
        console.log(options.documentTypes);
        console.log(options.documentTypes[0]);
    }

    // Seg Check Components
    segCheck = () => {
        return (
            <Form>
                <Form.Group controlId="docType">
                    <Form.Label>Document Type</Form.Label>
                    <Form.Control as="select" value={this.state.docType} onChange={(e: any) => this.setState({docType: e.target.value})}>
                        {Object.entries(this.state.documentTypes).map(([key, value]) => <option value={value}>{value}</option>)}
                    </Form.Control>
                </Form.Group>
            </Form>
        )
    }

    render() {
        const controlFunctions = () => {
            switch (this.props.currentStage) {
                case (CurrentStage.SEGMENTATION_CHECK): {
                    return this.segCheck();
                }
            }
        }

        return (
            <div id="controlPanel">
                {controlFunctions()}
            </div>
        );
    }

}

const mapDispatchToProps = {
};

const mapStateToProps = (state: AppState) => ({
    currentStage: state.general.currentStage,
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ControlPanel);