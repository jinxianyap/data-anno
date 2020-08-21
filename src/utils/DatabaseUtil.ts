import { IDState } from '../store/id/types';
export class DatabaseUtil {

    public static loadIntoIDFolder(files: File[]): IDState {
        return {
            originalID: {
                image: files[0],
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                currentIndex: 0,
                imageProps: [],
                landmark: [],
                ocr: [],
                faceCompareMatch: []
            },
            croppedID: {
                image: files[1],
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                currentIndex: 0,
                imageProps: [],
                landmark: [],
                ocr: [],
                faceCompareMatch: []
            },
            backID: {
                image: files[2],
                segEdit: {
                    IDBoxes: [],
                    internalIDProcessed: [],
                    croppedIDs: []
                },
                currentIndex: 0,
                imageProps: [],
                landmark: [],
                ocr: [],
                faceCompareMatch: []
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