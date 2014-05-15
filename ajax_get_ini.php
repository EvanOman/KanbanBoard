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

$filename = filter_input(INPUT_POST, 'filename', FILTER_SANITIZE_STRING);

require_once('class.inifile.php');
$options = IniFile::load($filename, true);

if ($options === false){
     die(json_encode(array("success"=>false, "error"=>"Failed to read $filename file")));
}
else{
    die(json_encode(array("success"=>true, "options"=>$options)));
}

?>
