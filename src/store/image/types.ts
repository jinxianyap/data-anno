import { Action } from "../Actions";
import { IDFolder } from "../general/types";


export type ImageState = {
    currentImage: IDFolder;

    // SEG CHECK
    // need to fix
    documentType: string;
    passesCrop: boolean;
}

interface LoadImageState {
    type: typeof Action.LOAD_IMAGE_STATE;
    payload: {
        IDFolder: IDFolder
    }
}

export type ImageActionTypes = LoadImageState