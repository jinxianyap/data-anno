import React from "react";
import BoundingBox from "./BoundingBox";
import { IDBox } from "../../../store/image/types";

/**
 * Presentational component:
 * Renders `BoundingBox`s passed in through props.
 * Renders `BoundingBox`s passed in through props.
 */

interface IProps {
    boxes: IDBox[],
    isDrawing: boolean
}


const BoundingBoxes: React.FC<IProps> = ({boxes, isDrawing}) => {

    // make BoundingBox component for each box that needs to
    // be rendered
    const boxesToRender = boxes.map((box: IDBox, index: any) => {
      return <BoundingBox key={box.id} isDrawing={isDrawing} box={box} />;
    });

    return (
      <div id="BoundingBoxes">
        {boxesToRender.length > 0 && boxesToRender}
      </div>
    );
}

export default BoundingBoxes;