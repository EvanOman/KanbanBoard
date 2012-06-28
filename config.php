<?php
$source = 0;
 
if ($source == 0) {
    define("BUGZILLA_URL", "http://software-pc/Bugzilla4.2/xmlrpc.cgi");
    define("userName", "evan.oman@blc.edu");
    define("password", "password");
} 
else if ($source == 1) {
    define("BUGZILLA_URL", "http://software-pc/PhpProject4/test_file.php");
    define("userName", "evan@eckop.com");
    define("password", "password");
}
else  {
    define("BUGZILLA_URL", "https://landfill.bugzilla.org/bugzilla-4.2-branch/xmlrpc.cgi");
    define("userName", "dr.ecksk@gmail.com");
    define("password", "kanban");
}
?>
