export enum Action {
    // GENERAL
    SAVE_SETUP_OPTIONS = "@@SAVE_SETUP_OPTIONS",
    PROGRESS_NEXT_STAGE = "@@PROGRESS_NEXT_STAGE",
    LOAD_FROM_DATABASE = "@@LOAD_FROM_DATABASE",
    GET_NEXT_ID = "@@GET_NEXT_ID",
    SAVE_TO_LIBRARY = "@@SAVE_TO_LIBRARY",
    RESTORE_GENERAL = "@@RESTORE_GENERAL",

    // ID
    LOAD_NEXT_ID = "@@LOAD_NEXT_ID",
    CREATE_NEW_ID = "@@CREATE_NEW_ID",
    DELETE_ID_BOX = "@@DELETE_ID_BOX",
    SAVE_CROPPED_IMAGE = "@@SAVE_CROPPED_IMAGE",
    REFRESH_IDS = "@@REFRESH_IDS",
    SAVE_DOCUMENT_TYPE = "@@SAVE_DOCUMENT_TYPE",
    SAVE_TO_INTERNAL_ID = "@@SAVE_TO_INTERNAL_ID",
    RESTORE_ID = "@@RESTORE_ID",

    // IMAGE
    RESTORE_IMAGE = "@@RESTORE_IMAGE",

    // IMAGE - SEGMENTATION
    LOAD_IMAGE_STATE = "@@LOAD_IMAGE_STATE",
    SAVE_SEG_CHECK = "@@SAVE_SEG_CHECK",
    SET_IMAGE_PROPS = "@@SET_IMAGE_PROPS",
    SET_ID_BOX = "@@SET_ID_BOX",
    SET_IMAGE_ROTATION = "@@SET_IMAGE_ROTATION",

    // IMAGE - LANDMARK
    SET_CURRENT_SYMBOL = "@@SET_CURRENT_SYMBOL",
    ADD_LANDMARK_DATA = "@@ADD_LANDMARK_DATA",
    DELETE_LANDMARK_DATA = "@@DELETE_LANDMARK_DATA",
    UPDATE_LANDMARK_FLAGS = "@@UPDATE_LANDMARK_FLAGS",

    // IMAGE - OCR
    ADD_OCR_DATA = "@@ADD_OCR_DATA",
    SET_CURRENT_VALUE = "@@SET_CURRENT_VALUE",
    UPDATE_OCR_DATA = "@@UPDATE_OCR_DATA",

    // ID - FR LIVENESS
    UPDATE_VIDEO_DATA = "@@UPDATE_VIDEO_DATA",

    // IMAGE - FR COMPARE
    SET_FACE_COMPARE_MATCH = "@@SET_FACE_COMPARE_MATCH"
}