
//http://software-pc/PhpProject4/test_file.php  http://landfill.bugzilla.org/bugzilla-4.2-branch/jsonrpc.cgi
var request = require('request');
request('http://software-pc/PhpProject4/test_file.php',{
    method: 'POST', 
    json: {
        method: "Bugzilla.time"
    }
},
function(error, response, data) {
    console.log(data);
});

