import { IDFolder } from "../store/general/types";

export class DatabaseUtil {

    public static loadIntoIDFolder(files: File[]): IDFolder {
        return {
            originalID: files[0],
            croppedID: files[1],
            backID: files[2],
            selfieVideo: files[3],
            jsonData: files[4],
            processed: false,
            // for testing need to fix!!!
            index: 1,
            source: 'sessionId/0001',
        }
    }

}