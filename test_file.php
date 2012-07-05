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

echo base64_decode("iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3AYTDiceTpDZKQAABWVJREFUaN7VWUuMFGUQ/urvv3t2p2cfrLgK6z7IkA2Q4ONAjEHhgAc9KB40MTFKSICoQRM9gCTqwRCVA5oYQzwYgomJQiQBX4ARVBZQgoQFg67EB1lg3QcPYefd/f/loXt6emZ2l2XX6HQdZqb/qq6/vqq/Hj1N8Km97TYAwLkL58EXR3Di4CG73bYXxMC3SyFuBTMxCAQGQASA2b+XQl/+GhOBAo63TMFPZvZUgMCBKvIlGAxAELTmq3mtTwzlcqdXLn/4yg8AiAKd4b09GjzwDXr+/MNcattLbBKrBHAvsZ4JzVYgzWXWBFqYK9YAcAUE9mUpWPIdwgHwcqOIFAu6pEG9edZb+/OFLxqATHLFUyXZZEcnMrkcBvbtwa5du+3FHR1rE0K8SJpbuVJzFfYQk6gUE0I1SvY/KBQIKg9bNbGvmsDAqCvl+0PS3Dj3ltbLWLYM85JzIRnAX8NDuH/dBvnh8oeetnO5V8EcZ3iRnhL595VBHEfXhDuQh5A9mA2SxPMziYyP+37Z8PjMmzIFxwEVjTz6ysuL5yUadhiM2SVPVR2WCQ2ePG+SjiFRvSZEagi8Krlu/XYigiQitC1cWHfkkeVP0OjobBXa0EsYwvSIp2K6tz8zmKjs5IE50SjlkxtXr97LzFclAHr2zjtmW6n0Yu2qINFQcWRvYNuqy/JqNXmFWms/6b3aV8xJwzAW3WPKeQCOSgCi26CkkUl3uAUHIArZz9P0/nSj52vwCwSXjlFjLBbrIKJjEoCRHRxO6OZmS2ieTsDHl+cpahyj5jMANgyD43UtAAyJmG3k81lTpSQppUNhnr7//zXvVxQFlpIKDXETEIaEacJxHeGk04CrKtxGVaWcxjweFT256hoTyJbzOMg7398UTiTfqVKikGsi1NWRhKMoH5P8dzrLSGervB4OI4d+lfp+KNmp1JY5XEL9vGIu11LUXTSamQGtASH85lVs+6G8ZIANoa80Jgqor4eEdvBbojmdy11OFUDxYshonNGBx/BeYDyX+OQPROUyVNYXOBTMQN4QoUNcZLDftYvX0APDl1KwJGQ9FF1LNOdf+OzLVkSH6l5a+xzj+yMQWmnEYjFGxKhrTpcAAGEYBpRSOmoA4vVxBkAeANeNHADTNNnraULAVYoLi+7KRgkACfIAkCAopdg6dqI+UgD8CiduuL/XDgQfwCRH/pojv58IPxxRhFACwFN+dqwRAJGPwMQPtTUOwMthEeUIRNb5oSNEUQbA0bS/+IwjEN0QcLgKRXaWEFE1v9h8RYQLUCkCFM00Do8SEe8DEc0BRD0HfABEkRynXdf7H1TY8TjO9fdnowbg+PHjQyYJiLp4vT7T15eKkvE/fnfw0wP794/MmjVLC0HCBTizdsXKZ6IC4FBPz+HhwcFR07KUYGaVaGhMfbVvb9+7mzZtrXXjP9++Y/cH27Yda2pqTANQRsuMZib/le3J3t68s3497t7/9YJaNH7PJzu/fXvz5o8uDg//LE3rIgDHaJnRDDA0CaFcx1GnTp5MjaxZk156+PDCWjL+nTfe3Pneli27Bs6f7zUt6wKYMyAwJbvmFFuDBNDEmjtd1+1ua2+ff9+SJfNfe2vzY/+X0Ze7u0dbzpxpePSBB18/ferUT8z8qyFlP5ivguCCAUp2doVe/7MEkABws1KqzXGcVsuyWmKxmA3AmMyDw/VeLk1yamGAlOM6mVw2e8kwjCHTNAdAGAEjBcAN2ljxjmRnl6+eBQALgA0gwcw2gJjftf+rqYkBaBDyBEoDSAFIAygQkWYwfj97FgAgq4FDg5EDUABwjYjkdY2nChfzGPzxeNcD4XlbAdACwGhFfP8BjPZEpxJYg/0AAAAASUVORK5CYII=")

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
