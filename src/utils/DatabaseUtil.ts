import { IDState } from '../store/id/types';
export class DatabaseUtil {

    public static loadIntoIDFolder(files: File[]): IDState {
        return {
            originalID: {
                image: files[0],
                passesCrop: false,
                imageProps: {
                    width: 0,
                    height: 0,
                    offsetX: 0,
                    offsetY: 0
                },
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                landmark: []
            },
            croppedID: {
                image: files[1],
                passesCrop: false,
                imageProps: {
                    width: 0,
                    height: 0,
                    offsetX: 0,
                    offsetY: 0
                },
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                landmark: []
            },
            backID: {
                image: files[2],
                passesCrop: false,
                imageProps: {
                    width: 0,
                    height: 0,
                    offsetX: 0,
                    offsetY: 0
                },
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                landmark: []
            },
            selfieVideo: files[3],
            jsonData: files[4],
            processed: false,
            // for testing need to fix!!!
            index: 0, // kinda redundant
            source: 'sessionId/0001',
            documentType: ''
        }
    }

}