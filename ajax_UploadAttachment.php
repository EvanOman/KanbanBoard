<?php
/* error_reporting(E_ALL);
  ini_set('display_errors', true); */

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

if ($_FILES['file_name']['error'] != UPLOAD_ERR_OK) {
    die(json_encode(array("error" => $_FILES['file_name']['error'])));
}

$tempName = $_FILES["file_name"]['tmp_name'];
if (empty($tempName)) {
    die(json_encode(array("error" => "No file to upload")));
}

$contents = base64_encode(file_get_contents($tempName));
if ($contents === false) {
    die(json_encode(array("error" => "Couldn't get file contents")));
}

$bugzilla->addMember("data", $contents, "base64");
$ret = $bugzilla->submit();

header('Content-Type: text/html; charset=iso-8859-1');
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

