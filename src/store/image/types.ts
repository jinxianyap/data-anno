import { Action } from "../Actions";

export type ImageState = {
    image: File;
    // Seg Check
    passesCrop: boolean;

    // Image Properties
    imageProps: {
        width: number,
        height: number,
        offsetX: number,
        offsetY: number
    }

    segEdit: {
        IDBoxes: IDBox[],
    }
}

export type IDBox = {
    id: number;
    position: {
        left: number,
        top: number,
        width: number,
        height: number
    }
}

interface LoadImageState {
    type: typeof Action.LOAD_IMAGE_STATE;
    payload: {
        currentImage: ImageState
    }
}

interface SaveSegCheck {
    type: typeof Action.SAVE_SEG_CHECK;
    payload: {
        passesCrop: boolean;
    }
}

interface SetImageProps {
    type: typeof Action.SET_IMAGE_PROPS;
    payload: {
        width: number,
        height: number,
        offsetX: number,
        offsetY: number
    }
}

interface AddIDBox {
    type: typeof Action.ADD_ID_BOX;
    payload: {
        IDBox: IDBox
    }
}
interface DeleteIDBox {
    type: typeof Action.DELETE_ID_BOX;
    payload: {
        id: number
    }
}

export type ImageActionTypes = LoadImageState
    | SaveSegCheck
    | AddIDBox
    | DeleteIDBox
    | SetImageProps