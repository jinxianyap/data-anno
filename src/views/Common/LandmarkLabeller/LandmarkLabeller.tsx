import L from 'leaflet';
import 'leaflet-easybutton/src/easy-button';
import React from 'react';
import { connect } from 'react-redux'; 
import { ImageActionTypes, ImageState, LandmarkData, Position, OCRData, OCRWord } from '../../../store/image/types';
import { addLandmarkData, deleteLandmarkPosition, updateOCRData, setCurrentSymbol, setCurrentWord } from '../../../store/image/actionCreators';
import { AppState } from '../../../store';
import { CurrentStage } from '../../../utils/enums';
import './LandmarkLabeller.scss';

interface IProps {
    currentStage: CurrentStage;
    currentImageState: ImageState,
    currentSymbol: string,
    ocrToLandmark: string,
    currentWord: OCRWord,
    committedLandmarks: LandmarkData[],
    committedOCRs: OCRData[],

    addLandmarkData: (landmark: LandmarkData) => ImageActionTypes,
    deleteLandmarkPosition: (landmark: string) => ImageActionTypes,
    updateOCRData: (id: number, name: string, value: string, position?: Position) => ImageActionTypes,
    setCurrentSymbol: (symbol?: string, landmark?: string) => ImageActionTypes,
    setCurrentWord: (word: OCRWord) => ImageActionTypes
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

    isDrawing: boolean,
    isResizing: boolean,
    resizingBox?: number,
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
    }[],
}

