'use strict';
var fs = require('fs');
var git = require('nodegit');
const {exec} = require('child_process');
var sourceUrl = 'http://9.37.137.241:8000/FDTake-master.zip';
var targetUrl = "https://github.com/ylu36/push_example.git";
var isBare = 0; // lets create a .git subfolder
var repofolder;
var accountname = "ylu36";
var password = "Cozyrat0326";
function readDir(dir) {
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        console.log(file);
    }); 
}
function addByDir(dir) {
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if(file != '.git') {
            console.log(file);
            paths.push(file);
        }
    }); 
}
function downloadAndUnzipFile() {
    function unzip(zipName) {
        var cmd = `unzip ${zipName} -d ./`;
        console.log(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
              console.error(`exec error: ${err}`);
              return;
            }
            console.log(`unzipped file ${zipName} to ${repofolder}`);
            process_git();
        });
        exec(`rm -rf ${zipName} __MACOSX`);
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
            repofolder = zipName.replace(/\.[^/.]+$/, "");
            console.log(`downloaded zip file: ${zipName} to ${repofolder}`);
            // readDir('.');
            unzip(zipName);
        });
    }
    download(sourceUrl);
}

function process_git() {
    var repo, index, oid, remote, paths = [];
    let timestamp = Math.round(Date.now()/1000);
    var signature = git.Signature.create("ylu36", "ylu36@ncsu.edu", timestamp, 60);
    isBare = fs.existsSync(`${repofolder}/.git`) == false? 0:1;
    if(!isBare) console.log(`${repofolder} is not a git repository. Initializing a bare repo...`);
        var list = fs.readdirSync(repofolder);
        list.forEach(function(file) {
            if(file != '.git') {
                paths.push(file);
            }
        }); 
        
    git.Repository.init(repofolder, isBare)
    .then((repoResult) => repo = repoResult)
    .then(() => repo.refreshIndex())
    .then((indexResult) => (index = indexResult))
    .then(() => index.addAll(paths))
    .then(() => index.write())
    .then(() => index.writeTree())
    // .then(function(oidResult) {
    //     oid = oidResult;
    //     return git.Reference.nameToId(repo, "HEAD");
    // })
    //.then((head) => repo.getCommit(head))
    .then(function(oid) {
        return repo.createCommit("HEAD", signature, signature, "initial commit", oid, []);
    })
    .then(function(commitId) {
    console.log("New Commit: ", commitId);
    })
      // Add a new remote
    .then(function() {
        return git.Remote.create(repo, "origin", targetUrl)
        .then(function(remoteResult) {
        remote = remoteResult;
    
        // Create the push object for this remote
        return remote.push(
            ["refs/heads/master:refs/heads/master"],
            {
                callbacks: {
                    credentials: () => git.Cred.userpassPlaintextNew(accountname, password)
                }
            }
        );
        });
    })
    .done(function() {
        console.log("Done!");
    }); 
}

downloadAndUnzipFile();