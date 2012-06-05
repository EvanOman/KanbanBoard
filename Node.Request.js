

var request = require('request');
request({
    url:'http://landfill.bugzilla.org/bugzilla-4.2-branch/jsonrpc.cgi', 
    method: 'POST', 
    followAllRedirects: true, 
    json:{ 
        "Bugzilla_login": "dr.ecksk@gmail.com",
        "Bugzilla_password": "kanban",
        "method": "Bug.get",
        "ids": [4111],
        "params": [ {
            "ids": [4111], 
            "names": ["user@domain.com"]
        } ]
    }
}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body) // Print the google web page.
    }
    else 
    {
        console.log(response.statusCode);
    }

})