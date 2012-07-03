<?php
if (!class_exists('DateTime'))
    require_once('DateTime.class.php');
include 'class.bugzillaxml.php';
include "config.php";


//Here we instantiate a new BugzillaXML object with the passed in method
$bugzilla = new BugzillaXML("Bug.attachments");

$id = filter_input(INPUT_GET, "id", FILTER_SANITIZE_NUMBER_INT);

$bugzilla->addMember("attachment_ids", $id, "int");
//just get back the file, name and content type
$bugzilla->addMember("include_fields", array("data", "file_name", "content_type"), "string");


//Then submit
$submit = $bugzilla->submit(true);

if (empty($submit['attachments'])) {
    die('Invalid Attachment Id');
}

$filename = $submit['attachments'][$id]['file_name'];
$filetype = $submit['attachments'][$id]['content_type'];

header("Pragma: public");
header("Expires: 0");
header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
header("Content-Type: application/force-download");
header("Content-Type: " . $filetype);
header("Content-Type: application/download");
header("Content-Disposition: attachment;filename=" . $filename);
header("Content-Transfer-Encoding: binary ");

echo $submit['attachments'][$id]['data'];
?>
