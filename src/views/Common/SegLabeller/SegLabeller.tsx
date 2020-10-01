import L from 'leaflet';
import React from 'react';
import { connect } from 'react-redux'; 
import { IDBox, ImageState } from '../../../store/image/types';
// import { setIDBox } from '../../../store/image/actionCreators';
import { AppState } from '../../../store';
import { CurrentStage, IDProcess } from '../../../utils/enums';
import { createNewID, setIDBox } from '../../../store/id/actionCreators';
import { IDActionTypes, InternalIDState, IDState } from '../../../store/id/types';

interface IProps {
    currentStage: CurrentStage,
    originalProcessed: boolean,
    currentID: IDState,
    internalIDs: InternalIDState[],
    IDImage: ImageState,
    committedBoxes: IDBox[],
    createNewID: (box: IDBox, passesCrop?: boolean) => IDActionTypes,
    setIDBox: (box: IDBox, croppedImage?: File) => IDActionTypes,
}

interface IState {
    source: string,
    map?: L.Map,

    naturalWidth: number,
    naturalHeight: number,
    width: number,
    height: number,
    xmargin: number,
    ymargin: number,
    ratio: number,

    stage: number,
    currentBox: SegBox,
    boxes: SegBox[],

    movingCircle?: {
        circle: L.Circle,
        index: number,
        boxIndex: number
    },
}

type SegBox = {
    id: number,
    position: {
        x1?: number,
        x2?: number,
        x3?: number,
        x4?: number,
        y1?: number,
        y2?: number,
        y3?: number,
        y4?: number,
    },
    textMarker?: L.Marker,
    circles: L.Circle[],
    lines: L.Polyline[]
}

class SegLabeller extends React.Component<IProps, IState> {

    colors: string[] = ['#ffe6e6', '#ff9c9c', '#ff5c5c', '#ff0000'];

    constructor(props: IProps) {
        super(props);
        // need to handle preloaded boxes
        this.state = {
            source: '',
            naturalWidth: 0,
            naturalHeight: 0,
            width: 0,
            height: 0,
            xmargin: 0,
            ymargin: 0,
            ratio: 0,
            stage: 0,
            currentBox: {
                id: 0,
                position: {},
                circles: [],
                lines: []
            },
            boxes: []
        }
    }

    componentDidMount() {
        if (this.props.IDImage.image.size !== 0 && this.props.IDImage.image.name !== '') {
            this.loadImageData();
        }
    }

    componentDidUpdate(previousProps: IProps, previousState: IState) {
        if (previousProps.currentStage !== this.props.currentStage && !this.state.map) {
            this.loadImageData();
            this.initializeMap();
        } else if (this.state.movingCircle === undefined
            && previousProps.currentStage === this.props.currentStage
            && previousState.boxes.length !== this.props.committedBoxes.length) {
            if (this.state.map !== undefined) {
                this.renderCommittedBoxes();
            }
        } else if (this.state.map !== undefined && this.props.currentID.internalIDs.length !== this.state.boxes.length) {
            if (this.props.currentID.originalIDProcessed && this.props.internalIDs[this.props.currentID.internalIndex] !== undefined
                && this.props.internalIDs[this.props.currentID.internalIndex].processStage === IDProcess.DOUBLE_BACK) {
                if (this.props.currentID.internalIDs.filter((each) => each.backID !== undefined && each.backID.IDBox !== undefined).length
                    !== this.state.boxes.length) {
                    this.renderCommittedBoxes();
                }
            } else {
                this.renderCommittedBoxes();
            }
        }
    }

    componentWillUnmount() {
        this.state.boxes.forEach((box) => {
            box.circles.forEach((circle) => circle.remove());
            box.lines.forEach((line) => line.remove());
            box.textMarker!.remove();
        });
    }

