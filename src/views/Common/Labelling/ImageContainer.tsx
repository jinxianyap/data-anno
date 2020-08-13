import { connect } from "react-redux";
import { setImageProps } from "../../../store/image/actionCreators";
import React from "react";
import { AppState } from "../../../store";
import { ImageState, ImageActionTypes } from "../../../store/image/types";

interface IProps {
    currentImageState: ImageState,
    setImageProps: (props: any) => ImageActionTypes
}


class ImageContainer extends React.Component<IProps> {

    height = 0;
    width = 0;
    imagePropsSet = false;
    el: any = undefined;

   /**
   * Add event listener
   */
  componentDidMount() {
    window.addEventListener("resize", this.setDimensions);
    // console.log(this.props.currentImageState);
  }

  /**
   * Remove event listener
   */
  componentWillUnmount() {
    window.removeEventListener("resize", this.setDimensions);
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    Object.entries(this.props).forEach(([key, val]) =>
      prevProps[key] !== val && console.log(`Prop '${key}' changed`)
    );
    if (this.state) {
      Object.entries(this.state).forEach(([key, val]) =>
        prevState[key] !== val && console.log(`State '${key}' changed`)
      );
    }
  }

  getDocumentRelativeElementOffset = (el: any) => {
    const rootEl = this.getRootOfEl(el);
    const { left: docLeft, top: docTop } = rootEl.getBoundingClientRect();

    const {
      left: elLeft,
      top: elTop,
      width: w,
      height: h
    } = el.getBoundingClientRect();

    return {
      x: Math.abs(docLeft) + elLeft,
      y: Math.abs(docTop) + elTop,
      h,
      w
    };
  }

  getRootOfEl = (el: any): any => {
    if (el.parentElement) {
      return this.getRootOfEl(el.parentElement);
    }
    return el;
  }

  calculateOffset = () => {
    // from react-cursor-position
    // https://github.com/ethanselzer/react-cursor-position/blob/master/src/ReactCursorPosition.js
    const { x, y } = this.getDocumentRelativeElementOffset(this.el);
    return { offsetX: x, offsetY: y };
  }

  onImgLoad = ({ target: img }: any) => {
      console.log("Image loaded");
      this.height = img.offsetHeight;
      this.width = img.offsetWidth;
      this.setDimensions();
  }

  setDimensions = () => {
      if (this.imagePropsSet) {
          return;
      }
      const { offsetX, offsetY } = this.calculateOffset();
      let props = {
            height: this.height,
            width: this.width,
            offsetX: offsetX,
            offsetY: offsetY
        }
      this.props.setImageProps(props);
      this.imagePropsSet = true;
  }

  render() {
    //   console.log(URL.createObjectURL(this.props.currentImageState.image));
    return (
        <div>
            <img
                id="LabelViewImg"
                className="unselectable"
                src={URL.createObjectURL(this.props.currentImageState.image)}
                alt=""
                onLoad={this.onImgLoad}
                ref={el => {this.el = el}}
            />
            <h5>Number of ID boxes: {this.props.currentImageState.segEdit.IDBoxes.length}</h5>
        </div>

    );
  }
}
const mapStateToProps = (state: AppState) => {
  return {
    currentImageState: state.image
  };
};

const mapDispatchToProps = {
    setImageProps
}

export default connect(mapStateToProps, mapDispatchToProps)(ImageContainer);