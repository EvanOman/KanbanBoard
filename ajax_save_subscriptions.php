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

if (empty($_SESSION["userID"])) {
    die(json_encode(array("success" => false, "error" => "You do not have permissions to save subscriptions.  Please login first.")));
}
session_write_close();

$col = filter_input(INPUT_POST, "col_sortkey", FILTER_SANITIZE_NUMBER_INT);
$subs = parse_ini_file("subscriptions.ini", true);
$col_subs = $subs['column_subscriptions'];

$this_sub = $col_subs[$_SESSION['userID']];
if (!is_array($this_sub)) $this_sub = array();


$key = array_search($col, $this_sub);

//if we're subscribed currently, unsubscribe, otherwise subscribe
if (in_array($col, $this_sub)) {
    $new_arr = array();
    foreach ($this_sub as $key => $val) {
        if ($val != $col) {
            $new_arr[] = $val;
        }
    }
    $this_sub = $new_arr;
    $added = false;
} else {
    array_push($this_sub, $col);
    $added = true;
}

$col_subs[$_SESSION['userID']] = $this_sub;


$iniSettings = array("column_subscriptions" => $col_subs);

if (write_ini_file($iniSettings, "subscriptions.ini", true)) {
    die(json_encode(array("success" => true, "added" => $added)));
} else {
    die(json_encode(array("success" => false, "error" => "Failed to write subscriptions.ini file")));
}

function write_ini_file($assoc_arr, $path, $has_sections = FALSE) {
    $content = "";
    if ($has_sections) {
        foreach ($assoc_arr as $key => $elem) {
            $content .= "[" . $key . "]\n";
            foreach ($elem as $key2 => $elem2) {
                if (is_array($elem2)) {
                    for ($i = 0; $i < count($elem2); $i++) {
                        $content .= $key2 . "[] = \"" . $elem2[$i] . "\"\n";
                    }
                } else if ($elem2 == "")
                    $content .= $key2 . " = \n";
                else
                    $content .= $key2 . " = \"" . $elem2 . "\"\n";
            }
        }
    }
    else {
        foreach ($assoc_arr as $key => $elem) {
            if (is_array($elem)) {
                for ($i = 0; $i < count($elem); $i++) {
                    $content .= $key . "[] = \"" . $elem[$i] . "\"\n";
                }
            } else if ($elem == "")
                $content .= $key . " = \n";
            else
                $content .= $key . " = \"" . $elem . "\"\n";
        }
    }

    if (!$handle = fopen($path, 'w')) {
        return false;
    }
    if (!fwrite($handle, $content)) {
        return false;
    }
    fclose($handle);
    return true;
}

?>
