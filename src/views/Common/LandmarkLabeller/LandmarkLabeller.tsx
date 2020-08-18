import L from 'leaflet';
import React from 'react';
import { connect } from 'react-redux'; 
import { ImageActionTypes, ImageState, LandmarkData } from '../../../store/image/types';
import { addLandmarkData, deleteLandmarkData } from '../../../store/image/actionCreators';
import { AppState } from '../../../store';
import trash from '../../../assets/trash.png';
import { CurrentStage } from '../../../utils/enums';

interface IProps {
    currentStage: CurrentStage;

    currentImageState: ImageState,
    currentLandmark: string,
    committedLandmarks: LandmarkData[][],
    addLandmarkData: (index: number, landmark: LandmarkData) => ImageActionTypes,
    deleteLandmarkData: (index: number, landmark: string) => ImageActionTypes
}

interface IState {
    source: string,
    map?: L.Map,

    naturalWidth: number,
    naturalHeight: number,
    width: number,
    height: number,
    ratio: number,

    isDrawing: boolean,
    currentBox: Box
    boxes: Box[],
    drawnLandmarks: string[]
}

type Box = {
    id: number,
    name: string,
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
    rectangle?: L.Rectangle,
    descriptor?: L.Marker,
    wrapper?: L.Rectangle,
    delete?: L.Rectangle,
    deleteIcon?: L.Marker,
}

class LandmarkLabeller extends React.Component<IProps, IState> {

    index: number = 0;

    constructor(props: IProps) {
        super(props);
        // need to handle preloaded boxes
        this.state = {
            source: '',
            naturalWidth: 0,
            naturalHeight: 0,
            width: 0,
            height: 0,
            ratio: 0,
            isDrawing: false,
            currentBox: {
                id: 0,
                name: '',
                position: {},
            },
            boxes: [],
            drawnLandmarks: []
        }
    }

    componentWillMount() {
        console.log('mount');
        console.log(this.props.currentImageState);
    }

    componentDidMount() {
        for (var i = 0; i < this.props.currentImageState.segEdit.internalIDProcessed.length; i++) {
            if (!this.props.currentImageState.segEdit.internalIDProcessed) {
              this.index = i;
              break;
            }
          }
        this.loadImageData();
    }

