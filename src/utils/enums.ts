export enum CurrentStage {
    SETUP,
    SEGMENTATION_CHECK,
    SEGMENTATION_EDIT,
    LANDMARK_EDIT,
    OCR_EDIT,
    FR_LIVENESS_CHECK,
    FR_COMPARE_CHECK
}

export enum ProcessType {
    WHOLE,
    SEGMENTATION,
    LANDMARK,
    OCR
}

export enum DatabasesTemp {
    DB1 = "Database 1",
    DB2 = "Database 2"
}

export enum UsersTemp {
    Alice = "Alice",
    Bob = "Bob"
}