<?php

session_start();

session_write_close();

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object with the passed in method
$bugzilla = new BugzillaXML("Bug.search");

$product = filter_input(INPUT_POST, "product", FILTER_SANITIZE_STRING);
$bugzilla->addMember("product", $product, "string");

$date = date("c", (time() - 40));

$bugzilla->addMember("last_change_time", $date, "none");


//Then submit
echo $bugzilla->submit();
?>