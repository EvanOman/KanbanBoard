<?php
/*
Copyright(c) 2012, Eckhardt Optics
Authors: Evan Oman, John Eckhardt

This is part of Bugzilla Kanban Board.

Bugzilla Kanban Board is free software: you can
redistribute it and/or modify it under the terms of the GNU
General Public License (GNU GPL) as published by the Free Software
Foundation, either version 3 of the License, or (at your option)
any later version.  The code is distributed WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.
 */

class BugzillaXML {

    protected $responseType; #XML | JSON | JAVASCRIPT
    protected $isJSONOmitResponseWrapper;
    protected $data;
    protected $requestID;
    protected $requestType;
    protected $loginCookie = "Bugzilla_logincookie";

    const JSON_RPC_VERSION = "1.1";
    const XML_RPC_VERSION = "1.0";
    const XML = 1;
    const JSON = 2;

    function __construct($method) {
        $this->data = new SimpleXMLElement('<methodCall/>');
        $this->data->addChild('methodName', $method);
        $this->data->addChild('params');
        $this->data->params->addChild('param');
        $this->data->params->param->addChild('value');
        $this->data->params->param->value->addChild('struct');
        //Automatically logins  to bugzilla. Should this only be done once with a User.login call?
       if (isset($_SESSION["login"]) && isset($_SESSION["password"])) {
            $login = $this->data->params->param->value->struct->addChild('member');
            $login->addChild('name', 'Bugzilla_login');
            $login->addChild('value', $_SESSION["login"] /*"evan.oman@blc.edu"*/);
            $password = $this->data->params->param->value->struct->addChild('member');
            $password->addChild('name', 'Bugzilla_password');
            $password->addChild('value', $_SESSION["password"] /*"password"*/);
       }
    }

    function addMember($name, $value, $valueType) {
        $member = $this->data->params->param->value->struct->addChild('member');

        //Automatically calls the CleanInput() function which sanitizes the value based off of its intended type       
        $value = $this->cleanInput($value, $valueType);

        $member->addChild('name', $name);

        if (is_array($value)) {
            $member->addChild('value');
            $member->value->addChild('array');
            $member->value->array->addChild('data');
            foreach ($value as $val) {
                $member->value->array->data->addChild('value', $val);
            }
        } else if ($valueType == "base64") {
            $member->addChild('value');
            $member->value->addChild('base64', $value);
        } else {

            $member->addChild('value', $value);
        }
    }

    function toXML() {
        return $this->data->asXML();
    }

    function toJson($xml) {
        
        //echo $xml;
        
        $doc = new DOMDocument();
        $doc->loadXML($xml);
                        
        $paramElements = $doc->getElementsByTagName('param');
        if ($paramElements->item(0) == NULL) {
            $faultElements = $doc->getElementsByTagName('fault');
            $faultEl = $faultElements->item(0);
            $valueEl = $faultEl->firstChild;
            while ($valueEl && ($valueEl->nodeType != 1 || $valueEl->nodeName != 'value'))
                $valueEl = $valueEl->nextSibling;
            /* if (!$valueEl)
              trigger_error("XML-RPC Parse Error: Expected a 'value' element child of the 'param' element."); */
            $requestParams = $this->decodeXmlRpc($valueEl);

            $this->responseType = self::JSON;
            $this->requestType = self::JSON;
            $this->isJSONOmitResponseWrapper = false;
            $this->requestID = "Error";

            $json = $this->printResponseStart();

            if (!$this->isJSONOmitResponseWrapper) {
                $json .= '"result":';
            }
            $json .= $this->encodeJson($requestParams);

            $json .= $this->printResponseEnd();
        } else {
            //echo 'Didnt Work';
            $paramEl = $paramElements->item(0);
            $valueEl = $paramEl->firstChild;
            while ($valueEl && ($valueEl->nodeType != 1 || $valueEl->nodeName != 'value'))
                $valueEl = $valueEl->nextSibling;
            if (!$valueEl)
                trigger_error("XML-RPC Parse Error: Expected a 'value' element child of the 'param' element.");
            $requestParams = $this->decodeXmlRpc($valueEl);

            //var_dump($requestParams);
            $this->responseType = self::JSON;
            $this->requestType = self::JSON;
            $this->isJSONOmitResponseWrapper = false;
            //$this->requestID = $requestID;

            $json = $this->printResponseStart();

            if (!$this->isJSONOmitResponseWrapper) {
                $json .= '"result":';
            }
            $json .= $this->encodeJson($requestParams);

            $json .= $this->printResponseEnd();
        }
        
        //echo $json;
        
        return $json;
    }

