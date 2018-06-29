'use strict';
var fs = require('fs');
var git = require('nodegit');
const {exec} = require('child_process');
var express = require('express');
var router = express.Router();
function createRepo(repofolder, signature, targetUrl, target_token, git_type) {
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
                credentials:() => (git_type.toLowerCase() == 'bitbucket') ?
                                            git.Cred.userpassPlaintextNew("x-token-auth", target_token):
                                        (git_type.toLowerCase() == 'gitlab') ?
                                            git.Cred.userpassPlaintextNew("oauth2", target_token): git.Cred.userpassPlaintextNew(target_token, "x-oauth-basic")          
            }
        });
    })
    .done(function() {
        console.log("Done!");
        exec(`rm -rf ${repofolder} __MACOSX`);
    }); 
});
}

function createRepoFromGit(repofolder, targetUrl, target_token, git_type) {
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
                credentials:() => (git_type.toLowerCase() == 'bitbucket') ?
                                            git.Cred.userpassPlaintextNew("x-token-auth", target_token):
                                        (git_type.toLowerCase() == 'gitlab') ?
                                            git.Cred.userpassPlaintextNew("oauth2", target_token): git.Cred.userpassPlaintextNew(target_token, "x-oauth-basic")             
            }
        });
    })
    .done(function() {
        console.log("Done!");
        exec(`rm -rf ${repofolder} __MACOSX`);
    }); 
    
});
}

function downloadAndUnzipFile(sourceUrl, targetUrl, target_token, git_type) {
    var repofolder, zipName;

    function unzip(zipName) {
        var cmd = `unzip ${zipName} -d ./`;
        console.log(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
              console.error(`exec error: ${err}`);
              return;
            }
            console.log(`unzipped file ${zipName} to ${repofolder}`);
            process_git(repofolder, targetUrl, target_token, git_type);
            }
        );
        exec(`rm ${zipName}`);
    }
    function download(sourceUrl) {
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

function process_git(repofolder, targetUrl, target_token, git_type) {
    function cleanCallback() {
        exec(`rm -rf __MACOSX ${repofolder}`);
        console.log("cleaning done")
    }
    var isBare = 0; // 0 if no .git presence
    var timestamp = Math.round(Date.now()/1000);
    // TODO: reference "var accountName = gitUtils.getAccountName(params.sourceRepoUrl, git.selected.type)"
    var accountName = "Yuanchen.Lu@ibm.com";
    var signature = git.Signature.create(accountName, accountName, timestamp, 60);
    isBare = fs.existsSync(`${repofolder}/.git`);
    if(!isBare) {
        createRepo(repofolder, signature, targetUrl, target_token, git_type);
    }
    else {
        createRepoFromGit(repofolder, targetUrl, target_token, git_type);
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
    var sourceUrl = 'https://github-media-downloads.s3.amazonaws.com/GitHub-Logos.zip';
    var targetUrl = `https://github.ibm.com/Yuanchen-Lu/push.git`;
    var cloneType = params.cloneType;
    var git_type = params.git_type;
    git_type = "github"
     console.log(source + '\t' + target)
    //if(cloneType == 'zip')
    downloadAndUnzipFile(sourceUrl, targetUrl, target_token, git_type);
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