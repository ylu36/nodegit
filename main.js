var fs = require('fs');
var git = require('nodegit');
const {exec} = require('child_process');
var sourceUrl = 'http://9.37.137.241:8000/Archive.zip';
var path = 'tmp';

function readDir(dir) {
    list = fs.readdirSync(dir);
    list.forEach(function(file) {
        console.log(file);
    });
}
function downloadAndUnzipFile() {
    function unzip(zipName) {
        var cmd = `unzip ${zipName} -d ${path}`;
        //console.log(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
              console.error(`exec error: ${err}`);
              return;
            }
            console.log(`unzipped file ${zipName} to ${path}`);
        });
    }
    function download(sourceUrl) {
        var zipName;
        //exec('rm *.zip.*');
        exec(`wget ${sourceUrl} && (ls | grep *.zip)`, (err, stdout, stderr) => {
            if (err) {
              console.error(`exec error: ${err}`);
              return;
            }
            zipName = stdout.trim();
            console.log(`downloaded zip file: ${zipName}`);
            // readDir('.');
            unzip(zipName);
        });
    }
    download(sourceUrl);
}

downloadAndUnzipFile();