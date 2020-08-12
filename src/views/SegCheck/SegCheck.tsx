import React from 'react';
import { connect } from 'react-redux';
import { IDFolder, GeneralActionTypes } from '../../store/general/types';
import { ImageActionTypes } from '../../store/image/types';
import { getNextImage } from '../../store/general/actionCreators';
import { loadImageState } from '../../store/image/actionCreators';
import { AppState } from '../../store';

interface IProps {
    IDLibrary: IDFolder[];
    currentIndex: number;
    currentImage: IDFolder;
    getNextImage: () => GeneralActionTypes;
    loadImageState: (currentID: IDFolder) => ImageActionTypes;
}

interface IState {
    ID: IDFolder;
    // validation + storing results stuff
}

class SegCheck extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            ID: {
                processed: false,
                source: '',
                index: 0,
            },
        }
    }

    loadImage = () => {
        let location = document.getElementById("imgLocation");
        let image = new Image(500, 500);
        let blob = this.state.ID.originalID;
        image.src = URL.createObjectURL(blob);
        location!.appendChild(image);
    }

    componentWillMount() {
        let props = this.props;
        props.getNextImage();
        let currentID = props.IDLibrary[props.currentIndex];
        props.loadImageState(currentID);
        this.setState({ID: currentID})
    }

    componentDidMount() {
        this.loadImage();
    }

    render() {
        return (
            <div>
                <div id="imgLocation"></div>
            </div>
        )
    }

}

const mapDispatchToProps = {
    getNextImage,
    loadImageState,
};

const mapStateToProps = (state: AppState) => ({
    IDLibrary: state.general.IDLibrary,
    currentIndex: state.general.currentIndex,
    currentImage: state.image.currentImage
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SegCheck);