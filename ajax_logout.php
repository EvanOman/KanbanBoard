<?php

session_start();

/* error_reporting(E_ALL);
  ini_set('display_errors', true); */

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";

//Resets all session variables(which is what we want because those are the variable that keep loggin the user in)
session_unset();

//var_dump($_SESSION["login"]);
//var_dump($_SESSION["password"]);

if ($_SESSION["login"] == null && $_SESSION["password"] == null) {
    //Returns a success statement
    die(json_encode(array("success" => true)));
} else {
    die(json_encode(array("success" => false)));
}
?>
