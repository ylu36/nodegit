'use strict';
var fs = require('fs');
var git = require('nodegit');
var path = require('path');
const {exec} = require('child_process');
var express = require('Express');
var router = express.Router();
//Configuration for logging
var log4js = require('log4js');
log4js.configure({
  appenders: { 'file': { type: 'file', filename: 'logs/clone-helper.log' } },
  categories: { default: { appenders: ['file'], level: 'debug' } }
});

var logger = log4js.getLogger('clone-helper');

function createRepo(repofolder, signature, targetUrl, target_token, git_type) {
    var repo, index, remote, paths = [];
    logger.info(`${repofolder} is not a git repository. Initializing a bare repo...`);
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
    .then((oid) => repo.createCommit("HEAD", signature, signature, "initial commit", oid, []))
    .then((commitId) => logger.info("New Commit: ", commitId))
    // Add a new remote
    .then(() => git.Remote.create(repo, "origin", targetUrl))
    .then(function(remoteResult) {
        remote = remoteResult;
        logger.info(`remote set to ${targetUrl}`);
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
    .catch(function(err) {
        logger.error(err);
        return;
    })
    .done(() => logger.info("Done!"))
}

function createRepoFromGit(repofolder, targetUrl, target_token, git_type) {
    var repo, remote;
    logger.info(`${repofolder} is a git repository. Staging the repo...`);
    
    git.Repository.open(repofolder)
    .then((repoResult) => repo = repoResult)
    // Add a new remote
    .then(function() {
        git.Remote.setUrl(repo, "origin", targetUrl);
        logger.info(`remote set to ${targetUrl}`);
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
    .catch(function(err) {
        logger.err(err);
        return;
      })
    .then(function() {
        exec(`rm -rf tmp`);
        logger.info("Done!");
    })
});
}

function downloadAndUnzipFile(sourceUrl, targetUrl, target_token, git_type) {
    var repofolder, zipName;

    function unzip(zipName) {
        var cmd = `unzip ${zipName} -d ./`;
        logger.info(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
              logger.error(`exec error: ${err}`);
              exec(`rm ${zipName}`);
              return;
            }
            logger.info(`unzipped file ${zipName} to ${repofolder}`);
            process_git(repofolder, targetUrl, target_token, git_type);
            }
        );
        exec(`rm ${zipName}`);
    }
    function download(sourceUrl) {
        var cmd = `wget ${sourceUrl} && find . -iname \*.zip`;
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
              logger.error(`exec error: ${err}`);
              exec(`rm -rf ${zipName} ${repofolder}`);
              return;
            }
            zipName = stdout.trim();
            repofolder = zipName.replace(/\.[^/.]+$/, "");
            logger.info(`downloaded zip file: ${zipName} to ${repofolder}`);
            // readDir('.');
            unzip(zipName);
        });
    }
    download(sourceUrl);
}

function process_git(repofolder, targetUrl, target_token, git_type) {
    var isBare = 0; // 0 if no .git presence
    var timestamp = Math.round(Date.now()/1000);
    var accountName = "IBM Cloud";
    var signature = git.Signature.create(accountName, accountName, timestamp, 60);
    isBare = fs.existsSync(`${repofolder}/.git`);
    if(!isBare) {
        createRepo(repofolder, signature, targetUrl, target_token, git_type);
    }
    else {
        createRepoFromGit(repofolder, targetUrl, target_token, git_type);
    }
    
}

function cloneRepo(sourceUrl, targetUrl, target_token, git_type) {
    var localPath = path.join(__dirname, "tmp");
    var cloneOptions = {};
    cloneOptions.fetchOpts = {
        callbacks: {
          certificateCheck:() => { return 1; },
          credentials:() => {
               return (git_type.toLowerCase() == 'bitbucket') ?
                    git.Cred.userpassPlaintextNew("x-token-auth", target_token):
                    (git_type.toLowerCase() == 'gitlab') ?
                    git.Cred.userpassPlaintextNew("oauth2", target_token): 
                   git.Cred.userpassPlaintextNew(target_token, "x-oauth-basic");   
                }
        }
    };
   
    git.Clone(sourceUrl, localPath, cloneOptions)
    .then(() => {
        process_git(localPath, targetUrl, target_token, git_type);
    })
    .catch((err) => {
        logger.info(err);
    });
}
//PARAMETER THAT NEEDS TO PASS IN FROM BROKER:
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
    var sourceUrl = `https://github.ibm.com/soaresss/sec-scan.git`;
    var targetUrl = `https://github.ibm.com/Yuanchen-Lu/push1.git`;
    var cloneType = params.cloneType;
    var git_type = params.git_type;
    if(cloneType == 'zip')
        downloadAndUnzipFile(sourceUrl, targetUrl, target_token, git_type);
    else 
        cloneRepo(sourceUrl, targetUrl, target_token, git_type);
}

router.post("/clone", function(req, res) {
    res.send("In the clone helper route...");
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