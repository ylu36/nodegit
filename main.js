var express = require('Express');
var app = express();
var cookieParser   = require('cookie-parser');
var bodyParser = require('body-parser');

var clone = require('./clone.js');

var router = express.Router();
app.use(bodyParser.json())
   .use(cookieParser())
   app.use('/', clone);
app.listen(3000,function(){
    console.log("Started on PORT 3000");
})