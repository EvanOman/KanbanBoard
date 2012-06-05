<?php
//bugzilla_login();

$bugId = filter_input(INPUT_POST, "bug_id", FILTER_SANITIZE_NUMBER_INT);
$summary = filter_input(INPUT_POST, "summary", FILTER_SANITIZE_STRING);

$params = array(array("ids" => $bugId, "summary" => $summary, "Bugzilla_login" => "dr.ecksk@gmail.com", "Bugzilla_password" => "kanban"));


$params = json_encode($params);

$data = array("method" => "Bug.update", "params" => $params);

// is cURL installed yet?
if (!function_exists('curl_init')) {
    die('Sorry cURL is not installed!');
}

// OK cool - then let's create a new cURL resource handle
$ch = curl_init();

// Now set some options (most are optional)
// Set URL to download http://landfill.bugzilla.org/bugzilla-4.2-branch/jsonrpc.cgi
curl_setopt($ch, CURLOPT_URL, "http://eckop.com/evan/post_check.php");


curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

curl_setopt($ch, CURLOPT_POST, true);

curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

// Include header in result? (1 = yes, 0 = no)
curl_setopt($ch, CURLOPT_HEADER, 0);

// Should cURL return or print out the data? (true = return, false = print)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

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

// Close the cURL resource, and free system resources
curl_close($ch);



function bugzilla_login() {
    $params = array(array("login" => "dr.ecksk@gmail.com", "password" => "kanban", "remember"=> true));


    $params = json_encode($params);

    $data = array("method" => "User.login", "params" => $params);

    // is cURL installed yet?
    if (!function_exists('curl_init')) {
        die('Sorry cURL is not installed!');
    }

    // OK cool - then let's create a new cURL resource handle
    $ch = curl_init();

    // Now set some options (most are optional)
    // Set URL to download
    curl_setopt($ch, CURLOPT_URL, "http://landfill.bugzilla.org/bugzilla-4.2-branch/jsonrpc.cgi");


    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    curl_setopt($ch, CURLOPT_POST, true);

    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

    // Include header in result? (1 = yes, 0 = no)
    curl_setopt($ch, CURLOPT_HEADER, 0);

    // Should cURL return or print out the data? (true = return, false = print)
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // Timeout in seconds
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    // Download the given URL, and return output
    $output = curl_exec($ch);

    // Close the cURL resource, and free system resources
    curl_close($ch);

    echo $output;
}

?>
