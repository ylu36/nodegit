### To Install:
- brew install libgcrypt (necessary for installing `nodegit`)
- npm install 

### Node and NPM version
- node@6.11.3 
- npm@5.6.0 
- (note: later versions don't work for `nodegit`; haven't tested earlier versions)

### current stage:
* (Prereq: need to create empty GitHub repo first) 
* can clone a remote zip (NO `.git` presence) to GitHub repo 
* can clone a remote zip with `.git` to GitHub repo
* `main.js` starts a local server at port 3000. Calling API endpoint `localhost:3000/clone` invokes the clone functionality
