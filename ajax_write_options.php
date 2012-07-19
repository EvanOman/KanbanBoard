<?php

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

$boardFilterOptions = array();
foreach ($_POST["boardFilterOptions"] as $field => $value) {
    $field = filter_var($field, FILTER_SANITIZE_STRING);
    if (is_array($value)) {
        $arr = array();
        foreach ($value as $val) {
            $val = filter_var($val, FILTER_SANITIZE_STRING);
            array_push($arr, $val);
        }
        $boardFilterOptions[$field] = $arr;
    } else {
        $value = filter_var($value, FILTER_SANITIZE_STRING);
        $boardFilterOptions[$field] = $value;
    }
}

$blankColumnMap = array();
foreach ($_POST["blankColumnMap"] as $status => $column) {
    $status = filter_var($status, FILTER_SANITIZE_STRING);   
    $column = filter_var($column, FILTER_SANITIZE_STRING);
    $blankColumnMap[$status] = $column;
}


$limitWIP = array();
foreach ($_POST["limitWIP"] as $col => $limit) {
    $col = filter_var($col, FILTER_SANITIZE_STRING);   
    $limit = filter_var($limit, FILTER_SANITIZE_NUMBER_INT);
    $limitWIP[$col] = $limit;
}

$iniSettings = array("prioIcons" => $prioMap, "jobColors" => $jobMap, "boardFilterOptions" => $boardFilterOptions, "blankColumnMap"=> $blankColumnMap, "limitWIP" => $limitWIP );

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
