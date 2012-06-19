<?php
$source = 8;

if ($source == 0) {
    define(BUGZILLA_URL, "http://software-pc/Bugzilla4.2/jsonrpc.cgi");
    define(userName, "evan.oman@blc.edu");
    define(password, "password");
} 
else if ($source == 1) {
    define(BUGZILLA_URL, "http://8ghmwezk1qbf.demo.bugzilla.org/jsonrpc.cgi");
    define(userName, "evan@eckop.com");
    define(password, "password");
}
else if ($source == 2) {
    define(BUGZILLA_URL, "http://software-pc/PhpProject4/test_file.php");
    define(userName, "evan@eckop.com");
    define(password, "password");
}
else  {
    define(BUGZILLA_URL, "http://landfill.bugzilla.org/bugzilla-4.2-branch/jsonrpc.cgi");
    define(userName, "dr.ecksk@gmail.com");
    define(password, "kanban");
}
?>
