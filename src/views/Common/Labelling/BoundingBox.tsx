import React from "react";
import { LandmarkOCRData } from "../../../store/image/types";
import DeleteBoxButton from "./DeleteBoxButton";

interface IProps {
    isDrawing: boolean
    box: LandmarkOCRData
}

interface IState {
    mouseOver: boolean,
    position: {
      left: number,
      top: number,
      width: number,
      height: number
    }
}

export default class BoundingBox extends React.Component<IProps, IState> {
  
    timer: any;

    constructor(props: IProps) {
        super(props);
        this.timer = null;
        this.state = {
          mouseOver: false,
          position: {
            left: props.box.position.x1,
            top: props.box.position.y1,
            width: props.box.position.x2 - props.box.position.x1,
            height: props.box.position.y1 - props.box.position.y4
          }
        };
        console.log('bounding');
        console.log(this.props.box);
        console.log(this.state.position);
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
        style={this.state.position}
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
