<?php
include "config.php";
/*error_reporting(E_ALL);
ini_set('display_errors', true);*/

class BugzillaXML {

    protected $responseType; #XML | JSON | JAVASCRIPT
    protected $isJSONOmitResponseWrapper;
    protected $data;
    protected $requestID;
    protected $requestType;

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
        $login = $this->data->params->param->value->struct->addChild('member');
        $login->addChild('name', 'Bugzilla_login');
        $login->addChild('value', userName);
        $password = $this->data->params->param->value->struct->addChild('member');
        $password->addChild('name', 'Bugzilla_password');
        $password->addChild('value', password);
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
        } else {

            $member->addChild('value', $value);
        }
    }

    function toXML() {
        return $this->data->asXML();
    }

    function toJson($xml) {

        $doc = new DOMDocument();
        $doc->loadXML($xml);
        
       // var_dump($doc);

        $paramElements = $doc->getElementsByTagName('param');

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
        $this->requestID = "ID";

        $json = $this->printResponseStart();

        if (!$this->isJSONOmitResponseWrapper) {
            $json .= '"result":';
        }
        $json .= $this->encodeJson($requestParams);

        $json .= $this->printResponseEnd();

        return $json;
        /* $json = array();
          $this->data = new SimpleXMLElement('newXMLDocument.xml', null, true);

          $a = $this->xml2Array($this->data->asXML());
          // var_dump($a);
          foreach ($a['params'][0]['param'][0]['value'][0]['struct'][0]["member"] as $val) {

          foreach ($val['value'][0] as $type => $contents) {
          if ($type == 'array') {

          }
          $result = $contents[0];
          }
          $json[$val['name'][0]] = $result;
          }
          return json_encode(array("result" => $json)); */
    }

    /* function xml2array($xml) {
      $sxi = new SimpleXmlIterator($xml);
      return $this->sxiToArray($sxi);
      }

      function sxiToArray($sxi) {
      $a = array();
      for ($sxi->rewind(); $sxi->valid(); $sxi->next()) {
      if (!array_key_exists($sxi->key(), $a)) {
      $a[$sxi->key()] = array();
      }
      if ($sxi->hasChildren()) {
      $a[$sxi->key()][] = $this->sxiToArray($sxi->current());
      } else {
      $a[$sxi->key()][] = strval($sxi->current());
      }
      }
      return $a;
      } */

    function submit() {

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
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, $this->toXML());

        // Include header in result? (1 = yes, 0 = no)
        curl_setopt($ch, CURLOPT_HEADER, 0);

        // Should cURL return or print out the data? (true = return, false = print)
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-type: text/xml'));

        // Timeout in seconds
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        // Download the given URL, and return output
        $output = curl_exec($ch);

        //echo $output;
        
        // Close the cURL resource, and free system resources
        curl_close($ch);

        return $this->toJson($output);
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

}

?>
