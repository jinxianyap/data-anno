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
![Overview Diagram](https://drive.google.com/uc?export=view&id=1ozcn9QxYjyhQkRcxsjKObbYPBBwFU5GL)

This diagram illustrates the main views of the project which are displayed to users. ControlPanel acts as the main control to move between stages. The Main View is painted according to the current stage.

## Configuration
### Crop & Landmark API Endpoint
Edit the HOST and PORT in ./config.ts. For cropping, append '/transform'. For Landmark, append '/landmark'.
### Annotation & Output Formatting
Add or modify entries in ./options.json. The json file is split into 4 top-level keys: `documentType`, `landmark`, `ocr` and `flags`. Ensure that you update all relevant information (i.e. keys, codeNames, displayNames, outputNames) in the appropriate section.  `documentType` is split into 2 separate keys, `single` and `double` to represent IDs with only 1 side and IDs with 2 sides. As of now, `codeNames` match with the identifiers found in the database CSV, `displayValues` broadly match with those defined in the eKYC API documentation, while `outputNames` match with the user's desired output format. In addition, landmarks are split into `compulsory` and `optional` groups.

## Backend
The databases and session folders from eKYC are served using ./server.js, which is a simple NodeJS backend called by the frontend interface to retrieve databases, session data and save annotation output. Should the database structure, the format of the eKYC logs or the supported document types change in the future, you should start by modifying this file, specifically the helper functions (i.e. `allocateFiles`, `getCSVData`, `mergeJSONData`). 

On the frontend, ./utils/src/DatabaseUtil.ts is the main handler for parsing JSON data received from the server and preparing internal state to be posted to the server. To extend this class, you may create custom functions modelled on the existing functions, which cater to MyKad sessions only.

### Loading from Database
When loading data for a specific session, all images in the folder are returned from the backend in base64 format. As of now, this section only handles MyKad documents. To modify, simply add a new handler and check for the document type on the server side. If there are no previous output JSON files for this session, data from the date's CSV file is extracted and returned in the response. If the corresponding JSON file is available, the CSV data is updated with the JSON data before being returned.

### Representation of Coordinates
The front end interface saves the x- and y-coordinates of all 4 points of a bounding box in a position field. The coordinates are both measured starting from 0 at the lower left corner.
```bash
position: {
    x1: 0,
    x2: 8,
    x3: 8,
    x4: 0,
    y1: 5,
    y2: 5,
    y3: 1,
    y4: 1
}
```
On the server side, coordinates are stored in the form of `[displacement_from_left, displacement_from_top, width, height]`. When saving annotation output, the conversion of coordinates from the position object to the list format is done on the server side. When loading session data and pulling from previously-generated JSON files, the conversion of coordinates from the list format to the position object is done on the frontend in `DatabaseUtil.loadGivenData`.

## Redux Store
![Redux Store Diagram](https://drive.google.com/uc?export=view&id=1Lyu-bXF6oFuNZUbzNMOUeTolZyxIt_ya)

## State Representation
The Redux store keeps track of the  current stage of the app and the chosen process type, among many other state variables and flags. The available process types are described by the ProcessType enum, while the process stages are described by the CurrentStage enum:
```bash
// ./src/utils/enums.ts

export enum ProcessType {
	WHOLE = "Whole",
	SEGMENTATION = "Segmentation",
	LANDMARK = "Landmark",
	OCR = "OCR",
	LIVENESS = "Liveness",
	FACE = "Face" // carry out liveness and face comparison checks only
}

export enum IDProcess {
	SINGLE = "",
	DOUBLE_FRONT = "Front",
	DOUBLE_BACK = "Back"
}

export enum CurrentStage {
    SETUP = "Setup Stage",
    SEGMENTATION_CHECK = "Segmentation Check",
    SEGMENTATION_EDIT = "Segmentation Edit",
    LANDMARK_EDIT = "Landmark",
    OCR_DETAILS = "OCR Details",
    OCR_EDIT = "OCR Edit",
    FR_LIVENESS_CHECK = "Face Liveness",
    FR_COMPARE_CHECK = "Face Comparison",
    OUTPUT = "Output"

    // Functional Only
    END_STAGE = "End Stage",
    INTER_STAGE = "Inter Stage",
}
```
## Manipulating App State
### Control Panel
The ControlPanel is a functional component, and it keeps track of the app state throughout the whole process. It is important to load data from the Redux store and dispatch changes appropriately through the ControlPanel. Here are some key changes in state requiring special care and specific dispatch actions:

- **Loading IDs**
The current ID is loaded from the IDLibrary, pointed to by the `index` field in the GeneralState, into the IDState. According to the `originalIDProcessed` and `backIDProcessed` flags in the IDState, the originalID or backID is loaded into the ImageState for Segmentation Check.

- **Sorting IDs**
At first load and when an updated annotation state is received for an ID, ControlPanel sorts the IDLibrary according to its `AnnotationStatus`. Incomplete sessions are displayed first, followed by complete sessions and sessions that are not applicable. The sorted list and the current pointer for that list is passed on to SessionDropdown.

- **Segmentation Check Stage**
After identifying one or more IDs present in the original image, an InternalIDState object is created for each. This is stored in the `internalIDs` field of the IDState. All subsequent annotation stages will modify the InternalIDState object directly, and not the ImageStates stored in the top level of the IDState. For Back IDs, completion of this stage will only update the backID ImageState within the current InternalIDState instead of creating a new InternalIDState.

- **Loading ImageState**
The ImageState is the main state to keep track of landmark and OCR labelling and face comparison data. Most actions after the Segmentation Check directly modify the current ImageState. Hence, it is important to call the `loadImageState` dispatch action to load the desired ImageState in several occasions (eg: switching to Back ID, moving to next InternalIDState, moving to next IDState)

- **Referring to Landmark and OCR Items**
When retrieving the correct landmark set and OCR set from options.json, use a combination of the internal ID `documentType` and the `processStage`. Eg: 
```bash
documentType = mykad;
processStage = IDProcess.DOUBLE_FRONT; #(='Front')
key = documentType + processStage;  #(='mykadFront')
```

- **Completion of InternalIDState Annotation**
At the end of the process, the current ImageState must first be saved to the current InternalIDState using `saveToInternalID`. This dispatch action will also update the flags in the InternalIDState, including the processStage and internalIndex of the current IDState. If this ID has a backID, then the backID ImageState has to be loaded. 
After ControlPanel receives the new props, it checks if there are any more internal IDs to be processed. If so, the appropriate ImageState is loaded. If not, the next ID is loaded from the IDLibrary.

- **Retrieving the Next ID**
The state of the ControlPanel must be reset with its own function `resetState`. The current IDState must also be saved back to the IDLibrary with the `saveToLibrary` dispatch action. After that, the IDState and ImageState are restored to initial values in preparation for the next ID to be loaded with `restoreID` and `restoreImage`. The sorted index must also be set as appropriate. If the session output is saved, then the sorted list may or may not be recomputed.

- **Inter Stage and End Stage**
Inter Stage handles the necessary dispatch actions, updates to the state and navigation for all process types but the full process. End Stage handles the same actions at the final stage of annotation for an InternalID or Back ID, typically after `OCR_EDIT` and `FR_COMPARE_CHECK`. This ensures that users must finish labelling the Front ID and the Back ID before moving on to `FR_LIVENESS_CHECK` and `FR_COMPARE_MATCH`.

### FacePanel
FacePanel is similar to ControlPanel in that it controls the app state, but it is only used for `ProcessType.FACE`. This is because this process type differs greatly from the rest in terms of the user flow, hence it is more convenient to abstract the logic for this process type into a separate component. FacePanel automatically loads the next ID with valid selfie videos/images for the liveness and face comparison stages. If not, FacePanel will skip ahead until it finds the next ID that fulfils these conditions.

### Session Dropdown
SessionDropdown displays the annotation status of each session, and also allows for easy navigation between sessions. All session navigation actions are handled by handleGetSession, which is passed into the component as a prop from ControlPanel, its parent component.

## Saving Annotation Output
After all IDs have been processed, users are redirected to `Output`, which will call the `returnOutput` API upon mounting. When saving the annotation output, the entire IDLibrary is posted in the API call, but not before calling `DatabaseUtil.extractOutput` on each individual IDState to convert it into a compatible format. This function will also translate the display names of landmarks and OCR items used in the application into names compatible with the desired output format as detailed in ./options.json.
On the server side, the response body is parsed and merged with the existing JSON file if present. Merging will never erase original content in the event that the updated data is incomplete, but will only save those fields that are not empty into its corresponding location in the output JSON file. The status of the POST request is then displayed in a table.

## Evaluating Annotation State
When the list of sessions in a database in a certain period is retrieved from the backend, the corresponding annotation state and phases to be checked are returned with each session ID. `PhasesChecked` denotes which sections should be annotated based on the files present in the session. `AnnotationState` describes sections that have been annotated, and is generated by checking the contents of the session's output json file if available. If a section does not have to be annotated, the annotation state for that section is true by default.

## References
- [LeafletJS](https://leafletjs.com/reference-1.7.1.html): used by `SegLabeller`, `LandmarkLabeller`
- [eKYC](https://ekyc-demo-api.wiseai.tech/ekyc/complete/reference)

