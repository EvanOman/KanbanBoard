<?php

$options = parse_ini_file("kanban.ini", true);

if ($options === false){
     die(json_encode(array("success"=>false, "error"=>"Failed to read kanban.ini file")));
}
else{
    die(json_encode(array("success"=>true, "options"=>$options)));
}

?>
