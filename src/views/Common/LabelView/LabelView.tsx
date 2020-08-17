import { connect } from "react-redux";
// import { ActionCreators as UndoActionCreators } from "redux-undo";
import { addIDBox, addLandmarkData } from "../../../store/image/actionCreators";
import React from "react";
import BoundingBoxes from "../Labelling/BoundingBoxes";
import ImageContainer from "../Labelling/ImageContainer";
import Crosshair from "../Labelling/Crosshair";
// import InfoPanel from "../components/InfoPanel";
import { calculateRectPosition, isRectangleTooSmall } from "../../../utils/DrawingUtil";
import { IDBox, ImageActionTypes, ImageState, LandmarkData, Position } from "../../../store/image/types";
import { AppState } from "../../../store";
// import SubmitButtonContainer from "../containers/SubmitButtonContainer";
import './LabelView.scss';
import { ImageUtil } from "../../../utils/ImageUtil";
import options from '../../../options.json';
import { IDState } from "../../../store/id/types";
import { IDProcess } from "../../../utils/enums";
import BoundingBox from "../Labelling/BoundingBox";


interface IProps {
    ID: IDState;
    image: ImageState;
    currentLandmark: string;
    addIDBox: (box: IDBox, croppedID: File) => ImageActionTypes;
    addLandmarkData: (index: number, landmark: LandmarkData) => ImageActionTypes;
}

interface IState {
    isDrawing: boolean,
    currentBoxId: number,
    startX?: number,
    startY?: number,
    currX?: number,
    currY?: number,
    imgLoaded: boolean,
    // imageUrl: string,
    showCrosshair: boolean 
}

class LabelView extends React.Component<IProps, IState> {

    index: number = 0;
    landmarks: any = undefined;

    constructor(props: IProps) {
      super(props);
      this.state = {
        isDrawing: false,
        currentBoxId: 0,
        // startX: null,
        // startY: null,
        // currX: null,
        // currY: null,
        imgLoaded: false,
        // imageUrl: null,
        showCrosshair: true
      };
    }

    componentWillMount() {
      for (var i = 0; i < this.props.image.segEdit.internalIDProcessed.length; i++) {
        if (!this.props.image.segEdit.internalIDProcessed) {
          this.index = i;
          break;
        }
      }
    }
  
    /**
     * Add event listener
     */
    componentDidMount() {
    //   document.addEventListener("keydown", this.handleKeyPress);
    }
  
    /**
     * Remove event listener
     */
    componentWillUnmount() {
    //   document.removeEventListener("keydown", this.handleKeyPress);
    }
  
    getCurrentBox = () => {
      return {
        startX: this.state.startX,
        startY: this.state.startY,
        currX: this.state.currX,
        currY: this.state.currY
      };
    }
  
    // handleKeyPress = (event: any) => {
    //   switch (event.keyCode) {
    //     case 67:
    //       console.log("You just pressed C!");
    //       this.setState(prevState => {
    //         return {
    //           showCrosshair: !prevState.showCrosshair
    //         }
    //       });
    //       break;
    //     case 90:
    //       console.log("You just pressed Z!");
    //       if (this.props.canUndo) this.props.onUndo();
    //       break;
    //     case 88:
    //       console.log("You just pressed X!");
    //       if (this.props.canRedo) this.props.onRedo();
    //       break;
    //     default:
    //       break;
    //   }
    // }
  
    createRectangle = (event: any) => {
      this.setState({
        isDrawing: true,
        startX: event.pageX,
        startY: event.pageY,
        currX: event.pageX,
        currY: event.pageY
      });
    }
  
    updateCursorPosition = (event: any) => {
      this.setState({
        currX: event.pageX,
        currY: event.pageY
      });
    }
  
    mouseDownHandler = (event: any) => {
      // console.log("down");
      // only start drawing if the mouse was pressed
      // down inside the image that we want labelled
      if (!this.props.currentLandmark) {
        return;
      }

      console.log(event.target.className);
      if (
        event.target.className !== "line" &&
        event.target.id !== "LabelViewImg" &&
        event.target.className !== "BoundingBox" &&
        event.target.id !== "Crosshair"
      )
        return;
      event.persist();
      this.createRectangle(event);
    }
  
