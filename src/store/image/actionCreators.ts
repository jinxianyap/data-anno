import { Action } from "../Actions";
import { IDFolder } from "../general/types";
import { ImageActionTypes } from "./types";

export function loadImageState(currentID: IDFolder): ImageActionTypes {
    return {
        type: Action.LOAD_IMAGE_STATE,
        payload: {
            IDFolder: currentID
        }
    }
}