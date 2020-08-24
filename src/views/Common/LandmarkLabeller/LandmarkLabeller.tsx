import L from 'leaflet';
import 'leaflet-easybutton/src/easy-button';
import React from 'react';
import { connect } from 'react-redux'; 
import { ImageActionTypes, ImageState, LandmarkData, Position, OCRData, OCRWord } from '../../../store/image/types';
import { addLandmarkData, deleteLandmarkData, updateOCRData } from '../../../store/image/actionCreators';
import { AppState } from '../../../store';
import { CurrentStage } from '../../../utils/enums';

interface IProps {
    currentStage: CurrentStage;
    currentImageState: ImageState,
    currentIndex: number,
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
    isResizing: boolean,
    isMoving: boolean,
    prevCoords?: {
        lat: number,
        lng: number
    },
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
    display?: boolean,
    resizeCircle?: L.Circle
}

class LandmarkLabeller extends React.Component<IProps, IState> {

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
            isResizing: false,
            isMoving: false,
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
        image.src = URL.createObjectURL(this.props.currentImageState.segEdit.croppedIDs[this.props.currentIndex]);
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

        let moveButton = L.easyButton('<span>&target;</span>', () => this.setState({isMoving: !this.state.isMoving})).addTo(map);

        map.addLayer(layer);
        overlay.addTo(map);
        map.fitBounds(imageBounds);
        map.on('mousedown', this.handleMouseDown);
        map.on('mousemove', this.handleMouseMove);
        map.on('mouseup', this.handleMouseUp);
        map.on('contextmenu', this.handleContextMenu);
        this.setState({map: map}, () => {this.renderCommittedLandmarks(); this.renderCommittedOCRs();});
    }

    renderCommittedLandmarks = () => {
        let newBoxes: Box[] = [];
        let drawnLandmarks: string[] = [];

        if (this.state.landmarkBoxes.length > 0) {
            this.state.landmarkBoxes.forEach((each) => this.removeMapElements(each))
        };

        let landmarks = this.props.committedLandmarks[this.props.currentIndex];
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
                display: createdBox.display,
                resizeCircle: createdBox.resizeCircle
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
            this.state.ocrBoxes.forEach((each) => this.removeMapElements(each))
        };

        let ocrs = this.props.committedOCRs[this.props.currentIndex];
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
                        this.props.currentStage !== CurrentStage.OCR_EDIT,
                        label.id);
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
                        display: createdBox.display,
                        resizeCircle: createdBox.resizeCircle
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
                if (this.state.isMoving) {
                    this.setMoveBox(e, true);
                    return;
                }

                if (this.state.isResizing) {
                  this.confirmResizeBox(e, true);  
                } else {
                    let index = this.withinLandmarkResizeBounds(e);
                    if (index !== undefined) {
                        this.state.map!.dragging.disable();
                        this.setResizeBox(index, true);
                        return;
                    }
                }
                if (!this.props.currentSymbol) return;
                break;
            }
            case (CurrentStage.OCR_EDIT): {
                if (this.state.isMoving) {
                    this.setMoveBox(e, false);
                    return;
                }

                if (this.state.isResizing) {
                    this.confirmResizeBox(e, true);  
                } else {
                    let index = this.withinOcrResizeBounds(e);
                    if (index !== undefined) {
                        this.state.map!.dragging.disable();
                        this.setResizeBox(index, false);
                        return;
                    }
                }
                if (!this.props.currentSymbol || !this.props.currentWord || this.ocrWordDrawn()) return;
                break;
            }
        }

        if (this.state.isDrawing) return;

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
                    x4: e.latlng.lng * this.state.ratio
                }
            }
        });
    }

    handleMouseMove = (e: any) => {
        if (this.state.isMoving && this.state.prevCoords !== undefined) {
            this.moveBox(e);
            return;
        }

        if (this.state.isResizing) {
            this.moveResizeBox(e);
            return;
        }

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

        let position = this.state.currentBox.position;
        let bounds: [number, number][] = [[position.y1! / this.state.ratio, position.x1! / this.state.ratio], [e.latlng.lat, e.latlng.lng]];

        if (this.state.currentBox.rectangle) {
            this.state.currentBox.rectangle!.remove();
        }

        let rectangle = undefined;
        try {
            rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);
        } catch (err) {
            console.error(err);
        }

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
        if (this.state.isMoving) {
            this.confirmMoveBox(e, this.props.currentStage === CurrentStage.LANDMARK_EDIT);
            this.state.map!.dragging.enable();
            return;
        }

        if (this.state.isResizing) {
            this.confirmResizeBox(e, this.props.currentStage === CurrentStage.LANDMARK_EDIT);
            this.state.map!.dragging.enable();
            return;
        }

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
            }, () => this.props.updateOCRData(this.props.currentIndex, newBox.id, newBox.name, newBox.value!, {
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

    handleContextMenu = (e: any) => {
        if (this.props.currentStage === CurrentStage.LANDMARK_EDIT) {
            this.deleteLandmarkBox(e);
        } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            this.deleteOcrBox(e);
        }
    }

    createRectangle = (lat1: number, lng1: number, lat2: number, lng2: number, name: string, value: string, display?: boolean, id?: number) => {
        let boxBounds: [number, number][] = [[lat1, lng1], [lat2, lng2]];
        let rectangle = L.rectangle(boxBounds, {color: "red", weight: 1}).addTo(this.state.map!);

        let resizeCircle = L.circle([lat2, lng2], {
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.5,
            radius: 10,
            weight: 1
        });

        let htmlText = '<p>' + value + '</p>';
        if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            htmlText = '<p>' + (id !== undefined ? id : this.props.currentWord.id) + ": " + value + '</p>'
        }

        let text = L.divIcon({
            iconSize: [0, 0],
            html: htmlText,
            className: 'overlay-text'});
        let textMarker = L.marker(boxBounds[0], {icon: text}).addTo(this.state.map!);

        let resultBox: Box = {
            id: id !== undefined ? id : (this.props.currentStage === CurrentStage.OCR_EDIT ? this.props.currentWord.id : this.state.drawnLandmarks.length),
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
            display: display,
            resizeCircle: resizeCircle,
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
        this.props.addLandmarkData(this.props.currentIndex, landmarkData);
    }

    withinLandmarkRectangleBounds = (e: any) => {
        for (let i = 0; i < this.state.landmarkBoxes.length; i++) {
            if (this.state.landmarkBoxes[i].rectangle!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    withinLandmarkResizeBounds = (e: any) => {
        for (let i = 0; i < this.state.landmarkBoxes.length; i++) {
            try {
                let radius = this.state.landmarkBoxes[i].resizeCircle!.getRadius();
                let center: L.LatLng = this.state.landmarkBoxes[i].resizeCircle!.getLatLng();
                let bounds: L.LatLngBounds = new L.LatLngBounds(new L.LatLng(center.lat + radius, center.lng - radius), new L.LatLng(center.lat - radius, center.lng + radius));
                if (this.state.map && bounds.contains(e.latlng)) {
                    return i;
                }
            } catch (err) {
                console.error(err);
                return undefined;
            }
        }
        return undefined;
    }   

    withinOcrResizeBounds = (e: any) => {
        for (let i = 0; i < this.state.ocrBoxes.length; i++) {
            try {
                let radius = this.state.ocrBoxes[i].resizeCircle!.getRadius();
                let center: L.LatLng = this.state.ocrBoxes[i].resizeCircle!.getLatLng();
                let bounds: L.LatLngBounds = new L.LatLngBounds(new L.LatLng(center.lat + radius, center.lng - radius), new L.LatLng(center.lat - radius, center.lng + radius));
                if (this.state.map && bounds.contains(e.latlng)) {
                    return i;
                }
            } catch (err) {
                console.error(err);
                return undefined;
            }
        }
        return undefined;
    }   

    withinOcrRectangleBounds = (e: any) => {
        for (let i = 0; i < this.state.ocrBoxes.length; i++) {
            if (this.state.ocrBoxes[i].rectangle!.getBounds().contains(e.latlng)) {
                return i;
            }
        }
        return undefined;
    }

    setMoveBox = (e: any, isLandmark: boolean) => {
        let index = isLandmark ? this.withinLandmarkRectangleBounds(e) : this.withinOcrRectangleBounds(e);
        if (index === undefined) return;
        this.state.map!.dragging.disable();
       
        this.setState({
            currentBox: isLandmark ? this.state.landmarkBoxes[index] : this.state.ocrBoxes[index],
            isMoving: true,
            prevCoords: {
                lat: e.latlng.lat,
                lng: e.latlng.lng
            }
        });
    }

    setResizeBox = (index: number, isLandmark: boolean) => {
        this.setState({
            currentBox: isLandmark ? this.state.landmarkBoxes[index] : this.state.ocrBoxes[index],
            isResizing: true,
        });
    }

    moveBox = (e: any) => {
        if (this.state.isMoving && this.state.prevCoords !== undefined) {
            let box = this.state.currentBox;

            if (this.state.currentBox.descriptor || this.state.currentBox.resizeCircle) {
                this.removeMapElements(box);
            }    

            if (this.state.currentBox.rectangle) {
                this.state.currentBox.rectangle!.remove();
            }

            let position = this.state.currentBox.position;
            let latOffset = e.latlng.lat - this.state.prevCoords!.lat;
            let lngOffset = e.latlng.lng - this.state.prevCoords!.lng;
            let bounds: [number, number][] = [
                [position.y1! / this.state.ratio + latOffset, position.x1! / this.state.ratio + lngOffset],
                [position.y3! / this.state.ratio + latOffset, position.x3! / this.state.ratio + lngOffset]];
            let rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);
    
            this.setState({
                isMoving: true,
                currentBox: {
                    ...box,
                    position: {
                        x1: position.x1! + (lngOffset * this.state.ratio),
                        x2: position.x2! + (lngOffset * this.state.ratio),
                        x3: position.x3! + (lngOffset * this.state.ratio),
                        x4: position.x4! + (lngOffset * this.state.ratio),
                        y1: position.y1! + (latOffset * this.state.ratio),
                        y2: position.y2! + (latOffset * this.state.ratio),
                        y3: position.y3! + (latOffset * this.state.ratio),
                        y4: position.y4! + (latOffset * this.state.ratio),
                    },
                    rectangle: rectangle,
                },
                prevCoords: {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                }
            });
        }
    }

    moveResizeBox = (e: any) => {
        if (this.state.isResizing) {
            let box = this.state.currentBox;

            if (this.state.currentBox.descriptor) {
                this.removeMapElements(box);
            }    

            if (this.state.currentBox.rectangle) {
                this.state.currentBox.rectangle!.remove();
            }

            let position = this.state.currentBox.position;
            let bounds: [number, number][] = [[position.y1! / this.state.ratio, position.x1! / this.state.ratio], [e.latlng.lat, e.latlng.lng]];
            let rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);
    
            this.setState({
                isResizing: true,
                currentBox: {
                    ...box,
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
    }

    confirmMoveBox = (e: any, isLandmark: boolean) => {
        if (this.state.isMoving && this.state.prevCoords !== undefined) {
            let box = this.state.currentBox;

            if (this.state.currentBox.rectangle) {
                this.state.currentBox.rectangle!.remove();
            }

            let pos = box.position;
            let newBox = this.createRectangle(
                pos.y1! / this.state.ratio + e.latlng.lat - this.state.prevCoords.lat, 
                pos.x1! / this.state.ratio + e.latlng.lng - this.state.prevCoords.lng, 
                pos.y3! / this.state.ratio + e.latlng.lat - this.state.prevCoords.lat, 
                pos.x3! / this.state.ratio + e.latlng.lng - this.state.prevCoords.lng, 
                box.name,
                box.value!,
                false,
                box.id
                );

            if (isLandmark) {
                let boxes = this.state.landmarkBoxes;
                for (var i = 0; i < boxes.length; i++) {
                    if (boxes[i].id === box.id && boxes[i].name === box.name) {
                        boxes.splice(i, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isMoving: false,
                    prevCoords: undefined,
                    currentBox: {
                        id: this.state.drawnLandmarks.length,
                        name: '',
                        position: {}
                    },
                    landmarkBoxes: boxes,
                }, () => this.submitLandmarkData(newBox));
            } else {
                let boxes = this.state.ocrBoxes;
                for (var i = 0; i < boxes.length; i++) {
                    if (boxes[i].id === box.id && boxes[i].name === box.name && boxes[i].value === box.value) {
                        boxes.splice(i, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isMoving: false,
                    prevCoords: undefined,
                    currentBox: {
                        id: 0,
                        name: '',
                        position: {}
                    },
                    ocrBoxes: boxes,
                }, () => this.props.updateOCRData(this.props.currentIndex, newBox.id, newBox.name, newBox.value!, {
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
    }

    confirmResizeBox = (e: any, isLandmark: boolean) => {
        if (this.state.isResizing) {
            let box = this.state.currentBox;

            if (this.state.currentBox.rectangle) {
                this.state.currentBox.rectangle!.remove();
            }

            let pos = box.position;
            let newBox = this.createRectangle(
                pos.y1! / this.state.ratio, 
                pos.x1! / this.state.ratio, 
                e.latlng.lat, 
                e.latlng.lng, 
                box.name,
                box.value!,
                false,
                box.id
                );

            if (isLandmark) {
                let boxes = this.state.landmarkBoxes;
                for (var i = 0; i < boxes.length; i++) {
                    if (boxes[i].id === box.id && boxes[i].name === box.name) {
                        boxes.splice(i, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isResizing: false,
                    currentBox: {
                        id: this.state.drawnLandmarks.length,
                        name: '',
                        position: {}
                    },
                    landmarkBoxes: boxes,
                }, () => this.submitLandmarkData(newBox));
            } else {
                let boxes = this.state.ocrBoxes;
                for (var i = 0; i < boxes.length; i++) {
                    if (boxes[i].id === box.id && boxes[i].name === box.name && boxes[i].value === box.value) {
                        boxes.splice(i, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isResizing: false,
                    currentBox: {
                        id: 0,
                        name: '',
                        position: {}
                    },
                    ocrBoxes: boxes,
                }, () => this.props.updateOCRData(this.props.currentIndex, newBox.id, newBox.name, newBox.value!, {
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
    }

    deleteLandmarkBox = (e: any) => {
        let boxIndex = this.withinLandmarkRectangleBounds(e)!;

        if (boxIndex === undefined) return;
        if (this.state.landmarkBoxes[boxIndex].display) return;

        this.removeMapElements(this.state.landmarkBoxes[boxIndex]);

        let name = this.state.landmarkBoxes[boxIndex].name;
        let index = this.state.drawnLandmarks.indexOf(name);
        let drawn = this.state.drawnLandmarks;
        drawn.splice(index, 1);
        let boxes = this.state.landmarkBoxes;
        boxes.splice(index, 1);
        this.setState({landmarkBoxes: boxes, drawnLandmarks: drawn, isDrawing: false}, () => {this.props.deleteLandmarkData(this.props.currentIndex, name)});
    }

    deleteOcrBox = (e: any) => {
        let boxIndex = this.withinOcrRectangleBounds(e)!;

        if (boxIndex === undefined) return;
        if (this.state.ocrBoxes[boxIndex].display) return;

        this.removeMapElements(this.state.ocrBoxes[boxIndex]);

        let name = this.state.ocrBoxes[boxIndex].name;
        let value = this.state.ocrBoxes[boxIndex].value!;
        let id = this.state.ocrBoxes[boxIndex].id;
        let index = this.state.drawnOCRs.findIndex((each) => each.name === name && each.word.value === value && each.word.id === id);
        let drawn = this.state.drawnOCRs;
        drawn.splice(index, 1);
        let boxes = this.state.ocrBoxes;
        boxes.splice(boxIndex, 1);
        this.setState({ocrBoxes: boxes, drawnOCRs: drawn, isDrawing: false}, () => {
            this.props.updateOCRData(this.props.currentIndex, id, name, value);
        });
    }

    removeMapElements = (box: Box) => {
        box.rectangle!.remove();
        box.descriptor!.remove();
        box.resizeCircle!.remove();
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
        currentIndex: state.image.currentIndex,
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