    loadImageData = () => {
        let image = new Image();
        image.onload = () => {
            let area = document!.getElementById("paint-area")!;
            let fitHeight = 800;
            let fitWidth = area !== undefined ? area.offsetWidth / 12 * 9 : 800;
            let height = 0;
            let width = 0;
            let ratio = 0;

            if (image.naturalHeight > image.naturalWidth) {
                ratio = image.naturalHeight / fitHeight;
                height = fitHeight;
                width = image.naturalWidth / ratio;
            } else {
                ratio = image.naturalWidth / fitWidth;
                width = fitWidth;
                height = image.naturalHeight / ratio;
            }

            let wrapper: HTMLElement = document.getElementById('seg-edit')!;
            let xmargin = (wrapper.clientWidth - width) / 4;
            let ymargin = (wrapper.clientHeight - height) / 4;

            this.setState({
                source: image.src,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                width: width,
                height: height,
                xmargin: xmargin,
                ymargin: ymargin,
                ratio: ratio,
            }, this.initializeMap);
        }
        image.src = URL.createObjectURL(this.props.IDImage.image);
    }

    initializeMap = () => {
        let st = this.state;
        let top: [number, number] = [0, 0];
        let wrapper: HTMLElement = document.getElementById('seg-edit')!;
        let mapBounds: [number, number][] = [[wrapper.clientHeight - st.ymargin, -st.xmargin], [- st.ymargin, wrapper.clientWidth - st.xmargin]];
        let imageBounds: [number, number][] = [[st.height, 0], [0, st.width]];

        let map = L.map('segLabeller', {
            center: top,
            crs: L.CRS.Simple,
            zoom: 8,
            dragging: true,
            maxBounds: mapBounds,
            maxBoundsViscosity: 1.0
        });

        let layer = new L.TileLayer('', {
            tileSize: L.point(st.height, st.width),
            noWrap: true
        });

        let overlay = L.imageOverlay(st.source, imageBounds);

        overlay.addTo(map);
        map.addLayer(layer);
        map.fitBounds(imageBounds);
        map.on('click', this.handleMapClick);
        map.on('mousedown', this.handleMouseDown);
        map.on('mousemove', this.handleMoveCircle);
        map.on('mouseup', this.handleDoneMoving);

        this.setState({map: map});
    }

    renderCommittedBoxes = () => {
        let boxes = this.props.committedBoxes;
        let map = this.state.map!;

        if (this.state.boxes.length > 0) {
            this.state.boxes.forEach((box) => {
                box.circles.forEach((circle) => circle.remove());
                box.lines.forEach((line) => line.remove());
                box.textMarker!.remove();
            });
            this.setState({boxes: []});
        }

        let newBoxes: SegBox[] = boxes.map((box) => {
            let x1 = box.position.x1 / this.state.ratio;
            let x2 = box.position.x2 / this.state.ratio;
            let x3 = box.position.x3 / this.state.ratio;
            let x4 = box.position.x4 / this.state.ratio;
            let y1 = box.position.y1 / this.state.ratio;
            let y2 = box.position.y2 / this.state.ratio;
            let y3 = box.position.y3 / this.state.ratio;
            let y4 = box.position.y4 / this.state.ratio;
            let circles: L.Circle[] = [
                L.circle([y1,x1], {
                    color: this.colors[0],
                    fillColor: this.colors[0],
                    fillOpacity: 0.5,
                    radius: 10
                }).addTo(map),
                L.circle([y2, x2], {
                    color: this.colors[1],
                    fillColor: this.colors[1],
                    fillOpacity: 0.5,
                    radius: 10
                }).addTo(map),
                L.circle([y3, x3], {
                    color: this.colors[2],
                    fillColor: this.colors[2],
                    fillOpacity: 0.5,
                    radius: 10
                }).addTo(map),
                L.circle([y4, x4], {
                    color: this.colors[3],
                    fillColor: this.colors[3],
                    fillOpacity: 0.5,
                    radius: 10
                }).addTo(map),
            ];

            let lines: L.Polyline[] = [
                this.drawLine([y1, x1], [y2, x2]),
                this.drawLine([y2, x2], [y3, x3]),
                this.drawLine([y4, x4], [y3, x3]),
                this.drawLine([y4, x4], [y1, x1])
            ];

            let text = L.divIcon({
                iconSize: [0, 0],
                html: '<p>Box' + (box.id + 1).toString() + '</p>',
                className: 'overlay-text'});
            let textMarker = L.marker(circles[0].getLatLng(), {icon: text}).addTo(this.state.map!);

            let segBox: SegBox = {
                id: box.id,
                position: box.position,
                textMarker: textMarker,
                circles: circles,
                lines: lines
            }

            return segBox;
        });
        this.setState({boxes: newBoxes});
    }

