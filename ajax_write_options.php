<?php

$prioMap = array();
foreach ($_POST["map"] as $name => $class) {
    $name = filter_var($name, FILTER_SANITIZE_STRING);
    $class = filter_var($class, FILTER_SANITIZE_STRING);
    $prioMap[$name] = $class;    
}
$iniSettings = array("prioIcons"=>$prioMap);

if (write_ini_file($iniSettings, "kanban.ini", true))
{
    die(json_encode(array("success"=>true)));
}
else
{
    die(json_encode(array("success"=>false, "error"=>"Failed to write kanban.ini file")));
}


function write_ini_file($assoc_arr, $path, $has_sections=FALSE) { 
    $content = ""; 
    if ($has_sections) { 
        foreach ($assoc_arr as $key=>$elem) { 
            $content .= "[".$key."]\n"; 
            foreach ($elem as $key2=>$elem2) { 
                if(is_array($elem2)) 
                { 
                    for($i=0;$i<count($elem2);$i++) 
                    { 
                        $content .= $key2."[] = \"".$elem2[$i]."\"\n"; 
                    } 
                } 
                else if($elem2=="") $content .= $key2." = \n"; 
                else $content .= $key2." = \"".$elem2."\"\n"; 
            } 
        } 
    } 
    else { 
        foreach ($assoc_arr as $key=>$elem) { 
            if(is_array($elem)) 
            { 
                for($i=0;$i<count($elem);$i++) 
                { 
                    $content .= $key."[] = \"".$elem[$i]."\"\n"; 
                } 
            } 
            else if($elem=="") $content .= $key." = \n"; 
            else $content .= $key." = \"".$elem."\"\n"; 
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
