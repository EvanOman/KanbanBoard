<?php

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object
$bugzilla = new BugzillaXML('Product.get_accessible_products');

//Now we add the parameters and specify their type
//Takes no parameters

//Then submit
echo $bugzilla->submit();

?>
