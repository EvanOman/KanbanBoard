<?php

$xml_data ='<method>Bugzilla.time</method>';



$URL = "http://software-pc/PhpProject4/test_file.php";


// is cURL installed yet?
if (!function_exists('curl_init')) {
    die('Sorry cURL is not installed!');
}

// OK cool - then let's create a new cURL resource handle
$ch = curl_init();

// Now set some options (most are optional)
// Set URL to download  
curl_setopt($ch, CURLOPT_URL, $URL);


curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

curl_setopt($ch, CURLOPT_POST, true);

curl_setopt($ch, CURLOPT_POSTFIELDS, $xml_data);

// Include header in result? (1 = yes, 0 = no)
curl_setopt($ch, CURLOPT_HEADER, 0);

curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/xml'));

// Should cURL return or print out the data? (true = return, false = print)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Timeout in seconds
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Download the given URL, and return output
$output = curl_exec($ch);

echo var_dump($output);


// Close the cURL resource, and free system resources
curl_close($ch);
?>