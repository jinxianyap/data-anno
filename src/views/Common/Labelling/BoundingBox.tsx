import React from "react";
import { IDBox } from "../../../store/image/types";
import DeleteBoxButton from "./DeleteBoxButton";

interface IProps {
    isDrawing: boolean
    box: IDBox
}

interface IState {
    mouseOver: boolean,
}

export default class BoundingBox extends React.Component<IProps, IState> {
  
    timer: any;

    constructor(props: IProps) {
        super(props);
        this.timer = null;
        this.state = {
        mouseOver: false,
        };
    }

  mouseOverHandler = () => {
    if (!this.state.mouseOver && !this.props.isDrawing) {
      this.timer = setTimeout(() => {
        this.setState({ mouseOver: true });
      }, 100);
    }
  }

  mouseLeaveHandler = () => {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.setState({ mouseOver: false });
  }

  render() {
    return (
      <div
        className="BoundingBox"
        style={this.props.box.position}
        onMouseOver={this.mouseOverHandler}
        onMouseLeave={this.mouseLeaveHandler}
      >
        {this.state.mouseOver && (
          <DeleteBoxButton
            boxId={this.props.box.id}
            isDrawing={this.props.isDrawing}
          />
        )}
      </div>
    );
  }
}
