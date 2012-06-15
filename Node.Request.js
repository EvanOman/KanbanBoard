

var request = require('request');
request({
    method: 'POST',
    url: 'http://software-pc/PhpProject4/test_file.php',
    json: true,
    headers: {'Content-type': 'application/json'},
    body: {
        user: "hello"
    }
},
function(error, response, data) {
    console.log(data);
});

