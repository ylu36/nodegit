'use strict';
var fs = require('fs');
var git = require('nodegit');
var path = require('path');
const {exec} = require('child_process');
var sourceUrl = 'http://9.37.137.241:8000/FDTake-master.zip';

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
function addByDir(index, dir) {
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if(file != '.git') {
            console.log(file);
            index.addByPath(file);
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
    var repo, index, oid, remote;
    isBare = fs.existsSync(`${repofolder}/.git`) == false? 0:1;
    console.log(isBare);
    git.Repository.init(repofolder, isBare)
    .then((repoResult) => repo = repoResult)
    .then(() => repo.refreshIndex())
    .then((indexResult) => (index = indexResult))
    // .then(function() {
    //     var list = fs.readdirSync(repofolder);
    //    // list.forEach(function(file) {
    //     // if(file != '__MACOSX' && file != '.git') {
    //     //     console.log(file);
    //         index.addByPath('');
    //   //  }
    // //}); 
    // }) // TODO: change here
    //.then((index) => index.addByPath(path.join('./', 'names.txt')))
    .then(() => index.write())
    .then(() => index.writeTree())
    // .then(function(oidResult) {
    //     oid = oidResult;
    //     return git.Reference.nameToId(repo, "HEAD");
    // })
    //.then((head) => repo.getCommit(head))
    .then(function(oid) {
        var author = git.Signature.create("ylu36",
          "schacon@gmail.com", 123456789, 60);
        var committer = git.Signature.create("ylu36",
          "scott@github.com", 987654321, 90);
      
        return repo.createCommit("HEAD", author, committer, "message", oid, []);
    })
    .then(function(commitId) {
    console.log("New Commit: ", commitId);
    })
      // Add a new remote
    .then(function() {
        return git.Remote.create(repo, "origin",
        "git@github.com:ylu36/push-example.git")
        .then(function(remoteResult) {
        remote = remoteResult;
    
        // Create the push object for this remote
        return remote.push(
            ["refs/heads/master:refs/heads/master"],
            {
                callbacks: {
                    credentials: (url, userName) => Cred.userpassPlaintextNew(userName, password)
                      .catch(ex => console.log(`Whoops ${username} won't work, falling back to 'git'`))
                      .then(() => Cred.userpassPlaintextNew('git', password))
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