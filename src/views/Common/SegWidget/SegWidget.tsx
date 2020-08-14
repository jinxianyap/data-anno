import L from 'leaflet';
import React from 'react';
import { connect } from 'react-redux'; 
import { ImageActionTypes, IDBox, ImageState } from '../../../store/image/types';
import { addIDBox } from '../../../store/image/actionCreators';
// import bg from '../../../assets/0001_0.jpg';
import { AppState } from '../../../store';

interface IProps {
    image: ImageState,
    committedBoxes: IDBox[],
    addIDBox: (box: IDBox, croppedID: File) => ImageActionTypes
}

interface IState {
    source: string,
    map?: L.Map,

    naturalWidth: number,
    naturalHeight: number,
    width: number,
    height: number,
    ratio: number,

    stage: number,
    currentBox: Box,
    boxes: Box[]
}

type Box = {
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
    circles: L.Circle[],
    lines: L.Polyline[]
}

class SegWidget extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        // need to handle preloaded boxes
        this.state = {
            source: '',
            // source: image,
            naturalWidth: 0,
            naturalHeight: 0,
            width: 0,
            height: 0,
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

    componentWillMount() {
        console.log('mount');
        console.log(this.props.image);
    }

    componentDidMount() {
        if (this.props.image.image.size !== 0 && this.props.image.image.name !== '') {
            this.loadImageData();
        }
    }

    loadImageData = () => {
        let image = new Image();
        image.onload = () => {
            let fitHeight = 800;
            let fitWidth = 800;
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
            this.setState({
                source: image.src,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                width: width,
                height: height,
                ratio: ratio,
            }, this.initializeMap);

            console.log(this.state);
        }
        image.src = URL.createObjectURL(this.props.image.image);
    }

    initializeMap = () => {
        let st = this.state;
        console.log(st);
        let top: [number, number] = [0, 0];
        let mapBounds: [number, number][] = [[0, 0], [1000, 1000]];
        let imageBounds: [number, number][] = [[0, 0], [st.height, st.width]];

        let map = L.map('leaflet-map', {
            center: top,
            crs: L.CRS.Simple,
            zoom: 8,
            dragging: true,
            maxBounds: mapBounds,
            maxBoundsViscosity: 1.0
        });

        this.setState({map: map});

        let layer = new L.TileLayer('', {
            tileSize: L.point(st.height, st.width),
            noWrap: true
        });

        console.log(st.source);
        let overlay = L.imageOverlay(st.source, imageBounds);

        overlay.addTo(map);
        map.addLayer(layer);
        map.fitBounds(imageBounds);
        map.on('click', this.handleMapClick);
    }

    handleMapClick = (e: any) => {
        console.log(e.latlng);
        // check if clicked circle?
        let map: L.Map = this.state.map!;

        for (var i = 0; i < this.state.currentBox.circles.length; i++) {
            if (this.state.currentBox.circles[i].getBounds().contains(e.latlng)) {
                console.log('clicked circle');
                this.handleCircleClick(e, i);
                return;
            }
        }

        this.addCircle(e);
    }

    addCircle = (e: any) => {
        let st = this.state;
        let map = st.map!;
        let circle = L.circle([e.latlng.lat, e.latlng.lng], {
            color: 'red',
            fillColor: '#f03',
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
                        x2: e.latlng.lng,
                        y2: e.latlng.lat
                    }
                    : {
                        ...this.state.currentBox.position,
                        x3: e.latlng.lng,
                        y3: e.latlng.lat
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

            let newBox = {
                ...currentBox,
                position: {
                    ...this.state.currentBox.position,
                    x4: e.latlng.lng,
                    y4: e.latlng.lat
                },
                circles: newCircles,
                lines: newLines
            }
            let newBoxes = this.state.boxes;
            newBoxes.push(newBox);

            this.setState({
                stage: 0,
                currentBox: newBox,
                boxes: newBoxes
            });

            this.handleSubmit();
        } else {
            let boxes = this.state.boxes;
            let newBox = {
                id: this.state.boxes.length,
                position: {
                    x1: circle.getLatLng().lng,
                    y1: circle.getLatLng().lat
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
        let polyline = L.polyline([point1, point2], {color: 'red'});
        polyline.addTo(this.state.map!);
        return polyline;
    }

    handleCircleClick = (e: any, circleIndex: number) => {
        console.log(this.state.stage);
        
        // only can click to delete circles for the current box
        if (this.state.stage === 0) {
            return;
        }

        let box = this.state.currentBox;
        let circle = box.circles[circleIndex];
        circle.remove();

        if (circleIndex + 1 === box.circles.length) {
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

    handleSubmit = () => {
        // supposed to call crop API first then only send to store
        console.log('submitting boxes');
        let box = this.state.currentBox;
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
        this.props.addIDBox(IDBox, this.props.image.image);
    }

    render() {
        return (
            <div id="leaflet-map" style={{cursor: "crosshair", height: "95%", width: "100%"}}></div>
        )
    }
}

const mapStateToProps = (state: AppState, ownProps: any) => {
    return {
        image: state.image,
        committedBoxes: state.image.segEdit.IDBoxes,
}};
    
const mapDispatchToProps = {
    addIDBox
}
    
export default connect(
    mapStateToProps, 
    mapDispatchToProps
)(SegWidget);