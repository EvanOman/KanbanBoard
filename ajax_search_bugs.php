<?php

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object
$bugzilla = new BugzillaXML('Bug.search');

//Now we add the parameters and specify their type
//$bugzilla->addMember('ids', $_REQUEST['bugid'], 'int');
$bugzilla->addMember('resolution', $_REQUEST['resolution'], 'string');
$bugzilla->addMember('priority', $_REQUEST['priority'], 'string');//
$bugzilla->addMember('product', $_REQUEST['product'], 'string');//
$bugzilla->addMember('severity', $_REQUEST['severity'], 'string');//
$bugzilla->addMember('summary', $_REQUEST['summary'], 'string');//
$bugzilla->addMember('version', $_REQUEST['version'], 'string');//
$bugzilla->addMember('status', $_REQUEST['status'], 'string');//


//Then submit
echo $bugzilla->submit();

?>
