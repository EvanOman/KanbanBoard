<?php

//$source = "local";

if ($source == "local") {
    define(BUGZILLA_URL, "http://software-pc/Bugzilla4.2/jsonrpc.cgi");
    define(userName, "evan.oman@blc.edu");
    define(password, "password");
} else {
    define(BUGZILLA_URL, "http://landfill.bugzilla.org/bugzilla-4.2-branch/jsonrpc.cgi");
    define(userName, "drecksk@gmail.com");
    define(password, "kanban");
}
?>