    handleSubmit = (box: SegBox, update: boolean) => {
        let IDBox: IDBox = {
            id: box.id,
            position: {
                x1: box.position.x1!,
                x2: box.position.x2!,
                x3: box.position.x3!,
                x4: box.position.x4!,
                y1: box.position.y1!,
                y2: box.position.y2!,
                y3: box.position.y3!,
                y4: box.position.y4!,
            }
        }
        if (update) {
            this.props.setIDBox(IDBox, this.props.IDImage.image);
        } else {
            this.props.createNewID(IDBox, false);
        }
    }

    // ------------------------------------------------------
    //                      MAP ACTIONS
    // ------------------------------------------------------ 

    handleMapClick = (e: any) => {
        if (this.state.stage !== 0) {
            for (var i = 0; i < this.state.currentBox.circles.length; i++) {
                if (this.state.currentBox.circles[i].getBounds().contains(e.latlng)) {
                    this.handleDeleteCircle(e, i);
                    return;
                }
            }
        }

        this.addCircle(e);
    }

    handleMouseDown = (e: any) => {
        if (this.state.boxes.length === 0) return;
        for (var i = 0; i < this.state.boxes.length; i++) {
            this.state.boxes[i].circles.forEach((each, idx) => {
                if (each.getBounds().contains(e.latlng)) {
                    this.setState({
                        movingCircle: {
                            circle: each,
                            index: idx,
                            boxIndex: i
                        }
                    }, () => this.state.map!.dragging.disable());
                }
            })
        }
    }

    handleMoveCircle = (e: any) => {
        if (this.state.movingCircle !== undefined) {
            this.state.movingCircle.circle.remove();
            let idx = this.state.movingCircle.index;
            let boxes = this.state.boxes;
            let box = boxes[this.state.movingCircle.boxIndex];

            let circle = L.circle([e.latlng.lat, e.latlng.lng], {
                color: this.colors[idx],
                fillColor: this.colors[idx],
                fillOpacity: 0.5,
                radius: 10
            }).addTo(this.state.map!);

            box.circles.splice(idx, 1, circle);

            let prevIndex = idx - 1;
            let nextIndex = idx + 1;

            if (idx === 0) {
                prevIndex = 3;
            } else if (idx === 3) { 
                nextIndex = 0;
            } 

            let prevCircle = box.circles[prevIndex];
            let nextCircle = box.circles[nextIndex]

            let newPoint: [number, number] = [circle.getLatLng().lat, circle.getLatLng().lng];
            let prevPoint: [number, number] = [prevCircle.getLatLng().lat, prevCircle.getLatLng().lng];
            let nextPoint: [number, number] = [nextCircle.getLatLng().lat, nextCircle.getLatLng().lng];

            let firstLine = this.drawLine(newPoint, prevPoint);
            let secondLine = this.drawLine(newPoint, nextPoint);

            let lines = box.lines;
            lines[prevIndex].remove();
            lines[idx === 3 ? 3 : nextIndex - 1].remove();
            lines.splice(prevIndex, 1, firstLine);
            lines.splice(idx === 3 ? 3 : nextIndex - 1, 1, secondLine);

            if (idx === 0) {
                box.textMarker!.setLatLng(circle.getLatLng());
            }

            box.position = {
                x1: box.circles[0].getLatLng().lng * this.state.ratio,
                x2: box.circles[1].getLatLng().lng * this.state.ratio,
                x3: box.circles[2].getLatLng().lng * this.state.ratio,
                x4: box.circles[3].getLatLng().lng * this.state.ratio,
                y1: box.circles[0].getLatLng().lat * this.state.ratio,
                y2: box.circles[1].getLatLng().lat * this.state.ratio,
                y3: box.circles[2].getLatLng().lat * this.state.ratio,
                y4: box.circles[3].getLatLng().lat * this.state.ratio
            }
            
            boxes.splice(this.state.movingCircle.boxIndex, 1, box);
            this.setState({
                movingCircle: {
                    ...this.state.movingCircle,
                    circle: circle
                },
                boxes: boxes
            });
            

        }
    }