    function submit($returnArray = false) {

        // is cURL installed yet?
        if (!function_exists('curl_init')) {
            die('Sorry cURL is not installed!');
        }

        // OK cool - then let's create a new cURL resource handle
        $ch = curl_init();

        // Now set some options (most are optional)
        // Set URL to download
        curl_setopt($ch, CURLOPT_URL, BUGZILLA_URL);

        $post = $this->toXML();

        //Identifies the call by its method name
        $name = new SimpleXMLElement($post);
        $this->requestID = (string) $name->methodName;
    
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        curl_setopt($ch, CURLOPT_POST, true);

        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);               

        //echo $post;
        // Include header in result? (1 = yes, 0 = no)
        curl_setopt($ch, CURLOPT_HEADER, 0);

        // Should cURL return or print out the data? (true = return, false = print)
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-type: text/xml'));

        // Timeout in seconds
        curl_setopt($ch, CURLOPT_TIMEOUT, 100000);

        // Download the given URL, and return output
        $output = curl_exec($ch);
        
        
        //For 1500 bugs: 3784845
        //For 1000 bugs: 2686061
        //echo $output;
        // Close the cURL resource, and free system resources
        curl_close($ch);
        if ($returnArray) {
            return $this->toPHP($output);
        } else {
            return $this->toJson($output);
        }
    }

    protected function printResponseStart() {
        $return = "";
        if (!$this->responseType) {
            if ($this->isJSONOmitResponseWrapper || preg_match("/\bapplication\/json\b/i", $_SERVER['HTTP_ACCEPT']))
                $this->responseType = self::JSON;
            else if (!$this->isJSONOmitResponseWrapper && preg_match("/\bxml\b/i", $_SERVER['HTTP_ACCEPT']))
                $this->responseType = self::XML;
            else #$this->requestType == self::XML || $this->requestType == self::JSON
                $this->responseType = $this->requestType;
        }

        ##Start the output to the client in the appropriate format
        if ($this->responseType == self::XML) {
            #The Content-Type is text/xml. Content-Length must be present and correct.
            #   The body of the response is a single XML structure, a <methodResponse>, which
            #   can contain a single <params> which contains a single <param> which contains a single <value>.
            header('content-type: text/xml; charset=utf-8');
            $return .= '<?xml version="1.0"?><methodResponse>';
        } else { #JSON or JavaScript
            header('content-type: application/json; charset=utf-8');


            #Begin response object
            if (!$this->isJSONOmitResponseWrapper) {
                $return .= "{";

                #version REQUIRED. A String specifying the version of the JSON-RPC protocol to which the
                #   client conforms. An implementation conforming to this specification MUST use the exact
                #   String value of "1.1" for this member. The absence of this member can effectively be
                #   taken to mean that the remote server implement version 1.0 of the JSON-RPC protocol.
                $return .= '"version":"' . self::JSON_RPC_VERSION . '",';
                if ($this->requestID)
                    $return .= '"id":' . $this->encodeJson($this->requestID) . ',';
            }
        }
        return $return;
    }

    protected function printResponseEnd() {
        if ($this->responseType == self::XML)
            return "</methodResponse>";
        else if (!$this->isJSONOmitResponseWrapper)
            return "}";
    }

    protected function encodeJson($value) {
        //switch(gettype($value)){

        if ($value === null)
        //case 'NULL';
            return 'null';

        ## Array ###############################
        //case 'array':
        else if (is_array($value)) {
            if (!count($value))
                return "[]";
            #inspired by sean at awesomeplay dot com (26-May-2007 07:21) in the PHP user contributed notes for json_encode
            if (self::isVector($value)) {
                $json = '[';
                for ($i = 0; $i < count($value); $i++) {
                    if ($i)
                        $json .= ',';
                    $json .= $this->encodeJson($value[$i]);
                }
                return $json . ']';
                #return '[' . join(",", array_map('self::encodeJson', $value)) . ']';
            }
            else {
                $json = '{';
                $count = 0;
                foreach ($value as $k => $v) {
                    if ($count++)
                        $json .= ',';
                    $json .= $this->encodeJson((string) $k) . ':' . $this->encodeJson($v);
                }
                return $json . '}';
            }
        }
        ## Object ###############################
        else if (is_object($value)) {
            //case 'object':
            $className = get_class($value);
            switch ($className) {
                case 'DateTime':
                    $ticks = $value->format("U") . substr($value->format("u"), 0, 3); //round($value->format("u")/1000);

                    return '"' . $value->format('Y-m-d\TH:i:s.u') . '"';

                default:
                    $json = '{' . $this->encodeJson($className) . ':{';
                    $members = get_object_vars($value);
                    if (count($members)) {
                        $count = 0;
                        foreach ($members as $k => $v) {
                            if ($count++)
                                $json .= ',';
                            $json .= $this->encodeJson($k) . ':' . $this->encodeJson($v);
                        }
                        $json .= '}';
                    }
                    return $json . '}';
            }
        }
        //case 'resource':
        else if (is_resource($value))
            return $this->encodeJson($this->convertResource($value));
        else if (is_double($value))
        //case 'double': #json_encode is croaking on long ints encoded as doubles
            return preg_replace("/\.0+$/", '', sprintf("%f", $value));
        else if (is_bool($value))
        //case 'boolean':
            return $value ? 'true' : 'false';
        else if (is_int($value))
        //case 'integer':
            return $value;
        else if (is_string($value)) {
            //case 'string':
            //Note: in PHP 5.1.2, using 'RPCServer' for &$this raises strict error: Non-static method cannot not be called statically, even though it is declared statically.
            $value = preg_replace_callback('/([\\\\\/"\x00-\x1F])/', array(&$this, 'getEscapeSequence_callback'), $value);
            return '"' . /* utf8_encode */($value) . '"';
        }
        trigger_error("Unable to convert type " . gettype($value) . " to JSON.");
    }

    protected function decodeXmlRpc($valueEl) { #function parseValue($valueEl){
        if ($valueEl->childNodes->length == 1 &&
                $valueEl->childNodes->item(0)->nodeType == 3) {
            return $valueEl->childNodes->item(0)->nodeValue;
        }
        for ($i = 0; $i < $valueEl->childNodes->length; $i++) {
            if ($valueEl->childNodes->item($i)->nodeType == 1) {
                $typeEl = $valueEl->childNodes->item($i);
                switch ($typeEl->nodeName) {
                    case 'i4':
                    case 'int':
                        #An integer is a 32-bit signed number. You can include a plus or minus at the
                        #   beginning of a string of numeric characters. Leading zeros are collapsed.
                        #   Whitespace is not permitted. Just numeric characters preceeded by a plus or minus.
                        if (!preg_match("/^[-\+]?\d+$/", $typeEl->firstChild->nodeValue))
                            trigger_error("XML-RPC Parse Error: The value provided as an integer '" . $typeEl->firstChild->nodeValue . "' is invalid.");

                        $double = (double) $typeEl->firstChild->nodeValue;
                        $int = (int) $typeEl->firstChild->nodeValue;

                        #If the provided number is too big to fit in an INT, then it
                        #   will overflow so it must be stored as a DOUBLE
                        if (abs(floor($double) - $int) > 1)
                            return $double;
                        else
                            return $int;
                    case 'double':
                        #There is no representation for infinity or negative infinity or "not a number".
                        #   At this time, only decimal point notation is allowed, a plus or a minus,
                        #   followed by any number of numeric characters, followed by a period and any
                        #   number of numeric characters. Whitespace is not allowed. The range of
                        #   allowable values is implementation-dependent, is not specified.
                        if (!preg_match("/^[-\+]?\d+(\.\d+)?$/", $typeEl->firstChild->nodeValue))
                            trigger_error("XML-RPC Parse Error: The value provided as a double '" . $typeEl->firstChild->nodeValue . "' is invalid.");
                        return (double) $typeEl->firstChild->nodeValue;
                    case 'boolean':
                        if ($typeEl->firstChild->nodeValue != '0' && $typeEl->firstChild->nodeValue != '1')
                            trigger_error("XML-RPC Parse Error: The value provided as a boolean '" . $typeEl->firstChild->nodeValue . "' is invalid.");
                        return (bool) $typeEl->firstChild->nodeValue;
                    case 'string':
                        if (!$typeEl->firstChild)
                            return "";
                        return (string) /* utf8_decode */($typeEl->firstChild->nodeValue);
                    case 'dateTime.iso8601':
                        #try {
                        $date = new DateTime($typeEl->firstChild->nodeValue);
                        #}
                        #catch(Exception $e){
                        #	trigger_error("XML-RPC Parse Error: The value provided as a dateTime.iso8601 '" . $typeEl->firstChild->nodeValue . "' is invalid.");
                        #}	
                        return $date;
                    case 'base64':
                        return base64_decode($typeEl->firstChild->nodeValue);
                    case 'nil':
                        return null;
                    case 'struct':
                        #A <struct> contains <member>s and each <member> contains a <name> and a <value>.
                        $struct = array();
                        #$memberEl = $typeEl->firstChild;
                        for ($j = 0; $memberEl = $typeEl->childNodes->item($j); $j++) {
                            if ($memberEl->nodeType == 1 && $memberEl->nodeName == 'member') {
                                $name = '';
                                $valueEl = null;
                                for ($k = 0; $child = $memberEl->childNodes->item($k); $k++) {
                                    if ($child->nodeType == 1) {
                                        if ($child->nodeName == 'name')
                                            $name = /* utf8_decode */($child->firstChild->nodeValue);
                                        else if ($child->nodeName == 'value')
                                            $valueEl = $child;
                                    }
                                }
                                #<struct>s can be recursive, any <value> may contain a <struct> or
                                #   any other type, including an <array>, described below.
                                if ($name && $valueEl)
                                    $struct[$name] = $this->decodeXmlRpc($valueEl);
                            }
                        }
                        return $struct;
                    case 'array':
                        #An <array> contains a single <data> element, which can contain any number of <value>s.
                        $arr = array();
                        $dataEl = $typeEl->firstChild;
                        while ($dataEl && ($dataEl->nodeType != 1 || $dataEl->nodeName != 'data'))
                            $dataEl = $dataEl->nextSibling;

                        if (!$dataEl)
                            trigger_error("XML-RPC Parse Error: Expected 'data' element as sole child element of 'array'.");

                        $valueEl = $dataEl->firstChild;
                        while ($valueEl) {
                            if ($valueEl->nodeType == 1) {
                                #<arrays>s can be recursive, any value may contain an <array> or
                                #   any other type, including a <struct>, described above.
                                if ($valueEl->nodeName == 'value')
                                    array_push($arr, $this->decodeXmlRpc($valueEl));
                                else
                                    trigger_error("XML-RPC Parse Error: Illegal element child '" . $valueEl->nodeName . "' of an array's 'data' element.");
                            }
                            $valueEl = $valueEl->nextSibling;
                        }
                        return $arr;
                    default:
                        trigger_error("XML-RPC Parse Error: Illegal element '" . $typeEl->nodeName . "' child of the 'value' element.");
                }
            }
        }
        return '';
    }

    function trigger_error($string) {
        die($string);
    }

    protected static function getEscapeSequence_callback($regExMatches) {
        if (isset(self::$charToJSON[$regExMatches[0]]))
            return self::$charToJSON[$regExMatches[0]];
        return sprintf('\\u00%02x', ord($regExMatches[0]));
    }

    private static $charToJSON = array(
        '\\' => '\\\\',
        '"' => '\\"',
        '/' => '\\/',
        "\x08" => '\\b',
        "\x09" => '\\t',
        "\x0A" => '\\n',
        "\x0C" => '\\f',
        "\x0D" => '\\r'
    );

    ## Convert PHP resource type to a returnable data format ###############################

    protected function convertResource($resource) {
        $resourceType = get_resource_type($resource);
        switch ($resourceType) {
            #case 'dbm':
            #case 'dba':
            #case 'dbase':
            #case 'domxml attribute':
            #case 'domxml document':
            #case 'domxml node':
            case 'fbsql result':
                $rows = array();
                $indexType = ($this->dbResultIndexType == 'ASSOC' ? FBSQL_ASSOC : FBSQL_NUM);
                while ($row = fbsql_fetch_array($resource, $indexType))
                    array_push($rows, $row);
                return $rows;

            #case 'gd': #return base64

            case 'msql query':
                $rows = array();
                $indexType = ($this->dbResultIndexType == 'ASSOC' ? MSQL_ASSOC : MSQL_NUM);
                while ($row = msql_fetch_array($resource, $indexType))
                    array_push($rows, $row);
                return $rows;

            case 'mssql result':
                $rows = array();
                $indexType = ($this->dbResultIndexType == 'ASSOC' ? MSSQL_ASSOC : MSSQL_NUM);
                while ($row = mssql_fetch_array($resource, $indexType))
                    array_push($rows, $row);
                return $rows;

            case 'mysql result':
                $rows = array();
                $indexType = ($this->dbResultIndexType == 'ASSOC' ? MYSQL_ASSOC : MYSQL_NUM);
                while ($row = mysql_fetch_array($resource, $indexType))
                    array_push($rows, $row);
                return $rows;

            case 'odbc result':
                $rows = array();
                if ($this->dbResultIndexType == 'ASSOC') {
                    while ($row = odbc_fetch_array($resource))
                        array_push($rows, $row);
                } else {
                    while ($row = odbc_fetch_row($resource))
                        array_push($rows, $row);
                }
                return $rows;

            #case 'pdf document':

            case 'pgsql result':
                $rows = array();
                $indexType = ($this->dbResultIndexType == 'ASSOC' ? PGSQL_ASSOC : PGSQL_NUM);
                while ($row = pg_fetch_array($resource, $indexType))
                    array_push($rows, $row);
                return $rows;

            case 'stream':
                return stream_get_contents($resource);

            case 'sybase-db result':
            case 'sybase-ct result':
                $rows = array();
                if ($this->dbResultIndexType == 'ASSOC') {
                    while ($row = sybase_fetch_assoc($resource))
                        array_push($rows, $row);
                } else {
                    while ($row = sybase_fetch_row($resource))
                        array_push($rows, $row);
                }
                return $rows;

            #case 'xml':

            default:
                trigger_error("Unable to return resource type '$resourceType'.");
        }
    }

    protected static function isVector(&$array) {
        $next = 0;
        foreach ($array as $k => $v) {
            if ($k !== $next)
                return false;
            $next++;
        }
        return true;
    }

    //This function sanitizes arrays and single values based off of the option passed in
    //$opts => "string" || "int"
    public function cleanInput($input, $opt) {

        switch ($opt) {
            case 'string': $filter = FILTER_SANITIZE_STRING;
                break;
            case 'int': $filter = FILTER_SANITIZE_NUMBER_INT;
                break;
            case 'special': $filter = FILTER_SANITIZE_SPECIAL_CHARS;
                break;
            case 'base64':
                return $input;
                break;
            case 'none':
                return $input;
                break;
            default: $filter = FILTER_SANITIZE_STRING;
                break;
        }


        if (is_array($input)) {
            $clean = array();
            foreach ($input as $value) {
                $value = filter_var($value, $filter);
                $clean[] = $value;
            }
            return $clean;
        } else {
            return filter_var($input, $filter);
        }
    }

    function toPHP($xml) {

        $doc = new DOMDocument();
        $doc->loadXML($xml);

        $paramElements = $doc->getElementsByTagName('param');
        if ($paramElements->item(0) == NULL) {
            $faultElements = $doc->getElementsByTagName('fault');
            $faultEl = $faultElements->item(0);
            $valueEl = $faultEl->firstChild;
            while ($valueEl && ($valueEl->nodeType != 1 || $valueEl->nodeName != 'value'))
                $valueEl = $valueEl->nextSibling;
            /* if (!$valueEl)
              trigger_error("XML-RPC Parse Error: Expected a 'value' element child of the 'param' element."); */
            return $this->decodeXmlRpc($valueEl);
        } else {
            //echo 'Didnt Work';
            $paramEl = $paramElements->item(0);
            $valueEl = $paramEl->firstChild;
            while ($valueEl && ($valueEl->nodeType != 1 || $valueEl->nodeName != 'value'))
                $valueEl = $valueEl->nextSibling;
            if (!$valueEl)
                trigger_error("XML-RPC Parse Error: Expected a 'value' element child of the 'param' element.");
            return $this->decodeXmlRpc($valueEl);
        }
    }

}

?>
