'use strict';
var fs = require('fs');
var git = require('nodegit');
const {exec} = require('child_process');
var express = require('express');
var router = express.Router();
function createRepo(repofolder, signature, targetUrl, target_token) {
    var repo, index, remote, paths = [];
    console.log(`${repofolder} is not a git repository. Initializing a bare repo...`);
    var list = fs.readdirSync(repofolder);
    list.forEach(function(file) {
        if(file != '.git') {
            paths.push(file);
        }
    }); 
    git.Repository.init(repofolder, 0)
    .then((repoResult) => repo = repoResult)
    .then(() => repo.refreshIndex())
    .then((indexResult) => (index = indexResult))
    .then(() => index.addAll(paths))
    .then(() => index.write())
    .then(() => index.writeTree())
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
        console.log(`remote set to ${targetUrl}`);
        return remote.push(
            ["refs/heads/master:refs/heads/master"],
            {
                callbacks: {
                    credentials: () => git.Cred.userpassPlaintextNew(target_token, "x-oauth-basic")
                }
            }
        );
        });
    })
    .done(function() {
        console.log("Done!");
    }); 
}

function createRepoFromGit(repofolder, targetUrl, target_token) {
    var repo, remote;
    console.log(`${repofolder} is a git repository. Staging the repo...`);
    
    git.Repository.open(repofolder)
    .then((repoResult) => repo = repoResult)
    // Add a new remote
    .then(function() {
        git.Remote.setUrl(repo, "origin", targetUrl);
        console.log(`remote set to ${targetUrl}`);
        return git.Remote.lookup(repo, "origin")
        .then(function(remoteResult) {
        remote = remoteResult;
        return remote.push(
            ["refs/heads/master:refs/heads/master"],
            {
                callbacks: {
                    credentials: () => git.Cred.userpassPlaintextNew(target_token, "x-oauth-basic")
                }
            }
        );
        });
    })
    .done(function() {
        console.log("Done!");
    }); 
}

function downloadAndUnzipFile(sourceUrl, targetUrl, target_token) {
    var repofolder;

    function unzip(zipName) {
        var cmd = `unzip ${zipName} -d ./`;
        console.log(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
              console.error(`exec error: ${err}`);
              return;
            }
            console.log(`unzipped file ${zipName} to ${repofolder}`);
            process_git(repofolder, targetUrl, target_token);
        });
        exec(`rm -rf ${zipName} __MACOSX`);
    }
    function download(sourceUrl) {
        var zipName;
        var cmd = `wget ${sourceUrl} && find . -iname \*.zip`;
        exec(cmd, (err, stdout, stderr) => {
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

function process_git(repofolder, targetUrl, target_token) {
    var isBare = 0; // 0 if no .git presence
    var timestamp = Math.round(Date.now()/1000);
    var signature = git.Signature.create("ylu36", "ylu36@ncsu.edu", timestamp, 60);
    isBare = fs.existsSync(`${repofolder}/.git`);
    if(!isBare) {
        createRepo(repofolder, signature, targetUrl, target_token);
    }
    else {
        createRepoFromGit(repofolder, targetUrl, target_token);
    }

}
// var body = {
//     source: params.repoUrlWithAuth || params.sourceRepoUrl,
//     target: targetUrl,
//     target_token: git.selected.token,
//     cloneType: params.cloneType,
//     git_type: git.selected.type
// };
function init(params) {
    
    var source = params.source;
    var target = params.target;
    var target_token = params.target_token;
    var sourceUrl = 'http://9.37.137.241:8000/FDTake-master.zip';
    var targetUrl = `https://github.com/ylu36/push_example.git`;
    var cloneType = params.cloneType;
    var git_type = params.git_type;
    // console.log(source)
    //if(cloneType == 'zip')
    downloadAndUnzipFile(sourceUrl, targetUrl, target_token);
}

router.post("/clone", function(req, res) {
    console.log(req.body);
    res.send("again in the clone route");
    init(req.body);
});

router.get("/status", function(req, res) {
    res.send({
        "message": "Connected to local helper",
        "status": "PASS",
        "details": "The GitHub helper app is running"
    });
});
module.exports = router;