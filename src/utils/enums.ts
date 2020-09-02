export enum CurrentStage {
    SETUP = "Setup Stage",
    SEGMENTATION_CHECK = "Segmentation Check",
    SEGMENTATION_EDIT = "Segmentation Edit",
    LANDMARK_EDIT = "Landmark",
    OCR_DETAILS = "OCR Details",
    OCR_EDIT = "OCR Edit",
    FR_LIVENESS_CHECK = "Face Liveness",
    FR_COMPARE_CHECK = "Face Comparison",


    END_STAGE = "End Stage",
    INTER_STAGE = "Inter Stage"
}

export enum IDProcess {
    MYKAD_FRONT = "MyKadFront",
    MYKAD_BACK = "MyKadBack",
    PASSPORT = "Passport",
    OTHER = "Other"
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
    OCR = "OCR"
}

export enum DatabasesTemp {
    DB1 = "Database 1",
    DB2 = "Database 2"
}

export enum UsersTemp {
    Alice = "Alice",
    Bob = "Bob"
}