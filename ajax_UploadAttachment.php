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

session_write_close();

if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";

//Copies the posted array of fields
$paramArr = $_POST;

//Here we instantiate a new BugzillaXML object with the passed in method
$bugzilla = new BugzillaXML("Bug.add_attachment");

//Now the members are added dynamically so as to remove repetition
foreach ($paramArr as $k => $v) {
    if ($k == 'ids' || $k == 'limit') {
        $type = 'int';
    } else if ($k == "description") {
        $type = "special";
    } else {
        $type = 'string';
    }
    //Now we add the parameters and specify their type, note that this setup requires the exact bugzilla field name
    $bugzilla->addMember($k, $v, $type);
}

$bugzilla->addMember("file_name", $_FILES["file_name"]['name'], "string");

$bugzilla->addMember("content_type", $_FILES["file_name"]['type'], "string");
$bugzilla->addMember("exclude_fields", array("data"), "string");


$tempName = $_FILES["file_name"]['tmp_name'];
$contents = base64_encode(file_get_contents($tempName));

if ($_FILES['file_name']['error'] != UPLOAD_ERR_OK) {
    $ret = json_encode(array("error" => $_FILES['file_name']['error']."(See documentation for interpertaion)"));
} else if (empty($tempName)) {
    $ret = json_encode(array("error" => "No file to upload"));
} else if ($contents === false) {
    $ret = json_encode(array("error" => "Couldn't get file contents"));
} else {
    $bugzilla->addMember("data", $contents, "base64");
    $ret = $bugzilla->submit();

    header('Content-Type: text/html; charset=iso-8859-1');
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title></title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <script language="javascript" type="text/javascript">
            var json = <?php echo $ret; ?>;
            parent.ajaxUploadCallBack(json);
    
        </script>  
    </head>
    <body>
        Script Test
    </body>
</html>

