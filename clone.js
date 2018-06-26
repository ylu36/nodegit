'use strict';
var fs = require('fs');
var git = require('nodegit');
const {exec} = require('child_process');
var express = require('express'),
    router = express.Router();
function createRepo(repofolder, accountname, password, signature, targetUrl) {
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

function createRepoFromGit(repofolder, accountname, password, targetUrl) {
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

function downloadAndUnzipFile(sourceUrl, targetUrl) {
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
            process_git(repofolder, targetUrl);
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

function process_git(repofolder, targetUrl) {
    var isBare = 0; // 0 if no .git presence
    var accountname = "ylu36";
    var password = "Cozyrat0326";
    var timestamp = Math.round(Date.now()/1000);
    var signature = git.Signature.create("ylu36", "ylu36@ncsu.edu", timestamp, 60);
    isBare = fs.existsSync(`${repofolder}/.git`);
    if(!isBare) {
        createRepo(repofolder, accountname, password, signature, targetUrl);
    }
    else {
        createRepoFromGit(repofolder, accountname, password, targetUrl);
    }

}

function init() {
    var sourceUrl = 'http://9.37.137.241:8000/FDTake-master.zip';
    var targetUrl = "https://github.com/ylu36/push_example.git";
    downloadAndUnzipFile(sourceUrl, targetUrl);
}

router.get("/", function(req, res) {
    res.send("in the clone route");
    init();
});

module.exports = router;