<?php
/*
Copyright(c) 2012, Eckhardt Optics
Authors: Evan Oman, John Eckhardt

This is part of Bugzilla Kanban Board.

Bugzilla Kanban Board is free software: you can
redistribute it and/or modify it under the terms of the GNU
General Public License (GNU GPL) as published by the Free Software
Foundation, either version 3 of the License, or (at your option)
any later version.  The code is distributed WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.
 */

session_start();

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";

$password = $_POST["password"];

$login = $_POST["login"];

$product = $_POST["product"];

//Sets the method parameter 
$method = "User.login";

//If we have been sent a user name and password we know that we want to send it to bugzilla
if ($password != null && $login != null) {
//Here we instantiate a new BugzillaXML object with the passed in method
    $bugzilla = new BugzillaXML($method);

//Now the members are added 
    $bugzilla->addMember("login", $login, "none");

    $bugzilla->addMember("password", $password, "none");


//Then submit
    $return = $bugzilla->submit(true);

//Check if session login successful
    if ($return["faultString"] == null && $return["id"] != null) {

        //Set the user name(from above)
        $_SESSION["login"] = $login;

        //Set the password(from above)
        $_SESSION["password"] = $password;

        //Set the userID to be used for admin purposes
        $_SESSION["userID"] = $return["id"];

        //Set the product to be used for board loading purposes
        $_SESSION["product"] = $product;

        $return = array("result" => $return);
        
        function get_emails() {
            $data = file_get_contents("emails.php");
            $start = strpos($data, "/*")+2;
            $d = json_decode(substr($data, $start, strrpos($data, "*/") - $start), true);
            if ($d === false) {
                return array();
            } else {
                return $d;
            }
        }
        $emails = get_emails();
        $emails[$_SESSION["userID"]] = $login;
        
        $email_file = array();
        $email_file[] = "<?php /*";
        $email_file[] = json_encode($emails);
        $email_file[] = "*/ ?>";

        file_put_contents("emails.php", implode("\n", $email_file), LOCK_EX);


        echo json_encode($return);
    } else {

        //Puts the PHP response in a format that the AJAX call can easily parse
        $return = array("result" => $return);

        echo json_encode($return);
    }
}
//Otherwise we just want to reset the product
else {
    //Set the product to be used for board loading purposes
    $_SESSION["product"] = $product;

    $return = array("result" => array("success" => true));

    echo json_encode($return);
}
?>