    mouseMoveHandler = (event: any) => {
      // console.log("move");
      // only update the state if is drawing
      if (!this.props.currentLandmark) {
        return;
      }
      event.persist();
      this.updateCursorPosition(event);
    }
  
    mouseUpHandler = (event: any) => {
      // console.log(this.props.imageProps);
      // console.log("up");
      if (!this.props.currentLandmark) {
        return;
      }
      const boxPosition = calculateRectPosition(
        this.props.image.imageProps[this.index],
        this.getCurrentBox()
      );
      if (this.state.isDrawing && !isRectangleTooSmall(boxPosition)) {
        let landmark: LandmarkData = {
          type: 'landmark',
          id: this.state.currentBoxId,
          name: this.props.currentLandmark,
          position: boxPosition,
          flags: []
        }
        this.props.addLandmarkData(this.index, landmark);
      }
      this.refreshDrawing();
    }
  
    refreshDrawing = () => {
      this.setState({
            ...this.state,
            currentBoxId: (this.state.isDrawing
                ? this.state.currentBoxId + 1
                : this.state.currentBoxId),
            isDrawing: false,
            startX: undefined,
            startY: undefined
        });
    }
  
    isCrosshairReady = () => {
      return this.props.currentLandmark &&
        this.state.currX &&
        this.state.currY &&
        this.props.image.imageProps[this.index].height &&
        this.props.image.imageProps[this.index].width;
    }
  
    render() {
      let committedBoxes: LandmarkData[] = this.props.image.landmark[this.index];
      let boxesToRender: LandmarkData[] = [];
  
      if (this.state.startX != null) {
        boxesToRender.push({
          id: this.state.currentBoxId,
          name: this.props.currentLandmark,
          type: 'landmark',
          position: calculateRectPosition(
            this.props.image.imageProps[this.index],
            this.getCurrentBox()
          ),
          flags: []
        });
      }
  
      return (
        <div
          id="LabelViewContainer"
          onMouseDown={this.mouseDownHandler}
          onMouseUp={this.mouseUpHandler}
          onMouseMove={this.mouseMoveHandler}
        >
          <div id="Middle">
            <div id="LabelView">
              {this.state.showCrosshair && this.isCrosshairReady() &&
                <Crosshair
                  x={this.state.currX!}
                  y={this.state.currY!}
                  imageProps={this.props.image.imageProps[this.index]}
                />
              }
              {committedBoxes.length > 0 && (
                <BoundingBoxes
                //   className="BoundingBoxes unselectable"
                  boxes={committedBoxes}
                  isDrawing={this.state.isDrawing}
                />
              )}
              {boxesToRender.length > 0 && (
                <BoundingBoxes
                //   className="BoundingBoxes unselectable"
                  boxes={boxesToRender}
                  isDrawing={this.state.isDrawing}
                />
              )}
              <ImageContainer index={this.index} />
            </div>
            {/* {this.props.showSidePanel &&
              <div id="SidePanel"> */}
                {/* <InfoPanel /> */}
                {/* <SubmitButtonContainer /> */}
              {/* </div>
            } */}
            <div style={{clear: "both"}} />
          </div>
        </div>
      );
    }
}

const mapStateToProps = (state: AppState, ownProps: any) => ({
//   const committedBoxesArray = preprocess(state.turktool.committedBoxes.present);
//   // console.log(committedBoxesArray);
//   return {
//     committedBoxes: committedBoxesArray,
//     imageProps: state.turktool.imageProps,
//     canUndo: state.turktool.committedBoxes.past.length > 0,
//     canRedo: state.turktool.committedBoxes.future.length > 0,
//     taskId: ownProps.taskId
//   };
    ID: state.id,
    image: state.image,

    // Landmark Stage
    currentLandmark: state.image.currentLandmark!
});

const mapDispatchToProps = {
    addIDBox,
    addLandmarkData
}

export default connect(
    mapStateToProps, 
    mapDispatchToProps
)(LabelView);
