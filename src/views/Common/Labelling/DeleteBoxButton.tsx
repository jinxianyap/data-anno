import React from "react";
import { connect } from "react-redux";
import { deleteIDBox } from "../../../store/image/actionCreators";
import { AppState } from "../../../store";
import { ImageActionTypes } from "../../../store/image/types";

interface IProps {
    boxId: number,
    isDrawing: boolean,
    deleteIDBox: (id: number) => ImageActionTypes
}

class DeleteBoxButton extends React.Component<IProps> {

    clickHandler = () => {
        console.log("Delete box " + this.props.boxId);
        this.props.deleteIDBox(this.props.boxId);
    }

    render() {
        return (
            <div className="DeleteBoxButton" onClick={this.clickHandler}>
            X
            </div>
        );
    }
}

const mapStateToProps = (state: AppState, ownProps: any) => ({
      boxId: ownProps.boxId,
      isDrawing: ownProps.isDrawing
});
  
const mapDispatchToProps = {
    deleteIDBox
};
  
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(DeleteBoxButton);
  