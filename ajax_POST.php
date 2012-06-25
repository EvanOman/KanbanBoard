<?php

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";

//Copies the posted array of fields
$paramArr = $_POST;

//Finds the method parameter 
$method = $paramArr['method'];

//Here we instantiate a new BugzillaXML object
$bugzilla = new BugzillaXML($method);

//Now we destroy the method part of the array because there is no Bugzilla method field in the parameters section:
unset($paramArr['method']);

//This is now done dynamically so as to remove the need for repetition
foreach ($paramArr as $k => $v) {
    if ($k == 'bugid') {
        $type = 'int';
    } else {
        $type = 'string';
    }
    //Now we add the parameters and specify their type, note that this setup requires the exact bugzilla field name
    $bugzilla->addMember($k, $v, $type);
}

//Then submit
echo $bugzilla->submit();
?>