    handleDoneMoving = (e: any) => {
        if (this.state.movingCircle !== undefined) {
            this.state.map!.dragging.enable();
            let boxIndex = this.state.movingCircle.boxIndex;
            this.setState({
                movingCircle: undefined
            }, () => {
                // this.props.deleteIDBox(this.state.boxes[boxIndex].id);
                this.handleSubmit(this.state.boxes[boxIndex], true);
            });
        }
    }

    // ------------------------------------------------------
    //                    DRAWING FUNCTIONS
    // ------------------------------------------------------ 

    addCircle = (e: any) => {
        if (this.props.originalProcessed) {
            let internalID = this.props.currentID.internalIDs[this.props.currentID.internalIndex];
            if (internalID !== undefined
                && internalID.processStage === IDProcess.DOUBLE_BACK
                && internalID.backID!.IDBox !== undefined) return; 
            if (this.props.internalIDs.length <= this.state.boxes.length) return;
        }

        let st = this.state;
        let map = st.map!;
        let circle = L.circle([e.latlng.lat, e.latlng.lng], {
            color: this.colors[st.stage],
            fillColor: this.colors[st.stage],
            fillOpacity: 0.5,
            radius: 10
        }).addTo(map);

        if (st.stage === 1 || st.stage === 2) {
            // drawing lines
            let currentBox = st.currentBox;
            let firstPoint: [number, number] = [circle.getLatLng().lat, circle.getLatLng().lng];
            let secondPoint: [number, number] = [currentBox.circles[currentBox.circles.length - 1].getLatLng().lat, currentBox.circles[currentBox.circles.length - 1].getLatLng().lng];
            let line = this.drawLine(firstPoint, secondPoint);

            let newCircles = this.state.currentBox.circles;
            newCircles.push(circle);
            let newLines = this.state.currentBox.lines;
            newLines.push(line);

            let newBox = {
                ...currentBox,
                position: (st.stage === 1
                    ? {
                        ...this.state.currentBox.position,
                        x2: e.latlng.lng * this.state.ratio,
                        y2: e.latlng.lat * this.state.ratio
                    }
                    : {
                        ...this.state.currentBox.position,
                        x3: e.latlng.lng * this.state.ratio,
                        y3: e.latlng.lat * this.state.ratio
                    }
                ),
                circles: newCircles,
                lines: newLines
            }
            // let newBoxes = this.state.boxes;
            // newBoxes.push(newBox);

            this.setState({
                stage: st.stage + 1,
                currentBox: newBox,
                // boxes: newBoxes
            });
        } else if (st.stage === 3) {
            // line from point 4 to point 3
            let currentBox = st.currentBox;
            let firstPoint: [number, number] = [circle.getLatLng().lat, circle.getLatLng().lng];
            let secondPoint: [number, number] = [currentBox.circles[currentBox.circles.length - 1].getLatLng().lat, currentBox.circles[currentBox.circles.length - 1].getLatLng().lng];
            let line1 = this.drawLine(firstPoint, secondPoint);

            // line from point 4 to point 1
            let thirdPoint: [number, number] = [currentBox.circles[currentBox.circles.length - 3].getLatLng().lat, currentBox.circles[currentBox.circles.length - 3].getLatLng().lng];
            let line2 = this.drawLine(firstPoint, thirdPoint);

            let newCircles = this.state.currentBox.circles;
            newCircles.push(circle);
            let newLines = this.state.currentBox.lines;
            newLines.push(line1);
            newLines.push(line2);

            let text = L.divIcon({
                iconSize: [0, 0],
                html: '<p>Box' + (this.state.currentBox.id + 1).toString() + '</p>',
                className: 'overlay-text'});
            let textMarker = L.marker(currentBox.circles[0].getLatLng(), {icon: text}).addTo(this.state.map!);
    

            let newBox = {
                ...currentBox,
                position: {
                    ...this.state.currentBox.position,
                    x4: e.latlng.lng * this.state.ratio,
                    y4: e.latlng.lat * this.state.ratio
                },
                textMarker: textMarker,
                circles: newCircles,
                lines: newLines
            }
            let newBoxes = this.state.boxes;
            newBoxes.push(newBox);

            this.setState({
                stage: 0,
                currentBox: newBox,
                boxes: newBoxes
            }, () => this.handleSubmit(newBox, this.props.originalProcessed));

        } else {
            // let boxes = this.state.boxes;
            let newBox = {
                id: this.props.committedBoxes.length,
                position: {
                    x1: circle.getLatLng().lng * this.state.ratio,
                    y1: circle.getLatLng().lat * this.state.ratio
                },
                circles: [circle],
                lines: []
            };
            // boxes.push(newBox);
            this.setState({
                stage: st.stage + 1,
                currentBox: newBox,
                // boxes: boxes
            })
        }
    }

