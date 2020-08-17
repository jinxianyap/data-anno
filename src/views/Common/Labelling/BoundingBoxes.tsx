import React from "react";
import BoundingBox from "./BoundingBox";
import { LandmarkOCRData } from "../../../store/image/types";

/**
 * Presentational component:
 * Renders `BoundingBox`s passed in through props.
 * Renders `BoundingBox`s passed in through props.
 */

interface IProps {
    boxes: LandmarkOCRData[],
    isDrawing: boolean
}


const BoundingBoxes: React.FC<IProps> = ({boxes, isDrawing}) => {

    // make BoundingBox component for each box that needs to
    // be rendered
    const boxesToRender = boxes.map((box: LandmarkOCRData, index: any) => {
      return <BoundingBox key={box.id} isDrawing={isDrawing} box={box} />;
    });

    return (
      <div id="BoundingBoxes">
        {boxesToRender.length > 0 && boxesToRender}
      </div>
    );
}

export default BoundingBoxes;