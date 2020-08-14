/**
 * Convert pair of raw coordinates to a div position
 * to render a rectangle on the screen.
 * @param {Object} imgProps Image properties, including the img
 *  element's `offsetX`, `offsetY`, `height` and `width`.
 * @param {Object} rawBoxCoords Box coordinates of  `startX`, `startY`, 
 *  currX`, and `currY`
 */
export function calculateRectPosition(imgProps: any, rawBoxCoords: any) {
    var left = Math.min(
      rawBoxCoords.startX,
      rawBoxCoords.currX
    );
    var top = Math.min(
      rawBoxCoords.startY,
      rawBoxCoords.currY
    );
    var right = Math.max(
      rawBoxCoords.startX,
      rawBoxCoords.currX
    );
    var bottom = Math.max(
      rawBoxCoords.startY,
      rawBoxCoords.currY
    );
    
    // width of div border
    const DIV_BORDER = 4
    const width = imgProps.width - DIV_BORDER;
    const height = imgProps.height - DIV_BORDER;
  
    // limit rectangles to the size of the image
    // so user can't draw rectangle that spill out of image
    left = Math.max(imgProps.offsetX, left);
    top = Math.max(imgProps.offsetY, top);
    right = Math.min(width + imgProps.offsetX, right);
    bottom = Math.min(height + imgProps.offsetY, bottom);
  
    console.log({
      left: left - imgProps.offsetX,
      top: top - imgProps.offsetY,
      width: right - left,
      height: bottom - top
    });
    return {
      x1: left - imgProps.offsetX,
      y1: top - imgProps.offsetY,
      x2: right - imgProps.offsetX,
      y2: top - imgProps.offsetY,
      x4: left- imgProps.offsetX,
      y3: top + top - imgProps.offsetY - bottom,
      x3: right - imgProps.offsetX,
      y4: top + top - imgProps.offsetY - bottom
      // width: right - left,
      // height: bottom - top
    };
  }
  
  /**
   * A predicate that returns true if the rectangle defined
   * by the supplied `position` argument is too small.
   * @param {Object} position Contains width and height as keys
   */
  export function isRectangleTooSmall(position: any) {
    if (position.width < 10 || position.height < 10) return true;
    return false;
  }
  