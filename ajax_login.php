<?php
include "config.php";

$params = array(array("login" => userName, "password" => password, "remember"=>true));


$params = json_encode($params);

$data = array( "params" => $params, "method" => "User.login","id"=> "bugs");


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
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

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
