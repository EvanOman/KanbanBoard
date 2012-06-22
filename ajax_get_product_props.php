<?php

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object
$bugzilla = new BugzillaXML('Product.get');

//Now we add the parameters and specify their type
$bugzilla->addMember('ids', $_REQUEST['ids'], 'int');

//Then submit
echo $bugzilla->submit();

?>
