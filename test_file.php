<?php
 /*if ($_REQUEST[method]!= NULL)
 {
     echo "Got the data\n";
     var_dump($_REQUEST);
 }
 else{
     echo "Didnt work\n";
     var_dump($_REQUEST);
 }*/
echo date("s")."<br>";

echo date("s", time())."<br>";

echo microtime()."\n";

echo substr(microtime(), 2, 3);
/*include "config.php";

//$params = json_encode($params);

$data = array("method" => "Bugzilla.time");
$data = json_encode($data);
// is cURL installed yet?
if (!function_exists('curl_init')) {
    die('Sorry cURL is not installed!');
}

// OK cool - then let's create a new cURL resource handle
$ch = curl_init();

// Now set some options (most are optional)
// Set URL to download
curl_setopt($ch, CURLOPT_URL, 'http://software-pc/Bugzilla4.2/jsonrpc.cgi');


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

echo $output;*/


?>