    componentDidUpdate() {
        // console.log(this.state.currentBox);
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
        }
        image.src = URL.createObjectURL(this.props.currentImageState.segEdit.croppedIDs[this.index]);
    }

    initializeMap = () => {
        let st = this.state;
        console.log(st);
        let top: [number, number] = [0, 0];
        let mapBounds: [number, number][] = [[0, 0], [1000, 1000]];
        let imageBounds: [number, number][] = [[0, 0], [st.height, st.width]];

        let map = L.map('landmarkLabeller', {
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

        map.addLayer(layer);
        overlay.addTo(map);
        map.fitBounds(imageBounds);
        map.on('mousedown', this.handleMouseDown);
        map.on('mousemove', this.handleMouseMove);
        map.on('mouseup', this.handleMouseUp);
        map.on('mouseout', this.handleMouseOut);

        this.setState({map: map}, this.renderCommittedBoxes);
    }

    renderCommittedBoxes = () => {
        // let map = this.state.map!;
        if (this.props.currentStage === CurrentStage.LANDMARK_EDIT) {
            let landmarks = this.props.committedLandmarks[this.index];
            landmarks.forEach((landmark: LandmarkData) => {
                let createdBox = this.createRectangle(
                    landmark.position.y1 / this.state.ratio,
                    landmark.position.x1 / this.state.ratio,
                    landmark.position.y3 / this.state.ratio,
                    landmark.position.x3 / this.state.ratio,
                    landmark.name);
                let box: Box = {
                    id: landmark.id,
                    name: landmark.name,
                    position: {
                        x1: landmark.position.x1,
                        x2: landmark.position.x2,
                        x3: landmark.position.x3,
                        x4: landmark.position.x4,
                        y1: landmark.position.y1,
                        y2: landmark.position.y2,
                        y3: landmark.position.y3,
                        y4: landmark.position.y4,
                    },
                    rectangle: createdBox.rectangle,
                    descriptor: createdBox.descriptor,
                    wrapper: createdBox.wrapper,
                    delete: createdBox.delete,
                    deleteIcon: createdBox.deleteIcon,
                };
                this.state.boxes.push(box);
                this.state.drawnLandmarks.push(box.name);
            });
        } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            
        }
    }

    handleMouseDown = (e: any) => {
        if (this.withinRectangleBounds(e) !== undefined || this.withinDeleteBounds(e) !== undefined || this.props.currentLandmark === '') return;

        let map: L.Map = this.state.map!;

        map.dragging.disable();
        this.setState({
            isDrawing: true,
            currentBox: {
                id: this.state.drawnLandmarks.length,
                name: this.props.currentLandmark,
                position: {
                    x1: e.latlng.lng * this.state.ratio,
                    y1: e.latlng.lat * this.state.ratio,
                    y2: e.latlng.lat * this.state.ratio,
                    x4: e.latlng.lat * this.state.ratio
                }
            }
        });
    }

    handleMouseMove = (e: any) => {
        if (!this.state.isDrawing || !this.props.currentLandmark) return;
        if (this.state.drawnLandmarks.includes(this.props.currentLandmark)) return;

        var position = this.state.currentBox.position;
        var bounds: [number, number][] = [[position.y1! / this.state.ratio, position.x1! / this.state.ratio], [e.latlng.lat, e.latlng.lng]];

        if (this.state.currentBox.rectangle) {
            this.state.currentBox.rectangle!.remove();
        }
        var rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);

        this.setState({
            isDrawing: true,
            currentBox: {
                id: this.state.drawnLandmarks.length,
                name: this.props.currentLandmark,
                position: {
                    ...this.state.currentBox.position,
                    x2: e.latlng.lng * this.state.ratio,
                    x3: e.latlng.lng * this.state.ratio,
                    y3: e.latlng.lat * this.state.ratio,
                    y4: e.latlng.lat * this.state.ratio
                },
                rectangle: rectangle,
            }
        });
    }

    handleMouseOut = (e: any) => {
        if (this.state.isDrawing) {
            this.setState({
                isDrawing: false,
                currentBox: {
                    id: this.state.drawnLandmarks.length,
                    name: this.props.currentLandmark,
                    position: {}
                }
            })
        }
    }

    handleMouseUp = (e: any) => {
        if (!this.state.isDrawing || !this.props.currentLandmark) return;
        if (this.state.drawnLandmarks.includes(this.props.currentLandmark)) return;

        if (this.state.currentBox.rectangle) {
            this.state.currentBox.rectangle!.remove();
        }

        let currentPos = this.state.currentBox.position;
        let newBox = this.createRectangle(currentPos.y1! / this.state.ratio, currentPos.x1! / this.state.ratio, e.latlng.lat, e.latlng.lng);
        let boxes = this.state.boxes;
        boxes.push(newBox);
        let drawnLandmarks = this.state.drawnLandmarks;
        drawnLandmarks.push(this.props.currentLandmark);

        this.setState({
            isDrawing: false,
            currentBox: {
                id: this.state.drawnLandmarks.length,
                name: '',
                position: {}
            },
            boxes: boxes,
            drawnLandmarks: drawnLandmarks
        }, () => this.submitLandmarkData(newBox));
    }

    createRectangle = (lat1: number, lng1: number, lat2: number, lng2: number, landmark?: string) => {
        let currentLandmark = landmark === undefined ? this.props.currentLandmark : landmark;

        let boxBounds: [number, number][] = [[lat1, lng1], [lat2, lng2]];
        let wrapperBounds: [number, number][] = [[boxBounds[0][0] + 10, boxBounds[0][1] - 10], [boxBounds[1][0] - 10, boxBounds[1][1] + 10]];
        let deleteBounds: [number, number][] = [[boxBounds[0][0], boxBounds[1][1]], [boxBounds[0][0] - 20, boxBounds[1][1] + 20]];

        let rectangle = L.rectangle(boxBounds, {color: "red", weight: 1}).addTo(this.state.map!);
        let wrapper = L.rectangle(wrapperBounds, {stroke: false, fillOpacity: 0.0}).addTo(this.state.map!);

        let deleteIcon = L.marker([boxBounds[0][0] - 8, boxBounds[1][1] + 9], {icon: L.icon({
            iconUrl: trash,
            iconSize: [17, 17],
        })});
        let deleteMarker = L.rectangle(deleteBounds, {color: "red", weight: 1, interactive: true});

        let text = L.divIcon({
            iconSize: [0, 0],
            html: '<p>' + currentLandmark + '</p>',
            className: 'overlay-text'});
        let textMarker = L.marker(boxBounds[0], {icon: text}).addTo(this.state.map!);

        rectangle.on('mouseover', (e: any) => {
            let index = this.withinRectangleBounds(e);
            if (index === undefined) return;

            this.state.boxes[index].delete!.addTo(this.state.map!);
            this.state.boxes[index].deleteIcon!.addTo(this.state.map!);
        })
        rectangle.bringToFront();

        wrapper.on('mouseover', (e: any) => {
            let index = this.withinRectangleBounds(e);

            if (index === undefined) return;
            this.state.boxes[index].delete!.remove();
            this.state.boxes[index].deleteIcon!.remove();

        })

        deleteIcon.on('click', (e: any) => {
            this.deleteRectangle(e);
        })

        deleteMarker.on('click', (e: any) => {
            this.deleteRectangle(e);
        })

        return {
            id: this.state.drawnLandmarks.length,
            name: currentLandmark,
            position: {
                ...this.state.currentBox.position,
                x2: lng2 * this.state.ratio,
                x3: lng2 * this.state.ratio,
                y3: lat2 * this.state.ratio,
                y4: lat2 * this.state.ratio
            },
            rectangle: rectangle,
            descriptor: textMarker,
            wrapper: wrapper,
            delete: deleteMarker,
            deleteIcon: deleteIcon,
        }
    }

    submitLandmarkData = (landmark: Box) => {
        let landmarkData: LandmarkData = {
            id: landmark.id,
            type: 'landmark',
            name: landmark.name,
            position: {
                x1: landmark.position.x1!,
                x2: landmark.position.x2!,
                x3: landmark.position.x3!,
                x4: landmark.position.x4!,
                y1: landmark.position.y1!,
                y2: landmark.position.y2!,
                y3: landmark.position.y3!,
                y4: landmark.position.y4!,
            },
            flags: []
        };
        this.props.addLandmarkData(this.index, landmarkData);
    }

    withinRectangleBounds = (e: any) => {
        for (var i = 0; i < this.state.boxes.length; i++) {
            if (this.state.boxes[i].rectangle!.getBounds().contains(e.latlng)
                || this.state.boxes[i].wrapper!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    withinDeleteBounds = (e: any) => {
        for (var i = 0; i < this.state.boxes.length; i++) {
            if (this.state.boxes[i].delete!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    deleteRectangle = (e: any) => {
        let boxIndex = this.withinRectangleBounds(e)!;
        let name = this.state.boxes[boxIndex].name;
        this.state.boxes[boxIndex].rectangle!.remove();
        this.state.boxes[boxIndex].descriptor!.remove();
        this.state.boxes[boxIndex].wrapper!.remove();
        this.state.boxes[boxIndex].delete!.remove();
        this.state.boxes[boxIndex].deleteIcon!.remove();
        let index = this.state.drawnLandmarks.indexOf(name);
        let drawn = this.state.drawnLandmarks;
        drawn.splice(index, 1);
        let boxes = this.state.boxes;
        boxes.splice(boxIndex, 1);
        this.setState({boxes: boxes, drawnLandmarks: drawn, isDrawing: false}, () => this.props.deleteLandmarkData(this.index, name));
    }

    render() {
        return (
            <div id="landmarkLabeller" style={{cursor: "crosshair", height: "calc(100% - 16px)", width: "100%"}}></div>
        )
    }
}

const mapStateToProps = (state: AppState, ownProps: any) => {
    return {
        currentStage: state.general.currentStage,
        currentImageState: state.image,
        currentLandmark: state.image.currentLandmark!,
        committedLandmarks: state.image.landmark
}};
    
const mapDispatchToProps = {
    addLandmarkData,
    deleteLandmarkData
}
    
export default connect(
    mapStateToProps, 
    mapDispatchToProps
)(LandmarkLabeller);