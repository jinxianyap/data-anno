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
                image: files[3],
                landmark: [],
                ocr: [],
            },
            backID: {
                image: files[1],
                landmark: [],
                ocr: [],
            },
            selfieVideo: files[2],
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

    public static beautifyWord(word: string): string {
        let separates = word.replace(/([A-Z])/g,' $1');
        return separates.charAt(0).toUpperCase()+separates.slice(1);
    }

}