<?php

session_start();

/* error_reporting(E_ALL);
  ini_set('display_errors', true); */

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";

$password = $_POST["password"];

$login = $_POST["login"];

//Finds the method parameter 
$method = "User.login";

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

    $return = array("result" => $return);

    echo json_encode($return);

    echo $_SESSION["username"];
} else {

    //Puts the PHP response in a format that the AJAX call can easily parse
    $return = array("result" => $return);

    echo json_encode($return);
}
?>
