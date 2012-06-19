<?php
include "config.php";

$name = $_REQUEST['name'];
$values = $_REQUEST['values'];
$ids = filter_input(INPUT_POST, 'ids', FILTER_SANITIZE_NUMBER_INT);
$value_field = filter_input(INPUT_POST, 'value_field', FILTER_SANITIZE_STRING);
$visibility_values = filter_input(INPUT_POST, 'visibility_values', FILTER_SANITIZE_NUMBER_INT);
$visibility_field = filter_input(INPUT_POST, 'visibility_field', FILTER_SANITIZE_STRING);

foreach ($name as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}



$params = array(array("names" => $name, "id" => $ids, "value_field " => $value_field, "visibility_values" => $visibility_values, "visibility_field"=>$visibility_field, "values"=>$values));

$params = json_encode($params);

$data = array("method" => "Bug.fields", "params" => $params);

// is cURL installed yet?
if (!function_exists('curl_init')) {
    die('Sorry cURL is not installed!');
}

// OK cool - then let's create a new cURL resource handle
$ch = curl_init();

// Now set some options (most are optional)
// Set URL to download
curl_setopt($ch, CURLOPT_URL, BUGZILLA_URL);


curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

curl_setopt($ch, CURLOPT_POST, true);

curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

// Include header in result? (1 = yes, 0 = no)
curl_setopt($ch, CURLOPT_HEADER, 0);

// Should cURL return or print out the data? (true = return, false = print)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Timeout in seconds
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

// Download the given URL, and return output
$output = curl_exec($ch);

// Close the cURL resource, and free system resources
curl_close($ch);

echo $output;
?>
