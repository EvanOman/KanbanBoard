<?php

/*!
 * IniFile class to provide encoding and decoding of ini files and keys
 */
class IniFile {
  private static $INI_KEY_FROM = array('@', '{', '}', '|', '&', '~', '!', '[', '(', ')', '"');
  private static $INI_KEY_TO   = array('@@', '@A', '@B', '@C', '@D', '@E', '@F', '@G', '@H', '@I', '@J');

  /*!
   * Encode a value to be used as a key
   * @param $key The key to encode
   * @return An encoded version of $key
   */
  public static function encode($key) {
    return str_replace(self::$INI_KEY_FROM, self::$INI_KEY_TO, $key);
  }

  /*!
   * Decode a key encoded by the encode function
   * @param $key The key to decode
   * @return An decoded version of $key
   */
  public static function decode($key) {
    return str_replace(self::$INI_KEY_TO, self::$INI_KEY_FROM, $key);
  }

  /*!
   * Loads an ini file
   * @param $filename The filename to load
   * @param $sections Whether the file has sections
   * @return As parse_ini_file(name) except keys are decoded
   */
  public static function load($filename, $sections = true) {
    $options = parse_ini_file($filename, $sections);

    if ($sections) {
      foreach($options as $sectionName => &$section) {
        $thisSection = array();
        foreach($section as $key => $element) {
          $thisSection[self::decode($key)] = $element;
        }
        $section = $thisSection;
      }
    }
    else {
      $thisSection = array();
      foreach($section as $key => $element) {
        $thisSection[self::decode($key)] = $element;
      }
      $options = $thisSection;
    }
    return $options;
  }

  /*!
   * Write ini file
   * @param $assoc_arr The array of values
   * @param $path      The path to write the file to
   * @param $sections  True if the file should have sections
   * @return False under failure
   */
  function save($assoc_arr, $path, $sections = FALSE)
  {
    $content = "";
    if ($sections) {
        foreach ($assoc_arr as $key => $elem) {
            $content .= "[" . $key . "]\n";

            foreach ($elem as $key2 => $elem2) {
                $key2 = self::encode($key2);

                if (is_array($elem2)) {
                    for ($i = 0; $i < count($elem2); $i++) {
                        $content .= $key2 . "[] = \"" . $elem2[$i] . "\"\n";
                    }
                }
                else if ($elem2 == "") $content .= $key2 . " = \n";
                else $content .= $key2 . " = \"" . $elem2 . "\"\n";
            }
        }
    }
    else
    {
        foreach ($assoc_arr as $key => $elem) {
            $key = self::encode($key2);

            if (is_array($elem)) {
                for ($i = 0; $i < count($elem); $i++) {
                    $content .= $key . "[] = \"" . $elem[$i] . "\"\n";
                }
            }
            else if ($elem == "") $content .= $key . " = \n";
            else $content .= $key . " = \"" . $elem . "\"\n";
        }
    }

    if (!$handle = fopen($path, 'w')) return false;
    if (!fwrite($handle, $content)) return false;
    fclose($handle);
    return true;
}

};
?>
