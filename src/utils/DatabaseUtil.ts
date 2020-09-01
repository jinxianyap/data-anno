import { IDState } from '../store/id/types';
import { Rotation } from './enums';
export class DatabaseUtil {

    public static loadIntoIDFolder(files: File[], index: number, json?: any): IDState {
        return {
            originalID: {
                image: files[0],
                croppedImage: files[1],
                landmark: [],
                ocr: [],
            },
            // croppedID: {
            //     image: files[1],
            //     landmark: [],
            //     ocr: [],
            // },
            backID: {
                image: files[2],
                croppedImage: files[1],
                landmark: [],
                ocr: [],
            },
            selfieVideo: files[3],
            jsonData: json !== undefined ? json : undefined,
            processed: false,
            // for testing need to fix!!!
            index: index,
            source: 'sessionId/0001',
            originalIDProcessed: false,
            backIDsProcessed: 0,
            originalIDRotation: Rotation.ROT0,
            croppedIDRotation: Rotation.ROT0,
            backIDRotation: Rotation.ROT0,
            internalIDs: [],
            internalIndex: 0
        }
    }

    public static beautifyWord(word: string): string {
        let separates = word.replace(/([A-Z])/g,' $1');
        return separates.charAt(0).toUpperCase()+separates.slice(1);
    }

}