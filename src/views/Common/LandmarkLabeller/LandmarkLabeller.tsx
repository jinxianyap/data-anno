import L from 'leaflet';
import React from 'react';
import { connect } from 'react-redux'; 
import { ImageActionTypes, ImageState, LandmarkData, Position, OCRData, OCRWord } from '../../../store/image/types';
import { addLandmarkData, deleteLandmarkData, updateOCRData } from '../../../store/image/actionCreators';
import { AppState } from '../../../store';
import trash from '../../../assets/trash.png';
import { CurrentStage } from '../../../utils/enums';

interface IProps {
    currentStage: CurrentStage;
    currentImageState: ImageState,
    currentSymbol: string,
    currentWord: OCRWord,
    committedLandmarks: LandmarkData[][],
    committedOCRs: OCRData[][],

    addLandmarkData: (index: number, landmark: LandmarkData) => ImageActionTypes,
    deleteLandmarkData: (index: number, landmark: string) => ImageActionTypes,
    updateOCRData: (index: number, id: number, name: string, value: string, position?: Position) => ImageActionTypes
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

    landmarkBoxes: Box[],
    drawnLandmarks: string[],

    ocrBoxes: Box[],
    drawnOCRs: {
        name: string,
        word: OCRWord
    }[]
}

type Box = {
    id: number,
    name: string,
    value?: string,
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
            landmarkBoxes: [],
            drawnLandmarks: [],
            ocrBoxes: [],
            drawnOCRs: []
        }
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

    componentDidUpdate(previousProps: IProps, previousState: IState) {
        if (previousProps.currentStage !== this.props.currentStage) {
            switch (this.props.currentStage) {
                case (CurrentStage.OCR_EDIT): {
                    this.renderCommittedOCRs();
                    break;
                }
                case (CurrentStage.OCR_DETAILS): {
                    if (previousProps.currentStage !== CurrentStage.OCR_EDIT) {
                        this.renderCommittedLandmarks();
                    }
                    this.renderCommittedOCRs();
                    break;
                }
                case (CurrentStage.LANDMARK_EDIT): {
                    this.renderCommittedLandmarks();
                    break;
                }
            }
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
        }
        image.src = URL.createObjectURL(this.props.currentImageState.segEdit.croppedIDs[this.index]);
    }

    initializeMap = () => {
        let st = this.state;
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

        this.setState({map: map}, () => {this.renderCommittedLandmarks(); this.renderCommittedOCRs();});
    }

    renderCommittedLandmarks = () => {
        let newBoxes: Box[] = [];
        let drawnLandmarks: string[] = [];

        if (this.state.landmarkBoxes.length > 0) {
            this.state.landmarkBoxes.forEach((each) => this.deleteMapElements(each))
        };

        let landmarks = this.props.committedLandmarks[this.index];
        landmarks.forEach((landmark: LandmarkData) => {
            let createdBox = this.createRectangle(
                landmark.position.y1 / this.state.ratio,
                landmark.position.x1 / this.state.ratio,
                landmark.position.y3 / this.state.ratio,
                landmark.position.x3 / this.state.ratio,
                landmark.name,
                landmark.name,
                this.props.currentStage !== CurrentStage.LANDMARK_EDIT);
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

            newBoxes.push(box);
            drawnLandmarks.push(box.name);
        });
        this.setState({landmarkBoxes: newBoxes, drawnLandmarks: drawnLandmarks});
    }

    renderCommittedOCRs = () => {
        let newBoxes: Box[] = [];
        let drawnOCRs: {name: string, word: OCRWord}[] = [];

        if (this.state.ocrBoxes.length > 0) {
            this.state.ocrBoxes.forEach((each) => this.deleteMapElements(each))
        };

        let ocrs = this.props.committedOCRs[this.index];
        ocrs.forEach((ocr: OCRData) => {
            ocr.labels.forEach((label, idx) => {
                if (label.position !== undefined) {
                    let pos = label.position!;
                    let createdBox = this.createRectangle(
                        pos.y1 / this.state.ratio,
                        pos.x1 / this.state.ratio,
                        pos.y3 / this.state.ratio,
                        pos.x3 / this.state.ratio,
                        ocr.name,
                        label.value,
                        this.props.currentStage !== CurrentStage.OCR_EDIT);
                    let box: Box = {
                        id: label.id,
                        name: ocr.name,
                        value: label.value,
                        position: {
                            x1: pos.x1,
                            x2: pos.x2,
                            x3: pos.x3,
                            x4: pos.x4,
                            y1: pos.y1,
                            y2: pos.y2,
                            y3: pos.y3,
                            y4: pos.y4,
                        },
                        rectangle: createdBox.rectangle,
                        descriptor: createdBox.descriptor,
                        wrapper: createdBox.wrapper,
                        delete: createdBox.delete,
                        deleteIcon: createdBox.deleteIcon,
                    };
                    newBoxes.push(box);
                    drawnOCRs.push({name: ocr.name, word: label});
                }
            })
        });
        this.setState({ocrBoxes: newBoxes, drawnOCRs: drawnOCRs});
    }

    ocrWordDrawn() {
        return this.state.drawnOCRs.find((each) => 
        each.name === this.props.currentSymbol
        && each.word.id === this.props.currentWord.id
        && each.word.value === this.props.currentWord.value);
    }

    handleMouseDown = (e: any) => {
        switch (this.props.currentStage) {
            case (CurrentStage.OCR_DETAILS): {
                return;
            }
            case (CurrentStage.LANDMARK_EDIT): {
                if (!this.props.currentSymbol) return;
                break;
            }
            case (CurrentStage.OCR_EDIT): {
                if (!this.props.currentSymbol || this.ocrWordDrawn()) return;
                break;
            }
        }

        this.state.map!.dragging.disable();

        this.setState({
            isDrawing: true,
            currentBox: {
                id: this.props.currentStage === CurrentStage.OCR_EDIT ? this.props.currentWord.id : this.state.drawnLandmarks.length,
                name: this.props.currentSymbol,
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
        if (!this.state.isDrawing || !this.props.currentSymbol) return;

        switch (this.props.currentStage) {
            case (CurrentStage.OCR_DETAILS): {
                return;
            }
            case (CurrentStage.LANDMARK_EDIT): {
                if (this.state.drawnLandmarks.includes(this.props.currentSymbol)) return;
                break;
            }
            case (CurrentStage.OCR_EDIT): {
                if (this.ocrWordDrawn()) return;
                break;
            }
        }

        var position = this.state.currentBox.position;
        var bounds: [number, number][] = [[position.y1! / this.state.ratio, position.x1! / this.state.ratio], [e.latlng.lat, e.latlng.lng]];

        if (this.state.currentBox.rectangle) {
            this.state.currentBox.rectangle!.remove();
        }
        var rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);

        this.setState({
            isDrawing: true,
            currentBox: {
                id: this.props.currentStage === CurrentStage.OCR_EDIT ? this.props.currentWord.id : this.state.drawnLandmarks.length,
                name: this.props.currentSymbol,
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

    handleMouseUp = (e: any) => {
        if (!this.state.isDrawing || !this.props.currentSymbol) return;
        if (this.props.currentStage === CurrentStage.LANDMARK_EDIT && this.state.drawnLandmarks.includes(this.props.currentSymbol)) return;
        if (this.props.currentStage === CurrentStage.OCR_EDIT && this.ocrWordDrawn()) return;
        if (this.props.currentStage === CurrentStage.OCR_DETAILS) return;

        this.state.map!.dragging.enable();
        
        if (this.state.currentBox.rectangle) {
            this.state.currentBox.rectangle!.remove();
        }

        let currentPos = this.state.currentBox.position;
        if (this.props.currentStage === CurrentStage.LANDMARK_EDIT) {
            let newBox: Box = this.createRectangle(
                currentPos.y1! / this.state.ratio, 
                currentPos.x1! / this.state.ratio, 
                e.latlng.lat, 
                e.latlng.lng, 
                this.props.currentSymbol,
                this.props.currentSymbol);
            let boxes = this.state.landmarkBoxes;
            boxes.push(newBox);
            let drawnLandmarks = this.state.drawnLandmarks;
            drawnLandmarks.push(this.props.currentSymbol);
    
            this.setState({
                isDrawing: false,
                currentBox: {
                    id: this.state.drawnLandmarks.length,
                    name: '',
                    position: {}
                },
                landmarkBoxes: boxes,
                drawnLandmarks: drawnLandmarks
            }, () => this.submitLandmarkData(newBox));
        } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {

            let newBox: Box = this.createRectangle(
                currentPos.y1! / this.state.ratio, 
                currentPos.x1! / this.state.ratio, 
                e.latlng.lat, 
                e.latlng.lng,
                this.props.currentSymbol, 
                this.props.currentImageState.currentWord!.value);
            newBox.value = this.props.currentImageState.currentWord!.value;
            let boxes = this.state.ocrBoxes;
            boxes.push(newBox);
            let drawnOCRs = this.state.drawnOCRs;
            drawnOCRs.push({name: this.props.currentSymbol, word: this.props.currentWord});

            this.setState({
                isDrawing: false,
                currentBox: {
                    id: 0,
                    name: '',
                    position: {}
                },
                ocrBoxes: boxes,
                drawnOCRs: drawnOCRs
            }, () => this.props.updateOCRData(this.index, newBox.id, newBox.name, newBox.value!, {
                x1: newBox.position.x1!,
                x2: newBox.position.x2!,
                x3: newBox.position.x3!,
                x4: newBox.position.x4!,
                y1: newBox.position.y1!,
                y2: newBox.position.y2!,
                y3: newBox.position.y3!,
                y4: newBox.position.y4!,
            }));
        }
    }

    createRectangle = (lat1: number, lng1: number, lat2: number, lng2: number, name: string, value: string, display?: boolean) => {
        let boxBounds: [number, number][] = [[lat1, lng1], [lat2, lng2]];
        let wrapperBounds: [number, number][] = [[boxBounds[0][0] + 5, boxBounds[0][1] - 5], [boxBounds[1][0] - 5, boxBounds[1][1] + 5]];
        let deleteBounds: [number, number][] = [[boxBounds[1][0] + 20, boxBounds[1][1]], [boxBounds[1][0], boxBounds[1][1] + 20]];

        let rectangle = L.rectangle(boxBounds, {color: "red", weight: 1}).addTo(this.state.map!);
        let wrapper = L.rectangle(wrapperBounds, {stroke: false, fillOpacity: 0.0}).addTo(this.state.map!);

        let deleteIcon = L.marker([boxBounds[1][0] + 10, boxBounds[1][1] + 9], {icon: L.icon({
            iconUrl: trash,
            iconSize: [17, 17],
        })});
        let deleteMarker = L.rectangle(deleteBounds, {color: "red", weight: 1, interactive: true});

        let htmlText = '<p>' + value + '</p>';
        if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            htmlText = '<p>' + this.props.currentWord.id + ": " + value + '</p>'
        }

        let text = L.divIcon({
            iconSize: [0, 0],
            html: htmlText,
            className: 'overlay-text'});
        let textMarker = L.marker(boxBounds[0], {icon: text}).addTo(this.state.map!);

        if (!display) {            
            if (this.props.currentStage === CurrentStage.LANDMARK_EDIT) {
                rectangle.on('mouseover', (e: any) => {
                    let index = this.withinLandmarkRectangleBounds(e);
                    if (index === undefined) return;
    
                    this.state.landmarkBoxes[index].delete!.addTo(this.state.map!);
                    this.state.landmarkBoxes[index].deleteIcon!.addTo(this.state.map!);
                })
                rectangle.bringToFront();

                wrapper.on('mouseover', (e: any) => {
                    let index = this.withinLandmarkRectangleBounds(e);
    
                    if (index === undefined) return;
                    this.state.landmarkBoxes[index].delete!.remove();
                    this.state.landmarkBoxes[index].deleteIcon!.remove();
                })

                deleteIcon.on('click', (e: any) => this.deleteLandmarkBox(e))
                deleteMarker.on('click', (e: any) => this.deleteLandmarkBox(e))
            } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {
                rectangle.on('mouseover', (e: any) => {
                    let index = this.withinOcrRectangleBounds(e);
                    if (index === undefined) return;
    
                    this.state.ocrBoxes[index].delete!.addTo(this.state.map!);
                    this.state.ocrBoxes[index].deleteIcon!.addTo(this.state.map!);
                })
                rectangle.bringToFront();

                wrapper.on('mouseover', (e: any) => {
                    let index = this.withinOcrRectangleBounds(e);

                    if (index === undefined) return;
                    this.state.ocrBoxes[index].delete!.remove();
                    this.state.ocrBoxes[index].deleteIcon!.remove();

                })

                deleteIcon.on('click', (e: any) => this.deleteOcrBox(e))
                deleteMarker.on('click', (e: any) => this.deleteOcrBox(e))
            }
        }

        let resultBox: Box = {
            id: this.props.currentStage === CurrentStage.OCR_EDIT ? this.props.currentWord.id : this.state.drawnLandmarks.length,
            name: name,
            value: value,
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
        return resultBox;
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

    withinLandmarkRectangleBounds = (e: any) => {
        for (var i = 0; i < this.state.landmarkBoxes.length; i++) {
            if (this.state.landmarkBoxes[i].rectangle!.getBounds().contains(e.latlng)
                || this.state.landmarkBoxes[i].wrapper!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    withinLandmarkDeleteBounds = (e: any) => {
        for (var i = 0; i < this.state.landmarkBoxes.length; i++) {
            if (this.state.landmarkBoxes[i].delete!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    withinOcrRectangleBounds = (e: any) => {
        for (var i = 0; i < this.state.ocrBoxes.length; i++) {
            if (this.state.ocrBoxes[i].rectangle!.getBounds().contains(e.latlng)
                || this.state.ocrBoxes[i].wrapper!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    withinOcrDeleteBounds = (e: any) => {
        for (var i = 0; i < this.state.ocrBoxes.length; i++) {
            if (this.state.ocrBoxes[i].delete!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    deleteLandmarkBox = (e: any) => {
        let boxIndex = this.withinLandmarkDeleteBounds(e)!;
        this.deleteMapElements(this.state.landmarkBoxes[boxIndex]);
        let name = this.state.landmarkBoxes[boxIndex].name;
        let index = this.state.drawnLandmarks.indexOf(name);
        let drawn = this.state.drawnLandmarks;
        drawn.splice(index, 1);
        let boxes = this.state.landmarkBoxes;
        boxes.splice(boxIndex, 1);
        this.setState({landmarkBoxes: boxes, drawnLandmarks: drawn, isDrawing: false}, () => {this.props.deleteLandmarkData(this.index, name)});
    }

    deleteOcrBox = (e: any) => {
        let boxIndex = this.withinOcrDeleteBounds(e)!;
        this.deleteMapElements(this.state.ocrBoxes[boxIndex]);
        let name = this.state.ocrBoxes[boxIndex].name;
        let value = this.state.ocrBoxes[boxIndex].value!;
        let id = this.state.ocrBoxes[boxIndex].id;
        let index = this.state.drawnOCRs.findIndex((each) => each.name === name && each.word.value === value && each.word.id === id);
        let drawn = this.state.drawnOCRs;
        drawn.splice(index, 1);
        let boxes = this.state.ocrBoxes;
        boxes.splice(boxIndex, 1);
        this.setState({ocrBoxes: boxes, drawnOCRs: drawn, isDrawing: false}, () => {
            this.props.updateOCRData(this.index, id, name, value);
        });
    }

    deleteMapElements = (box: Box) => {
        box.rectangle!.remove();
        box.descriptor!.remove();
        box.wrapper!.remove();
        box.delete!.remove();
        box.deleteIcon!.remove();
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
        currentSymbol: state.image.currentSymbol!,
        currentWord: state.image.currentWord!,
        committedLandmarks: state.image.landmark,
        committedOCRs: state.image.ocr
}};
    
const mapDispatchToProps = {
    addLandmarkData,
    deleteLandmarkData,
    updateOCRData
}
    
export default connect(
    mapStateToProps, 
    mapDispatchToProps
)(LandmarkLabeller);