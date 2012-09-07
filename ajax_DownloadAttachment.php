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
