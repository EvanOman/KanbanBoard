<?php
$source = 1;
 
if ($source == 0) {
    define("BUGZILLA_URL", "http://software-pc/Bugzilla4.2/xmlrpc.cgi");    
} 
else if ($source == 1) {
    define("BUGZILLA_URL", "https://atv4lk0k5zob.demo.bugzilla.org/xmlrpc.cgi");  
}
else  {
    define("BUGZILLA_URL", "https://landfill.bugzilla.org/bugzilla-4.2-branch/xmlrpc.cgi");
}
?>
