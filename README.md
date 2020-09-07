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
Add or modify entries in ./options.json. The json file is split into 4 top-level keys: `documentType` `landmark` `ocr` and `flags`. Ensure that you update all relevant information (i.e. keys, codeNames, displayValues) in the appropriate section.