type Box = {
    id: number,
    name: string,
    codeName: string,
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
    resizeBoxes?: L.Rectangle[]
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
            xmargin: 0,
            ymargin: 0,
            ratio: 0,
            isDrawing: false,
            isResizing: false,
            isMoving: false,
            currentBox: {
                id: 0,
                name: '',
                codeName: '',
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
        this.props.setCurrentSymbol();
    }

    componentDidUpdate(previousProps: IProps, previousState: IState) {
        if (previousProps !== this.props && this.state.map !== undefined) {
            this.renderCommittedLandmarks();
            this.renderCommittedOCRs();
        }
        if (previousProps.currentStage !== this.props.currentStage) {
            // switch (this.props.currentStage) {
            //     case (CurrentStage.OCR_EDIT): {
            //         this.renderCommittedOCRs();
            //         break;
            //     }
            //     case (CurrentStage.OCR_DETAILS): {
            //         if (previousProps.currentStage !== CurrentStage.OCR_EDIT) {
            //             this.renderCommittedLandmarks();
            //         }
            //         this.renderCommittedOCRs();
            //         break;
            //     }
            //     case (CurrentStage.LANDMARK_EDIT): {
            //         this.renderCommittedLandmarks();
            //         break;
            //     }
            // }
        } else {
            if (this.props.currentStage === CurrentStage.OCR_EDIT) {
                if (this.state.map !== undefined) {
                    if (this.props.currentSymbol !== undefined && this.props.ocrToLandmark !== undefined) {
                        this.focusMap(true);
                    } else {
                        this.focusMap(false);
                    }
                }
            }
        }
        if (previousProps.currentSymbol !== this.props.currentSymbol || previousProps.currentWord !== this.props.currentWord) {
            this.setState({
                isDrawing: false,
                isResizing: false,
                isMoving: false,
                currentBox: {
                    id: 0,
                    name: '',
                    codeName: '',
                    position: {}
                }
            })
        }
    }

    loadImageData = () => {
        let image = new Image();
        image.onload = () => {
            let wrapper: HTMLElement = document.getElementById('landmark-ocr')!;
            let clHeight = wrapper === null ? 800 : wrapper.clientHeight;
            let clWidth = wrapper === null ? 800 : wrapper.clientWidth;
            let fitHeight = wrapper === null ? 800 : clHeight * 0.75;
            let fitWidth = wrapper === null ? 800 : clWidth * 0.75;
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

            let xmargin = (clWidth - width) / 2;
            let ymargin = (clHeight - height) / 2;

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
        image.src = URL.createObjectURL(this.props.currentImageState.croppedImage);
    }

    initializeMap = () => {
        let st = this.state;
        let top: [number, number] = [0, 0];
        let wrapper: HTMLElement = document.getElementById('landmark-ocr')!;
        let mapBounds: [number, number][] = [[wrapper.clientHeight - st.ymargin, -st.xmargin], [-st.ymargin, wrapper.clientWidth - st.xmargin]];
        let imageBounds: [number, number][] = [[st.height, 0], [0, st.width]];

        let map = L.map('landmarkLabeller', {
            center: top,
            crs: L.CRS.Simple,
            zoom: 8,
            dragging: true,
            maxBounds: mapBounds,
            maxBoundsViscosity: 0.5
        });

        let layer = new L.TileLayer('', {
            tileSize: L.point(st.height, st.width),
            noWrap: true
        });

        let easyButton = L.easyButton('<span>&hercon;</span>', () => {
            map.fitBounds(imageBounds);
        }).addTo(map);

        let overlay = L.imageOverlay(st.source, imageBounds);

        map.addLayer(layer);
        overlay.addTo(map);
        map.fitBounds(imageBounds);
        map.on('mousedown', this.handleMouseDown);
        map.on('mousemove', this.handleMouseMove);
        map.on('mouseup', this.handleMouseUp);
        map.on('contextmenu', this.handleContextMenu);
        this.setState({map: map}, () => {this.renderCommittedLandmarks(); this.renderCommittedOCRs();});
    }

    focusMap = (focus: boolean) => {
        let map = this.state.map!;

        if (!focus) {
            map.setView(map.getCenter(), 0);
            return;
        }

        let box = this.getLandmarkFromOCR(this.props.ocrToLandmark);

        if (box !== undefined && map.hasLayer(box.rectangle!)) {
            map.panTo(box.rectangle!.getCenter());
            map.fitBounds(box.rectangle!.getBounds());
        }
    }

    renderCommittedLandmarks = () => {
        let newBoxes: Box[] = [];
        let drawnLandmarks: string[] = [];

        if (this.state.landmarkBoxes.length > 0) {
            this.state.landmarkBoxes.forEach((each) => this.removeMapElements(each))
        };

        let landmarks = this.props.committedLandmarks;
        landmarks.forEach((landmark: LandmarkData) => {
            if (landmark.position !== undefined) {
                let createdBox = this.createRectangle(
                    landmark.position.y1 / this.state.ratio,
                    landmark.position.x1 / this.state.ratio,
                    landmark.position.y3 / this.state.ratio,
                    landmark.position.x3 / this.state.ratio,
                    landmark.name,
                    landmark.codeName,
                    landmark.name,
                    this.props.currentStage !== CurrentStage.LANDMARK_EDIT,
                    true,
                    undefined,
                    this.props.currentStage !== CurrentStage.LANDMARK_EDIT ? false : this.props.currentSymbol === landmark.name);
                let box: Box = {
                    id: landmark.id,
                    codeName: landmark.codeName,
                    name: landmark.name,
                    value: landmark.name,
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
                    resizeBoxes: createdBox.resizeBoxes
                };

                newBoxes.push(box);
                drawnLandmarks.push(box.name);
            }
        });
        this.setState({landmarkBoxes: newBoxes, drawnLandmarks: drawnLandmarks});
    }

    renderCommittedOCRs = () => {
        let newBoxes: Box[] = [];
        let drawnOCRs: {name: string, word: OCRWord}[] = [];

        if (this.state.ocrBoxes.length > 0) {
            this.state.ocrBoxes.forEach((each) => this.removeMapElements(each))
        };

        let ocrs = this.props.committedOCRs;
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
                        ocr.codeName,
                        label.value,
                        this.props.currentStage !== CurrentStage.OCR_EDIT,
                        false,
                        label.id,
                        this.props.currentStage !== CurrentStage.OCR_EDIT ? false :
                        this.props.currentSymbol === ocr.name && this.props.currentWord.id === label.id);
                    let box: Box = {
                        id: label.id,
                        codeName: ocr.codeName,
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
                        resizeBoxes: createdBox.resizeBoxes
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
        if (e.originalEvent.which !== 1 || e.originalEvent.detail > 1) return;
        switch (this.props.currentStage) {
            case (CurrentStage.OCR_DETAILS): {
                return;
            }
            case (CurrentStage.LANDMARK_EDIT): {
                // if (this.state.isMoving) {
                //     this.setMoveBox(e, true);
                //     return;
                // }

                if (this.state.isResizing) {
                  this.confirmResizeBox(e, true);  
                  return;
                } else if (this.state.isMoving) {
                    this.confirmMoveBox(e, true);
                    return;
                } else {
                    let resizeIndex = this.withinLandmarkResizeBounds(e);
                    if (resizeIndex !== undefined) {
                        this.state.map!.dragging.disable();
                        this.setResizeBox(resizeIndex, true);
                        return;
                    }
                    let moveIndex = this.withinLandmarkRectangleBounds(e, this.props.currentSymbol);
                    if (moveIndex !== undefined) {
                        this.setMoveBox(e, moveIndex, true);
                        return;
                    }
                }
                if (!this.props.currentSymbol && !this.handleNextLandmark()) return;
                if (this.state.drawnLandmarks.includes(this.props.currentSymbol) && !this.handleNextLandmark()) return;
                break;
            }
            case (CurrentStage.OCR_EDIT): {
                // if (this.state.isMoving) {
                //     this.setMoveBox(e, false);
                //     return;
                // }

                if (this.state.isResizing) {
                    this.confirmResizeBox(e, false); 
                    return;
                } else if (this.state.isMoving) {
                    this.confirmMoveBox(e, false);
                    return;
                } else {
                    let resizeIndex = this.withinOcrResizeBounds(e);
                    if (resizeIndex !== undefined) {
                        this.state.map!.dragging.disable();
                        this.setResizeBox(resizeIndex, false);
                        return;
                    }
                    if (this.props.currentSymbol !== undefined && this.props.currentWord !== undefined) {
                        let moveIndex = this.withinOcrRectangleBounds(e, this.props.currentSymbol, this.props.currentWord.value);
                        if (moveIndex !== undefined) {
                            this.setMoveBox(e, moveIndex, false);
                            return;
                        }
                    }
                }
                if (!this.props.currentSymbol || !this.props.currentWord) return;
                if (this.ocrWordDrawn() && !this.handleNextOCR()) return;
                break;
            }
        }

        if (this.state.isDrawing) return;

        this.state.map!.dragging.disable();

        if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            let landmark = this.getLandmarkFromOCR(this.props.ocrToLandmark);
            if (landmark === undefined) return;
            if (!landmark.rectangle!.getBounds().contains(e.latlng)) return;
        }

        this.setState({
            isDrawing: true,
            currentBox: {
                id: this.props.currentStage === CurrentStage.OCR_EDIT ? this.props.currentWord.id
                : this.props.currentImageState.landmark.find((each) => each.name === this.props.currentSymbol)!.id,
                name: this.props.currentSymbol,
                codeName: '',
                position: {
                    x1: e.latlng.lng * this.state.ratio,
                    y1: e.latlng.lat * this.state.ratio,
                    y2: e.latlng.lat * this.state.ratio,
                    x4: e.latlng.lng * this.state.ratio
                }
            }
        });
    }

    handleNextLandmark = () => {
        let landmark = this.props.currentImageState.landmark.filter((each) => each.position === undefined).sort((a, b) => a.id - b.id);
        if (landmark === undefined || landmark.length === 0) return false;
        this.props.setCurrentSymbol(landmark[0].name);
        return true;
    }

    handleNextOCR = () => {
        let ocr = this.props.currentImageState.ocr.find((each) => each.name === this.props.currentSymbol);
        if (ocr === undefined) return false;
        let word = ocr.labels.filter((each) => each.position === undefined).sort((a, b) => a.id - b.id);
        if (word === undefined || word.length === 0) return false;
        this.props.setCurrentWord(word[0]);
        return true;
    }

    getLandmarkFromOCR = (name: string)  => {
        if (name === undefined) return undefined;
        return this.state.landmarkBoxes.find((each) => each.name === name);
    }

    handleMouseMove = (e: any) => {
        if (this.state.isMoving && this.state.prevCoords !== undefined) {
            this.moveBox(e, this.props.currentStage === CurrentStage.LANDMARK_EDIT);
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
                id: this.state.currentBox.id,
                name: this.props.currentSymbol,
                codeName: '',
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
        if (e.originalEvent.which !== 1 || e.originalEvent.detail > 1) return;

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
                this.props.currentImageState.landmark.find((each) => each.name === this.props.currentSymbol)!.codeName,
                this.props.currentSymbol,
                false,
                true,
                this.state.currentBox.id,
                true);
            let boxes = this.state.landmarkBoxes;
            boxes.push(newBox);
            let drawnLandmarks = this.state.drawnLandmarks;
            drawnLandmarks.push(this.props.currentSymbol);
    
            this.setState({
                isDrawing: false,
                isResizing: false,
                isMoving: false,
                currentBox: {
                    id: this.state.drawnLandmarks.length,
                    name: '',
                    codeName: '',
                    position: {}
                },
                landmarkBoxes: boxes,
                drawnLandmarks: drawnLandmarks
            }, () => this.submitLandmarkData(newBox));
        } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            let landmark = this.getLandmarkFromOCR(this.props.ocrToLandmark);
            if (landmark === undefined) return;
            let latlng: [number, number] = this.getConstrainedBounds(landmark, e.latlng.lat, e.latlng.lng);

            let newBox: Box = this.createRectangle(
                currentPos.y1! / this.state.ratio, 
                currentPos.x1! / this.state.ratio, 
                latlng[0], 
                latlng[1],
                this.props.currentSymbol, 
                this.props.currentImageState.ocr.find((each) => each.name === this.props.currentSymbol)!.codeName,
                this.props.currentImageState.currentWord!.value,
                false,
                false,
                undefined,
                true);
            newBox.value = this.props.currentImageState.currentWord!.value;
            let boxes = this.state.ocrBoxes;
            boxes.push(newBox);
            let drawnOCRs = this.state.drawnOCRs;
            drawnOCRs.push({name: this.props.currentSymbol, word: this.props.currentWord});

            this.setState({
                isDrawing: false,
                isResizing: false,
                isMoving: false,
                currentBox: {
                    id: 0,
                    name: '',
                    codeName: '',
                    position: {}
                },
                ocrBoxes: boxes,
                drawnOCRs: drawnOCRs
            }, () => this.props.updateOCRData(newBox.id, newBox.name, newBox.value!, {
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
        this.state.map!.dragging.enable();
    }

    getConstrainedBounds = (landmark: Box, lat: number, lng: number) => {
        let bounds = landmark.rectangle!.getBounds();
        let finalLat = lat;
        let finalLng = lng;
        if (lat > bounds.getNorth()) {
            finalLat = bounds.getNorth();
        } else if (lat < bounds.getSouth()) {
            finalLat = bounds.getSouth();
        }

        if (lng > bounds.getEast()) {
            finalLng = bounds.getEast();
        } else if (lng < bounds.getWest()) {
            finalLng = bounds.getWest();
        }

        let result: [number, number] = [finalLat, finalLng];

        return result;
    }

    handleContextMenu = (e: any) => {
        if (this.state.isDrawing || this.state.isMoving || this.state.isResizing) return;
        if (this.props.currentStage === CurrentStage.LANDMARK_EDIT) {
            this.deleteLandmarkBox(e);
        } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {
            this.deleteOcrBox(e);
        }
    }

    createRectangle = (lat1: number, lng1: number, lat2: number, lng2: number, name: string, codeName: string, value: string, display?: boolean, isLandmark?: boolean, id?: number, active?: boolean) => {
        let boxBounds: [number, number][] = this.reorderCoords(lat1, lng1, lat2, lng2);
        let rectangle = L.rectangle(boxBounds, {color: active ? "green" : "red", weight: 1, className: 'bounding-box'}).addTo(this.state.map!);
       
        let resizeBoxes: L.Rectangle[] = [];
        resizeBoxes.push(L.rectangle([boxBounds[0], [boxBounds[0][0] - 10, boxBounds[0][1] + 10]],
            {color: 'red', fillColor: 'red', fillOpacity: 0, weight: 0, className: 'resize-box'}));
        resizeBoxes.push(L.rectangle([[boxBounds[0][0], boxBounds[1][1] - 10], [boxBounds[0][0] - 10, boxBounds[1][1]]],
            {color: 'red', fillColor: 'red', fillOpacity: 0, weight: 0, className: 'resize-box'}));
        resizeBoxes.push(L.rectangle([[boxBounds[1][0] + 10, boxBounds[1][1] - 10], boxBounds[1]],
            {color: 'red', fillColor: 'red', fillOpacity: 0, weight: 0, className: 'resize-box'}));
        resizeBoxes.push(L.rectangle([[boxBounds[1][0] + 10, boxBounds[0][1]], [boxBounds[1][0], boxBounds[0][1] + 10]],
            {color: 'red', fillColor: 'red', fillOpacity: 0, weight: 0, className: 'resize-box'}));

        let htmlText = '<p>' + value + '</p>';
        if (!isLandmark) {
            htmlText = '<p>' + (id !== undefined ? id : this.props.currentWord.id) + ": " + value + '</p>'
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
    
                    this.state.landmarkBoxes[index].resizeBoxes!.forEach((each) => each.addTo(this.state.map!));
                })
                rectangle.bringToFront();
            } else if (this.props.currentStage === CurrentStage.OCR_EDIT) {
                rectangle.on('mouseover', (e: any) => {
                    let index = this.withinOcrRectangleBounds(e);
                    if (index === undefined) return;
    
                    this.state.ocrBoxes[index].resizeBoxes!.forEach((each) => each.addTo(this.state.map!));
                })
                rectangle.bringToFront();
            }
        }

        let resultBox: Box = {
            id: id !== undefined ? id : (!isLandmark ? this.props.currentWord.id : this.state.drawnLandmarks.length),
            name: name,
            codeName: codeName,
            value: value,
            position: {
                x1: boxBounds[0][1] * this.state.ratio,
                x2: boxBounds[1][1] * this.state.ratio,
                x3: boxBounds[1][1] * this.state.ratio,
                x4: boxBounds[0][1] * this.state.ratio,
                y1: boxBounds[0][0] * this.state.ratio,
                y2: boxBounds[0][0] * this.state.ratio,
                y3: boxBounds[1][0] * this.state.ratio,
                y4: boxBounds[1][0] * this.state.ratio
            },
            rectangle: rectangle,
            descriptor: textMarker,
            display: display,
            resizeBoxes: resizeBoxes
        }
        return resultBox;
    }

    reorderCoords = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        let x1 = Math.min(lng1, lng2);
        let x3 = Math.max(lng1, lng2);
        let y1 = Math.max(lat1, lat2);
        let y3 = Math.min(lat1, lat2);
        let coords: [number, number][] = [[y1, x1], [y3, x3]];
        return coords
    }

    submitLandmarkData = (landmark: Box) => {
        let landmarkData: LandmarkData = {
            id: landmark.id,
            type: 'landmark',
            name: landmark.name,
            codeName: landmark.codeName,
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
        this.props.addLandmarkData(landmarkData);
    }

    withinLandmarkRectangleBounds = (e: any, symbol?: string) => {
        if (symbol !== undefined) {
            for (let i = 0; i < this.state.landmarkBoxes.length; i++) {
                if ((this.state.landmarkBoxes[i].rectangle!.getBounds().contains(e.latlng))
                // || this.state.landmarkBoxes[i].wrapper!.getBounds().contains(e.latlng))
                && this.state.landmarkBoxes[i].name === symbol) {
                    return i;
                }
            }
            return undefined;
        } else {
            for (let i = 0; i < this.state.landmarkBoxes.length; i++) {
                if (this.state.landmarkBoxes[i].rectangle!.getBounds().contains(e.latlng)
                // || this.state.landmarkBoxes[i].wrapper!.getBounds().contains(e.latlng)
                ) {
                    return i;
                }
            }
            return undefined;
        }
    }

    withinLandmarkResizeBounds = (e: any) => {
        for (let i = 0; i < this.state.landmarkBoxes.length; i++) {
            let index = this.state.landmarkBoxes[i].resizeBoxes!.findIndex((each) => {
                            try {
                                let bounds = each.getBounds();
                                if (this.state.map && bounds.contains(e.latlng)) {
                                    return true;
                                }
                            } catch (err) {
                                console.error(err);
                                return false;
                            }
                            return false;
                        });
            if (index !== undefined && index !== -1) return [i, index];
        }
        return undefined;
    }   

    withinOcrResizeBounds = (e: any) => {
        for (let i = 0; i < this.state.ocrBoxes.length; i++) {
            let index = this.state.ocrBoxes[i].resizeBoxes!.findIndex((each) => {
                try {
                    let bounds = each.getBounds();
                    if (this.state.map && bounds.contains(e.latlng)) {
                        return true;
                    }
                } catch (err) {
                    console.error(err);
                    return false;
                }
                return false;
            });
            if (index !== undefined && index !== -1) return [i, index];
        }
        return undefined;
    }   

    withinOcrRectangleBounds = (e: any, symbol?: string, value?: string) => {
        if (symbol !== undefined && value !== undefined) {
            for (let i = 0; i < this.state.ocrBoxes.length; i++) {
                if ((this.state.ocrBoxes[i].rectangle!.getBounds().contains(e.latlng))
                // || this.state.ocrBoxes[i].wrapper!.getBounds().contains(e.latlng))
                && this.state.ocrBoxes[i].name === symbol
                && this.state.ocrBoxes[i].value === value) {
                    return i;
                }
            }
            return undefined;
        } else {
            for (let i = 0; i < this.state.ocrBoxes.length; i++) {
                if (this.state.ocrBoxes[i].rectangle!.getBounds().contains(e.latlng)
                // || this.state.ocrBoxes[i].wrapper!.getBounds().contains(e.latlng)
                ) {
                    return i;
                }
            }
            return undefined;
        }
    }

    setMoveBox = (e: any, index: number, isLandmark: boolean) => {
        this.state.map!.dragging.disable();
        let box = isLandmark ? this.state.landmarkBoxes[index] : this.state.ocrBoxes[index];

        if (box.descriptor) {
            this.removeMapElements(box);
        }    
        if (box.rectangle) {
            box.rectangle!.remove();
        }

       
        this.setState({
            currentBox: box,
            isMoving: true,
            prevCoords: {
                lat: e.latlng.lat,
                lng: e.latlng.lng
            }
        });
    }

    setResizeBox = (index: number[], isLandmark: boolean) => {
        let box = isLandmark ? this.state.landmarkBoxes[index[0]] : this.state.ocrBoxes[index[0]];
        if (box.descriptor) {
            this.removeMapElements(box);
        }    

        if (box.rectangle) {
            box.rectangle!.remove();
        }

        let bounds = box.rectangle!.getBounds();
        let rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);
        box.rectangle = rectangle;

        this.setState({
            currentBox: box,
            isResizing: true,
            resizingBox: index[1]
        });
    }

    moveBox = (e: any, isLandmark: boolean) => {
        if (this.state.isMoving && this.state.prevCoords !== undefined) {
            let box = this.state.currentBox;

            let position = this.state.currentBox.position;
            let latOffset = e.latlng.lat - this.state.prevCoords!.lat;
            let lngOffset = e.latlng.lng - this.state.prevCoords!.lng;

            let bounds: [number, number][] = [
                [position.y1! / this.state.ratio + latOffset, position.x1! / this.state.ratio + lngOffset],
                [position.y3! / this.state.ratio + latOffset, position.x3! / this.state.ratio + lngOffset]];
            let prevCoords = {
                lat: e.latlng.lat,
                lng: e.latlng.lng
            };

            let ob = this.outOfBounds(bounds);
            if (!isLandmark && ob.includes(true)) {
                if ((ob[0] && ob[1] && !ob[2] && !ob[3])
                    || (ob[2] && ob[3] && !ob[0] && !ob[1])) {
                    bounds[0][0] = position.y1! / this.state.ratio;
                    bounds[1][0] = position.y3! / this.state.ratio;
                    prevCoords = {
                        lat: this.state.prevCoords.lat,
                        lng: e.latlng.lng
                    };
                } else if ((ob[1] && ob[2] && !ob[0] && !ob[3])
                    || (ob[0] && ob[3] && !ob[1] && !ob[2])) {
                    bounds[0][1] = position.x1! / this.state.ratio;
                    bounds[1][1] = position.x3! / this.state.ratio;
                    prevCoords = {
                        lat: e.latlng.lat,
                        lng: this.state.prevCoords.lng
                    };
                } else {
                    return;
                }
            }

            if (this.state.currentBox.descriptor) {
                this.removeMapElements(box);
            }    
            if (this.state.currentBox.rectangle) {
                this.state.currentBox.rectangle!.remove();
            }
            let rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);

            this.setState({
                isMoving: true,
                currentBox: {
                    ...box,
                    position: {
                        x1: bounds[0][1] * this.state.ratio,
                        x2: bounds[1][1] * this.state.ratio,
                        x3: bounds[1][1] * this.state.ratio,
                        x4: bounds[0][1] * this.state.ratio,
                        y1: bounds[0][0] * this.state.ratio,
                        y2: bounds[0][0] * this.state.ratio,
                        y3: bounds[1][0] * this.state.ratio,
                        y4: bounds[1][0] * this.state.ratio,
                    },
                    rectangle: rectangle,
                },
                prevCoords: prevCoords
            });
        }
    }

    outOfBounds = (bounds: [number, number][]) => {
        let landmark = this.getLandmarkFromOCR(this.props.ocrToLandmark);
        if (landmark === undefined) return [true, true, true, true];
        let points: [number, number][] = [
            [bounds[0][0], bounds[0][1]],
            [bounds[0][0], bounds[1][1]],
            [bounds[1][0], bounds[1][1]],
            [bounds[1][0], bounds[0][1]]
        ];
        return points.map((point) => !landmark!.rectangle!.getBounds().contains(point));
    }

    getResizedPositions = (lat: number, lng: number) => {
        let newPosition: any = {};
        switch (this.state.resizingBox) {
            case (0): {
                newPosition = {
                    ...this.state.currentBox.position,
                    x1: lng * this.state.ratio,
                    y1: lat * this.state.ratio,
                    x4: lng * this.state.ratio,
                    y2: lat * this.state.ratio
                }
                break;
            }
            case (1): {
                newPosition = {
                    ...this.state.currentBox.position,
                    x3: lng * this.state.ratio,
                    y1: lat * this.state.ratio,
                    x2: lng * this.state.ratio,
                    y2: lat * this.state.ratio
                }
                break;
            }
            case (2): {
                newPosition = {
                    ...this.state.currentBox.position,
                    x2: lng * this.state.ratio,
                    y3: lat * this.state.ratio,
                    x3: lng * this.state.ratio,
                    y4: lat * this.state.ratio
                }
                break;
            }
            case (3): {
                newPosition = {
                    ...this.state.currentBox.position,
                    x1: lng * this.state.ratio,
                    y3: lat * this.state.ratio,
                    x4: lng * this.state.ratio,
                    y4: lat * this.state.ratio
                }
                break;
            }
        }
        return newPosition;
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

            let pos: any = this.getResizedPositions(e.latlng.lat, e.latlng.lng);
            let bounds: [number, number][] = [[pos.y1 / this.state.ratio, pos.x1 / this.state.ratio], [pos.y3 / this.state.ratio, pos.x3 / this.state.ratio]];
            let rectangle = L.rectangle(bounds, {color: "yellow", weight: 1}).addTo(this.state.map!);
    
            this.setState({
                isResizing: true,
                currentBox: {
                    ...box,
                    position: pos,
                    rectangle: rectangle,
                }
            });
        }
    }

    confirmMoveBox = (e: any, isLandmark: boolean) => {
        if (this.state.isMoving && this.state.prevCoords !== undefined) {
            let box = this.state.currentBox;
            let pos = box.position;

            if (this.state.currentBox.rectangle) {
                this.state.currentBox.rectangle!.remove();
            }

            if (isLandmark) {
                let newBox = this.createRectangle(
                    pos.y1! / this.state.ratio + e.latlng.lat - this.state.prevCoords.lat, 
                    pos.x1! / this.state.ratio + e.latlng.lng - this.state.prevCoords.lng, 
                    pos.y3! / this.state.ratio + e.latlng.lat - this.state.prevCoords.lat, 
                    pos.x3! / this.state.ratio + e.latlng.lng - this.state.prevCoords.lng, 
                    box.name,
                    box.codeName,
                    box.value!,
                    false,
                    isLandmark,
                    box.id,
                    true
                );
                let boxes = this.state.landmarkBoxes;
                for (var i = 0; i < boxes.length; i++) {
                    if (boxes[i].id === box.id && boxes[i].name === box.name) {
                        boxes.splice(i, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isDrawing: false,
                    isResizing: false,
                    isMoving: false,
                    prevCoords: undefined,
                    currentBox: {
                        id: this.state.drawnLandmarks.length,
                        name: '',
                        codeName: '',
                        position: {}
                    },
                    landmarkBoxes: boxes,
                }, () => this.submitLandmarkData(newBox));
            } else {
                let lat1 = pos.y1! / this.state.ratio + e.latlng.lat - this.state.prevCoords.lat;
                let lng1 = pos.x1! / this.state.ratio + e.latlng.lng - this.state.prevCoords.lng;
                let lat2 = pos.y3! / this.state.ratio + e.latlng.lat - this.state.prevCoords.lat;
                let lng2 = pos.x3! / this.state.ratio + e.latlng.lng - this.state.prevCoords.lng;

                if (this.outOfBounds([[lat1, lng1],[lat2, lng2]])) {
                    lat1 = pos.y1! / this.state.ratio;
                    lng1 = pos.x1! / this.state.ratio;
                    lat2 = pos.y3! / this.state.ratio;
                    lng2 = pos.x3! / this.state.ratio;
                }

                let newBox = this.createRectangle(
                    lat1,
                    lng1,
                    lat2,
                    lng2,
                    box.name,
                    box.codeName,
                    box.value!,
                    false,
                    isLandmark,
                    box.id,
                    true
                );
                let boxes = this.state.ocrBoxes;
                for (var j = 0; j < boxes.length; j++) {
                    if (boxes[j].id === box.id && boxes[j].name === box.name && boxes[j].value === box.value) {
                        boxes.splice(j, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isDrawing: false,
                    isResizing: false,
                    isMoving: false,
                    prevCoords: undefined,
                    currentBox: {
                        id: 0,
                        name: '',
                        codeName: '',
                        position: {}
                    },
                    ocrBoxes: boxes,
                }, () => this.props.updateOCRData(newBox.id, newBox.name, newBox.value!, {
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

            if (box.rectangle) {
                box.rectangle!.remove();
            }

            if (isLandmark) {
                let pos = this.getResizedPositions(e.latlng.lat, e.latlng.lng);
                let newBox = this.createRectangle(
                    pos.y1! / this.state.ratio, 
                    pos.x1! / this.state.ratio, 
                    pos.y3! / this.state.ratio, 
                    pos.x3! / this.state.ratio, 
                    box.name,
                    box.codeName,
                    box.value!,
                    false,
                    isLandmark,
                    box.id,
                    this.props.currentSymbol === box.name
                );
                let boxes = this.state.landmarkBoxes;
                for (var i = 0; i < boxes.length; i++) {
                    if (boxes[i].id === box.id && boxes[i].name === box.name) {
                        boxes.splice(i, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isDrawing: false,
                    isResizing: false,
                    resizingBox: undefined,
                    isMoving: false,
                    currentBox: {
                        id: this.state.drawnLandmarks.length,
                        name: '',
                        codeName: '',
                        position: {}
                    },
                    landmarkBoxes: boxes,
                }, () => this.submitLandmarkData(newBox));
            } else {
                let landmark = this.getLandmarkFromOCR(this.props.ocrToLandmark);
                if (landmark === undefined) return;
                let latlng: [number, number] = this.getConstrainedBounds(landmark, e.latlng.lat, e.latlng.lng);
                let pos = this.getResizedPositions(latlng[0], latlng[1]);

                let newBox = this.createRectangle(
                    pos.y1! / this.state.ratio, 
                    pos.x1! / this.state.ratio, 
                    pos.y3! / this.state.ratio, 
                    pos.x3! / this.state.ratio, 
                    box.name,
                    box.codeName,
                    box.value!,
                    false,
                    isLandmark,
                    box.id,
                    this.props.currentSymbol === box.name && this.props.currentWord.id === box.id
                );
                let boxes = this.state.ocrBoxes;
                for (var j = 0; j < boxes.length; j++) {
                    if (boxes[j].id === box.id && boxes[j].name === box.name && boxes[j].value === box.value) {
                        boxes.splice(j, 1, newBox);
                        break;
                    }
                }
                this.setState({
                    isDrawing: false,
                    isResizing: false,
                    isMoving: false,
                    currentBox: {
                        id: 0,
                        name: '',
                        codeName: '',
                        position: {}
                    },
                    ocrBoxes: boxes,
                }, () => this.props.updateOCRData(newBox.id, newBox.name, newBox.value!, {
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
        this.setState({landmarkBoxes: boxes, drawnLandmarks: drawn, isDrawing: false, isMoving: false, isResizing: false}, () => {this.props.deleteLandmarkPosition(name)});
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
        this.setState({ocrBoxes: boxes, drawnOCRs: drawn, isDrawing: false, isMoving: false, isResizing: false}, () => {
            this.props.updateOCRData(id, name, value);
            this.handleNextOCR();
        });
    }

    removeMapElements = (box: Box) => {
        box.rectangle!.remove();
        box.descriptor!.remove();
        box.resizeBoxes!.forEach((each) => each.remove());
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
        ocrToLandmark: state.image.ocrToLandmark!,
        currentWord: state.image.currentWord!,
        committedLandmarks: state.image.landmark,
        committedOCRs: state.image.ocr
}};
    
const mapDispatchToProps = {
    addLandmarkData,
    deleteLandmarkPosition,
    updateOCRData,
    setCurrentSymbol,
    setCurrentWord
}
    
export default connect(
    mapStateToProps, 
    mapDispatchToProps
)(LandmarkLabeller);