    drawLine = (point1: [number, number], point2: [number, number]) => {
        let polyline = L.polyline([point1, point2], {color: 'red', weight: 2});
        polyline.addTo(this.state.map!);
        return polyline;
    }

    handleDeleteCircle = (e: any, circleIndex: number) => {        
        // only can click to delete circles for the current box
        if (this.state.stage === 0) {
            return;
        }

        let box = this.state.currentBox;
        let circle = box.circles[circleIndex];

        if (circleIndex + 1 === box.circles.length) {
            circle.remove();

            let circles = box.circles;
            circles.splice(-1, 1);
            let lines = box.lines;
            if (lines.length > 0) {
                lines[lines.length - 1].remove();
                lines.splice(-1, 1);
            }
            let newBox = {
                ...this.state.currentBox,
                circles: circles,
                lines: lines
            }
            // let newBoxes = this.state.boxes;
            // newBoxes[boxIndex] = newBox;

            this.setState({
                stage: this.state.stage - 1,
                currentBox: newBox,
                // boxes: newBoxes
            })
        } 
    }

    render() {
        return (
            <div id="segLabeller" style={{cursor: "crosshair", height: "calc(100% - 16px)", width: "100%"}}></div>
        )
    }
}

const mapStateToProps = (state: AppState, ownProps: any) => {
    let boxes: IDBox[] = [];
    state.id.internalIDs.forEach((each) => {
        if (state.id.originalIDProcessed) {
            if (state.id.internalIDs[state.id.internalIndex].processStage === IDProcess.DOUBLE_BACK
                && each.backID!.IDBox !== undefined) {
                boxes.push(each.backID!.IDBox);
            } else if (state.id.internalIDs[state.id.internalIndex].processStage !== IDProcess.DOUBLE_BACK
                && each.originalID!.IDBox !== undefined) {
                    boxes.push(each.originalID!.IDBox);
                }
        } else if (!state.id.originalIDProcessed && each.originalID!.IDBox !== undefined) {
            boxes.push(each.originalID!.IDBox);
        }
    })
    return {
        currentStage: state.general.currentStage,
        currentID: state.id,
        internalIDs: state.id.internalIDs,
        originalProcessed: state.id.originalIDProcessed,
        IDImage: state.id.originalIDProcessed 
            ? (state.id.internalIDs[state.id.internalIndex].processStage === IDProcess.DOUBLE_BACK ? state.id.backID! : state.id.originalID!) 
            : state.id.originalID!,
        committedBoxes: boxes
}};
    
const mapDispatchToProps = {
    createNewID,
    setIDBox,
}
    
export default connect(
    mapStateToProps, 
    mapDispatchToProps
)(SegLabeller);