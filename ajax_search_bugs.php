<?php
include "config.php";
//bugzilla_login();

$bugId = $_REQUEST['bug_id'];
foreach ($bugId as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_NUMBER_INT);
}

$priority = $_REQUEST['priority'];//
foreach ($priority as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}

$product = $_REQUEST['product'];//
foreach ($product as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}

$severity = $_REQUEST['severity'];//
foreach ($severity as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}

$summary = $_REQUEST['summary'];//
foreach ($summary as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}

$status = $_REQUEST['status'];//
foreach ($status as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}
$resolution = $_REQUEST['resolution'];
foreach ($resolution as $value) {
    $value = filter_input(INPUT_POST, $value, FILTER_SANITIZE_STRING);
}

// TODO This field is sometimes a field and sometimes an int, need to figure out how to sanitize
$version =  $_REQUEST['version'];
$params = array(array("Bugzilla_login"=> userName, "Bugzilla_password"=>password,  "summary" => $summary, "product" => $product, "version" => $version,
    "bug_status"=>$status, "bug_severity"=>$severity, "resolution"=>$resolution, "priority" => $priority));

$params = json_encode($params);

$data = array("method" => "Bug.search", "params" => $params, "id"=>BUGZILLA_URL);




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

// Timeout in seconds
curl_setopt($ch, CURLOPT_TIMEOUT, 100000);

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Download the given URL, and return output
$output = curl_exec($ch);

if($output === false)
{
    echo json_encode(array("error" => array("message"=>'Curl error: ' . curl_error($ch))));
}
else 
{
    echo $output;
}

// Close the cURL resource, and free system resources
curl_close($ch);




?>
