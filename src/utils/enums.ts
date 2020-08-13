export enum CurrentStage {
    SETUP = "Setup Stage",
    SEGMENTATION_CHECK = "Segmentation Check",
    SEGMENTATION_EDIT = "Segmentation Edit",
    LANDMARK_EDIT = "Landmark",
    OCR_EDIT = "OCR",
    FR_LIVENESS_CHECK = "Face Liveness",
    FR_COMPARE_CHECK = "Face Comparison"
}

export enum IDProcess {
    MYKAD_FRONT,
    MYKAD_BACK,
    PASSPORT,
    OTHER
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