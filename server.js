const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const testFolder = '../for_annotation_tool_dev/';
const csv = require('csvtojson');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const ccHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': 0
}

const fileType = {
    mykad_front_ori: '0',
    mykad_back_ori: '1',

    mykad_front_ocr: '2',
    mykad_back_ocr: '3',
    mykad_face: '4',

    face: '5',
    face_video: '6',
    face_video_still: '7'
}

Object.freeze(fileType);


function getDate(date) { 
    return new Date(parseInt(date.slice(0, 4)), parseInt(date.slice(4, 6)), parseInt(date.slice(6, 8)));
}

function withinDateRange(date, start, end) {
    return (getDate(date) >= getDate(start) && getDate(date) <= getDate(end));
}

function getFileType(filename) {
    let keys = filename.split('.')[0].split('_').slice(1);
    if (keys[0] === 'mykad') {
        switch (keys[1]) {
            case ('front'): {
                return keys[2] === 'ocr' ? fileType.mykad_front_ocr : fileType.mykad_front_ori;
            }
            case ('back'): {
                return keys[2] === 'ocr' ? fileType.mykad_back_ocr : fileType.mykad_back_ori;
            }
            case ('face'):
            default: {
                return fileType.mykad_face;
            }
        }
    } else {
        if (keys.length === 1) {
            return fileType.face;
        } else {
            if (keys[1] === 'video') {
                return fileType.face_video;
            } else if (!isNaN(keys[1])) {
                return fileType.face_video_still;
            }
        }
    }
}

function allocateFiles(sessionID, route, files) {
    var mykad_front_ori,
        mykad_back_ori,
        mykad_front_ocr,
        mykad_back_ocr,
        mykad_face,
        face,
        face_video;
    var face_video_stills = [];

    for (let i = 0; i < files.length; i++) {
        if (fs.lstatSync(route + files[i]).isDirectory()) {
            continue;
        }
        let file = fs.readFileSync(route + files[i]);
        if (file) {
            file = Buffer.alloc(file.byteLength, file, 'binary').toString('base64');
            let type = getFileType(files[i]);
            let imgPrefix = 'data:image/jpg;base64,';
            switch (type) {
                case (fileType.mykad_front_ori): mykad_front_ori = imgPrefix + file; break;
                case (fileType.mykad_back_ori): mykad_back_ori = imgPrefix + file; break;
                case (fileType.mykad_front_ocr): mykad_front_ocr = imgPrefix + file; break;
                case (fileType.mykad_back_ocr): mykad_back_ocr = imgPrefix + file; break;
                case (fileType.mykad_face): mykad_face = imgPrefix + file; break;
                case (fileType.face): face = imgPrefix + file; break;
                case (fileType.face_video): face_video = 'data:video/mp4;base64,' + file; break;
                case (fileType.face_video_still): face_video_stills.push(imgPrefix + file); break;
                default: break;
            }
        }
    }

    return {
        sessionID: sessionID,
        mykad_front_ori: mykad_front_ori,
        mykad_back_ori: mykad_back_ori,
        mykad_front_ocr: mykad_front_ocr,
        mykad_back_ocr: mykad_back_ocr,
        mykad_face: mykad_face,
        face: face,
        face_video: face_video,
        face_video_stills: face_video_stills
    }
}

function parseCSV(filepath, res, rej) {
    csv()
    .fromFile(filepath)
    .then((json)=>{
        res(json);
    })
    .catch((err) => {
        console.error(err);
        res(undefined);
    })
}

app.post('/loadSessionData', (req, res) => {
    let db = req.body.database;
    let date = req.body.date;
    let sessionID = req.body.sessionID;

    let route = testFolder + db + "/images/" + date + "/" + sessionID + "/";
    let files = fs.readdirSync(route);
    let session = allocateFiles(sessionID, route, files);
    res.status(200).send(session);
})

app.post('/loadDatabase', async (req, res) => {
    let db = req.body.database;
    let start = req.body.startDate;
    let end = req.body.endDate;

    let dateImgRoute = testFolder + db + '/images/';
    let dateDataRoute = testFolder + db + '/raw_data/';
    let dateImgs = fs.readdirSync(dateImgRoute);
    dateImgs = dateImgs.filter((each) => withinDateRange(each, start, end));

    let folders = [];

    for (let i = 0; i < dateImgs.length; i++) {
        let sessionRoute = dateImgRoute + dateImgs[i] + '/';
        let sessions = fs.readdirSync(sessionRoute);
        let sessionIDs = [];
        
        if (sessions) {
            for (let j = 0; j < sessions.length; j++) {
                let imageRoute = sessionRoute + sessions[j] + '/';
                // if (j === 0) {
                //     let files = fs.readdirSync(imageRoute);
                //     let session = allocateFiles(sessions[j], imageRoute, files);
                //     sessionIDs.push(session);
                // } else {
                    sessionIDs.push({
                        sessionID: sessions[j]
                    });
                // }
            }

            let csvPath = dateDataRoute + dateImgs[i].slice(0, 4) + '-' + dateImgs[i].slice(4, 6) + '-' + dateImgs[i].slice(6, 8) + '.csv';
            let folder = {
                date: dateImgs[i],
                sessions: sessionIDs,
                raw_data: undefined
            };
            await new Promise((res, rej) => parseCSV(csvPath, res))
                .then((val) => {folder.raw_data = val; folders.push(folder);})
                .catch((err) => {console.error(err); folders.push(folder);});
        } else {
            res.status(500).send();
            return;
        }
    }

    res.status(200).send(folders);
})

app.get('/getDatabases', (req, res) => {
    res.set(ccHeaders);
    let folders = fs.readdirSync(testFolder);
    if (folders && folders.length) {
        let results = folders.map((each) => {
            return new Promise((res, rej) => {
                try {
                    let dates = fs.readdirSync(testFolder + each + '/images');
                    res({
                        database: each,
                        dates: dates
                    });
                } catch(err) {
                    res({
                        database: each,
                        err: err
                    });
                }
            });
        });

        Promise.all(results).then((dbs) => res.status(200).send(dbs)).catch((err) => res.status(500).send(err));

    } else {
        res.status(500).err('No databases found');
    }
})

// if (process.env.NODE_ENV === 'production') {
//   // Serve any static files
//   app.use(express.static(path.join(__dirname, 'client/build')));
//   // Handle React routing, return all requests to React app
//   app.get('*', function(req, res) {
//     res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
//   });
// }

app.listen(port, () => console.log(`Listening on port ${port}`));