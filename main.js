var express = require('Express');
var app = express();

var clone = require('./clone.js');

app.use('/clone', clone);

app.listen(3000);