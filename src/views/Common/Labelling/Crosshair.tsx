import React from "react";
import VerticalLine from "./VerticalLine";
import HorizontalLine from "./HorizontalLine";

interface IProps {
    x: number,
    y: number,
    imageProps: any
}

const Crosshair: React.FC<IProps> = ({x, y, imageProps}) => {

    const mouseMoveHandler = () => {
        // console.log('move');
    }

    const mouseOverHandler = () => {
        // console.log('over');
    }

    return (
        <div
            id="Crosshair"
            className="unselectable"
            onMouseOver={mouseOverHandler}
            onMouseMove={mouseMoveHandler}
        >
            <VerticalLine x={x} imageProps={imageProps} />
            <HorizontalLine y={y} imageProps={imageProps} />
        </div>
    );

}

export default Crosshair;
