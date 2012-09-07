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

$options = parse_ini_file("kanban.ini", true);
if (!in_array($_SESSION["userID"], $options["adminIds"]["adminIds"]) && !empty($options["adminIds"]["adminIds"])) {
 die(json_encode(array("success" => false, "error" => "You do not have administrator privileges")));
}

session_write_close();
$allowedColumnMap = array();
foreach ($_POST["allowedColumnMap"] as $status => $col) {
    if (is_array($col)) {
        $arr = array();
        foreach ($col as $val) {
            $val = filter_var($val, FILTER_SANITIZE_STRING);
            array_push($arr, $val);
        }
        $allowedColumnMap[$status] = $arr;
    } else {
        $col = filter_var($col, FILTER_SANITIZE_STRING);
        $allowedColumnMap[$status] = $col;
    }
}

$defaultColumnMap = array();
foreach ($_POST["defaultColumnMap"] as $status => $col) {
    $col = filter_var($col, FILTER_SANITIZE_STRING);
    $defaultColumnMap[$status] = $col;
}


$prioMap = array();
foreach ($_POST["prioMap"] as $name => $icon) {
    $name = filter_var($name, FILTER_SANITIZE_STRING);
    $icon = filter_var($icon, FILTER_SANITIZE_STRING);
    $prioMap[$name] = $icon;
}


$jobMap = array();
foreach ($_POST["jobMap"] as $name => $color) {
    $name = filter_var($name, FILTER_SANITIZE_STRING);
    //Here we sanitizer the color as a string because it coming in as rgb
    $color = filter_var($color, FILTER_SANITIZE_STRING);
    $jobMap[$name] = $color;
}

$limitWIP = array();
foreach ($_POST["limitWIP"] as $col => $limit) {
    $col = filter_var($col, FILTER_SANITIZE_STRING);
    $limit = filter_var($limit, FILTER_SANITIZE_NUMBER_INT);
    $limitWIP[$col] = $limit;
}

$tabColumns = array();
$tabArr = array();
foreach ($_POST["tabColumns"] as $value) {
    $value = filter_var($value, FILTER_SANITIZE_STRING);

    //Here we set the WIPlimit for any tablist column to be 0 to avoid WIP viloations on tablists
    $limitWIP[$value] = "0";

    array_push($tabArr, $value);
}
$tabColumns["tabColumns"] = $tabArr;

$adminIds = array();
$adminArr = array();
foreach ($_POST["adminIds"] as $value) {
    $value = filter_var($value, FILTER_SANITIZE_NUMBER_INT);

    array_push($adminArr, $value);
}
$adminIds["adminIds"] = $adminArr;

$colDivChar = array("colDivChar" => filter_input(INPUT_POST, 'colDivChar', FILTER_SANITIZE_STRING));

$theme = array("theme" => filter_input(INPUT_POST, 'theme', FILTER_SANITIZE_STRING));


$iniSettings = array("prioIcons" => $prioMap, "jobColors" => $jobMap, "allowedColumnMap" => $allowedColumnMap, "defaultColumnMap" => $defaultColumnMap, "limitWIP" => $limitWIP, "colDivChar" => $colDivChar, "tabColumns" => $tabColumns, "adminIds" => $adminIds, "theme" => $theme);

if (write_ini_file($iniSettings, "kanban.ini", true)) {
    die(json_encode(array("success" => true)));
} else {
    die(json_encode(array("success" => false, "error" => "Failed to write kanban.ini file")));
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
