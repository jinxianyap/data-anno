const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const testFolder = './test_ids/';
const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/getDatabase', (req, res) => {
    const files = fs.readdirSync(testFolder);
    if (files && files.length) {
        res.send({ IDs: files});
    }
})

app.get('/getImage/:id', (req, res) => {
    let id = req.params.id;
    fs.readFile(testFolder + id + "/" + id + "_0.jpg", function (err, data) {
        if (err) throw err;
        res.set({'Content-Type': 'image/jpg'});
        let base64Image = new Buffer(data, 'binary').toString('base64');
        res.end(base64Image);
      });
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