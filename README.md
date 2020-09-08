A tool for carrying out segmentation review and annotation work on user data collected from e-KYC sessions.

## Guide to Setting Up Locally
```bash
# clone repository
git clone https://github.com/jinxianyap/data-anno.git

cd data-anno

# install dependencies
npm install

# serve React project with hot reload at localhost:3000 and NodeJS server at localhost:5000
npm run dev
```
## System Overview
![Overview Diagram](https://drive.google.com/uc?export=view&id=1wz88ml6FLm8UfYZxshD1IuMAJyqD4G1i)

This diagram illustrates the main views of the project which are displayed to users. ControlPanel acts as the main control to move between stages. The Main View is painted according to the current stage.

## Redux Store
![Redux Store Diagram](https://drive.google.com/uc?export=view&id=1Jct_dHj2NQ-9WXtoFTZCATdEGhzt_f6V)

## Configuration
### Crop API Endpoint
Edit the HOST and PORT in ./config.ts
### Annotation Format
Add or modify entries in ./options.json. The json file is split into 4 top-level keys: `documentType`, `landmark`, `ocr` and `flags`. Ensure that you update all relevant information (i.e. keys, codeNames, displayValues) in the appropriate section.

## Backend Data Manipulation
The databases and session folders from eKYC are served using ./server.js, which is a simple NodeJS backend called by the frontend interface to retrieve databases, session data and post annotation output. Should the database structure, the format of the eKYC logs or the supported document types change in the future, you would want to start by modifying this file, specifically the helper functions (i.e. `allocateFiles`, `getCSVData`, `mergeJSONData`). 

On the frontend, ./utils/src/DatabaseUtil.ts is the main handler for parsing JSON data received from the server and preparing internal state to be posted to the server. To extend this class, you may create custom functions modelled on the existing functions, which cater to MyKad sessions only.

## Control Panel
The ControlPanel is a functional component, and it keeps track of the app state throughout the whole process. The process stages are represented by the CurrentStage enum: 
```bash
// ./src/utils/enums.ts

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
```
It is important to load data from the Redux store and dispatch changes appropriately through the ControlPanel. Here are some key changes in state requiring specific dispatch actions:

### Moving from one Stage to another
