<?php
 if ($_POST["method"]=="Bugzilla.time")
 {
     echo 'Got the data';
 }
 else{
     echo "Didnt work\n";
     var_dump($_POST);
 }
?>
