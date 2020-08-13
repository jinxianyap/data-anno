import React from "react";

interface IProps {
    y: number,
    imageProps: any
}

const HorizontalLine: React.FC<IProps> = ({y, imageProps}) => {

    const calculateTop = () => {
        const top = Math.max(0, y - imageProps.offsetY);
        return Math.min(imageProps.height, top);
    }

    return (
        <div id="horizontalLine" className="line" style={{
            top: calculateTop(),
            width: imageProps.width
        }}></div>
    );
}

export default HorizontalLine;