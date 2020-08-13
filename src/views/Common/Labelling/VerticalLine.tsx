import React from "react";

interface IProps {
    x: number,
    imageProps: any
}

const VerticalLine: React.FC<IProps> = ({x, imageProps}) => {
    
    const calculateLeft = () => {
        const left = Math.max(0, x - imageProps.offsetX);
        return Math.min(imageProps.width, left);
    }

    return (
        <div id="verticalLine" className="line" style={{
            left: calculateLeft(),
            height: imageProps.height
        }}></div>
    );
}

export default VerticalLine;