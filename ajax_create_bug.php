<?php
include "config.php";
//bugzilla_login();


$component = filter_input(INPUT_POST, "component", FILTER_SANITIZE_STRING);
$priority = filter_input(INPUT_POST, "priority", FILTER_SANITIZE_STRING);
$product = filter_input(INPUT_POST, "product", FILTER_SANITIZE_STRING);
$severity = filter_input(INPUT_POST, "severity", FILTER_SANITIZE_STRING);
$summary = filter_input(INPUT_POST, "summary", FILTER_SANITIZE_STRING);
// TODO This field is sometimes a field and sometimes an int, need to figure out how to sanitize
$version = filter_input(INPUT_POST, "version");

$params = array(array("Bugzilla_login" => userName, "Bugzilla_password" => password, "summary" => $summary,"component" => $component, 
    "priority" => $priority,"product" => $product, "summary" => $summary,"summary" => $summary, "version" => $version,));


$params = json_encode($params);

$data = array("method" => "Bug.create", "params" => $params, "id"=> 1);

/* TODO Need to enable cookies, recieve cookies from the bugzilla server upon login, and somehow send them with each modify call*/


// is cURL installed yet?
if (!function_exists('curl_init')) {
    die('Sorry cURL is not installed!');
}

// OK cool - then let's create a new cURL resource handle
$ch = curl_init();

// Now set some options (most are optional)
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

if($output === false)
{
    echo json_encode(array("error" => array("message"=>'Curl error: ' . curl_error($ch))));
}
else 
{
    echo $output;
}
//<editor-fold>
// Close the cURL resource, and free system resources
curl_close($ch);
//</editor-fold>



?>
