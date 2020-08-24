import { IDState } from '../store/id/types';
export class DatabaseUtil {

    public static loadIntoIDFolder(files: File[], index: number): IDState {
        return {
            originalID: {
                image: files[0],
                landmark: [],
                ocr: [],
            },
            croppedID: {
                image: files[2],
                landmark: [],
                ocr: [],
            },
            backID: {
                image: files[1],
                landmark: [],
                ocr: [],
            },
            selfieVideo: files[3],
            jsonData: files[4],
            processed: false,
            // for testing need to fix!!!
            index: index,
            source: 'sessionId/0001',
            originalIDProcessed: false,
            backIDProcessed: false,
            internalIDs: [],
            internalIndex: 0
        }
    }

}