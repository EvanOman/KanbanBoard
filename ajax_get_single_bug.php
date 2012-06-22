<?php

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object
$bugzilla = new BugzillaXML('Bug.get');

//Now we add the parameters and specify their type
$bugzilla->addMember('ids', $_REQUEST['bugid'], 'int');

//Then submit
echo $bugzilla->submit();

?>
