export enum CurrentStage {
    SETUP = "Setup Stage",
    SEGMENTATION_CHECK = "Segmentation Check",
    SEGMENTATION_EDIT = "Segmentation Edit",
    LANDMARK_EDIT = "Landmark",
    OCR_DETAILS = "OCR Details",
    OCR_EDIT = "OCR Edit",
    FR_LIVENESS_CHECK = "Face Liveness",
    FR_COMPARE_CHECK = "Face Comparison",

    // Functional Only
    END_STAGE = "End Stage",
    INTER_STAGE = "Inter Stage",
    OUTPUT = "Output"
}

export enum IDProcess {
    SINGLE = "",
    DOUBLE_FRONT = "Front",
    DOUBLE_BACK = "Back"
}

export enum Rotation {
    ROT0 = 0,
    ROT90 = 90,
    ROT180 = 180,
    ROT270 = 270
}

export enum ProcessType {
    WHOLE = "Whole",
    SEGMENTATION = "Segmentation",
    LANDMARK = "Landmark",
    OCR = "OCR",
    LIVENESS = "Liveness",
    FACE = "Face", // only do liveness and face comparison
}

export enum AnnotationStatus {
    COMPLETE = "Complete",
    INCOMPLETE = "Incomplete",
    NOT_APPLICABLE = "Not Applicable"
}

export enum UsersTemp {
    Alice = "Alice",
    Bob = "Bob"
}