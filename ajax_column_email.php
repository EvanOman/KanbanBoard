<?php
require_once('config.php');
require_once('class.phpmailer.php');

$product = filter_input(INPUT_POST, 'product', FILTER_SANITIZE_STRING);
$col_name = filter_input(INPUT_POST, 'col_name', FILTER_SANITIZE_STRING);
$col_id = filter_input(INPUT_POST, 'col_id', FILTER_SANITIZE_STRING);
$ids = $_POST['ids'];
$summaries = $_POST['summaries'];


//poor man's decryption
function get_emails() {
    $data = file_get_contents("emails.php");
    $start = strpos($data, "/*")+2;
    $d = json_decode(substr($data, $start, strrpos($data, "*/") - $start), true);
    if ($d === false) {
        return array();
    } else {
        return $d;
    }
}

//generate the message body
$body = "Cards have been moved into one of your subscribed columns.<br /><br />The card";
if (count($ids) > 1) $body .= "s";
$body .= ":";

$body .= "<ul>";
for ($i = 0; $i < count($ids); $i++) {
    $id = filter_var($ids[$i], FILTER_SANITIZE_STRING);
    $summary = filter_var($summaries[$i], FILTER_SANITIZE_STRING);
    $body .= "<li>Bug #" . $id . " - " . $summary . "</li>";
}
$body .= "</ul>";
$body .= (count($ids) > 1) ? "have" : "has";
$body .= " been moved into the column: ".$col_name;
$body .= "<br /><br />Just an FYI!";


$mail = new PHPMailer(true); // the true param means it will throw exceptions on errors, which we need to catch

if (SMTP_HOST != "" && SMTP_USER != "") {
    $mail->IsSMTP(); // telling the class to use SMTP
    $mail->SMTPAuth = true;                  // enable SMTP authentication
    $mail->Host = SMTP_HOST; // SMTP server
    $mail->Port = SMTP_PORT;                    // set the SMTP port for the server
    $mail->Username = SMTP_USER; // SMTP account username
    $mail->Password = SMTP_PASS;        // SMTP account password
}

$sub_data = parse_ini_file("subscriptions.ini", true);
$email_arr = get_emails();
$num_reciepients = 0;
//get the e-mail addresses for the people who are subscribed to this column
foreach ($sub_data['column_subscriptions'] as $user_id => $col_arr) {
    if (in_array($col_id, $col_arr) && isset($email_arr[$user_id])) {
        $num_reciepients++;
        $mail->AddAddress($email_arr[$user_id]);
    }
}
unset($col_arr);

if (count($num_reciepients)) {
    try {
        $mail->SetFrom(EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME);
        $mail->Subject = $product.' Kanban Update';
        $mail->MsgHTML($body);
        $mail->Send();
    } catch (phpmailerException $e) {
        die(json_encode(array("success" => false, "error" => $e->errorMessage())));
    } catch (Exception $e) {
        die(json_encode(array("success" => false, "error" => $e->getMessage())));
    }
}

die(json_encode(array("success" => true)));

?>