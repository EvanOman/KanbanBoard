<?php

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object
$bugzilla = new BugzillaXML('Bug.fields');

//Now we add the parameters and specify their type
$bugzilla->addMember('names', $_REQUEST['name'], 'string');


//Then submit
echo $bugzilla->submit();

?>
