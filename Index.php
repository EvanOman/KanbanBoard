<?php
session_start();

if (!isset($_SESSION["login"]) || !isset($_SESSION["password"])) {
    die(header("location: loginpage.php"));
}

session_write_close();
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>Eckhardt Optics Kanban Board</title>
        <link rel="icon" type="image/png" href="images/eckopIcon.png" />
        <link type="text/css" href="themes/black-tie/jquery-ui-1.8.21.custom.css" rel="stylesheet" />
        <link type="text/css" href="demos.css" rel="stylesheet" />
        <link type="text/css" href="menu_black.css" rel="stylesheet" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <script type="text/javascript" src="jquery-1.7.2.js"></script>
        <script type="text/javascript" src="jquery.ui.core.js"></script>
        <script type="text/javascript" src="jquery.ui.widget.js"></script>
        <script type="text/javascript" src="jquery.ui.mouse.js"></script>
        <script type="text/javascript" src="jquery.ui.sortable.js"></script>
        <script type="text/javascript" src="jquery.ui.button.js"></script>
        <script type="text/javascript" src="jquery.ui.draggable.js"></script>
        <script type="text/javascript" src="jquery.ui.position.js"></script>
        <script type="text/javascript" src="jquery.ui.resizable.js"></script>
        <script type="text/javascript" src="jquery.ui.dialog.js"></script>
        <script type="text/javascript" src="jquery.ui.datepicker.js"></script>
        <script type="text/javascript" src="jquery.ui.tabs.js"></script>    
        <script type="text/javascript" src="mbMenu.js"></script>
        <script type="text/javascript" src="jquery.metadata.js"></script>
        <script type="text/javascript" src="jquery.hoverIntent.js"></script>
        <script type="text/javascript" src="jquery.json-2.3.js"></script>
        <link rel="stylesheet" media="screen" type="text/css" href="css/colorpicker.css" />
        <script type="text/javascript" src="js/colorpicker.js"></script>
        <script type="text/javascript" src="jquery.tinysort.min.js"></script>
        <script type="text/javascript" src="Kanban.js"></script>
        <link type="text/css" href="index.css" rel="stylesheet" />

        <script type="text/javascript">  
            var timeOffset = "<?php echo date("O"); ?>"; 
            var userEmail =  "<?php echo $_SESSION["login"]; ?>";
        </script>
    </head>
    <body>
        <div id="dialogSort" class="ui-dialog-content ui-widget-content">
            <h1>Sort Criteria</h1>
            <div style="width: auto; float: left;">
                <select id="sortCriteriaSelect">
                    <option value="id">Bug ID</option>
                    <option value="summary">Summary</option>
                    <option value="prioSortKey">Priority</option>
                    <option value="last_change_time">Last Time Edited</option>
                    <option value="dayUntilDue">Deadline</option>                                     
                </select>
            </div>
            <div style="float: left; margin: 10px; margin-left: 5px;">
                <form>
                    <div id="sortRadioDiv">   
                        <span>
                            <label for="ascRadio">Ascending</label>
                            <input id="ascRadio" value="asc" type="radio" name="radio"/> 
                        </span>     
                        <span>
                            <label for="descRadio">Descending</label> 
                            <input id="descRadio" value="desc" type="radio" name="radio"/>  
                        </span>                 
                    </div>
                </form>
            </div>
        </div>  
        <div id="dialogOptions" class="ui-dialog-content ui-widget-content"  title="Options" >
            <div>
                <h2>
                    Priority Icon Assignments:
                </h2>
                <table id="prioIconTable">
                    <tbody>

                    </tbody>
                </table>
            </div>
            <div style="float:initial">
                <h2>
                    <br>Job Type Card Color Assignments:
                </h2>
                <table id="jobColorTable">
                    <tbody>

                    </tbody>
                </table>              
            </div>
            <div style="float: left;">
                <h2>
                    Set WIP Limits:
                </h2>
                <h1>
                    For each column you can add a specific WIP limit(0 means unlimited)
                </h1>
                <div >
                    <table id="WIPSetTable">
                        <tbody>

                        </tbody>
                    </table>
                </div>
            </div>
            <div style="float: left;">
                <h2>
                    Specify Special Columns:
                </h2>
                <h1>
                    Here you can specify what columns will be treated as "tab-lists". These columns will be much larger, have more in-depth filtering options, be hidden on board load, and will have no WIP limit.
                </h1>
                <div id="tablistSpecDiv">

                </div>
            </div>  
            <div style="float: left;">
                <h2>
                    Set Default Column Values:
                </h2>
                <h1>
                    In case a bug doesn't have a column selected, here you can specify what the default and allowed values should be based on the Status of that bug
                </h1>
                <div style="height:auto" id="defaultColumnDiv">

                </div>
            </div>     
            <div style="float: left;">
                <h2>
                    Specify Column Break Character:
                </h2>
                <h1>
                    Here you can specify what character will indicate a nested column break(Use a character that otherwise would never be found in a column title)
                </h1>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label>Special Character:</label>    
                            </td>
                            <td>
                                <input style="width: 25px;" type="text" id="columnCharText"/>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>     
            <div style="float: left;">
                <h2>
                    Board Card Filter:
                </h2>
                <h1>Specify which bugs you want to be displayed on the Kanban board</h1>
                <p>Add Filter by: 
                    <select  id="filterFieldOption"  class="text ui-widget-content ui-corner-all" >                       
                        <option value="all">All</option>                                                                
                    </select>
                    <button id="addFilterOption">Add Filter</button>
                    <button id="removeFilterOption">Remove Filter</button>
                </p>               
                <form style="height:auto;">
                    <fieldset style="margin-top: 10px;">                        
                        <div id="optFilterDiv"style="float: left; width:100%">
                            <div  class="box" >
                                <label class="searchLabel">Product</label>
                                <select  name="product" id="optProduct" class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label class="searchLabel" >Version</label>
                                <select  name="version" id="optVersion" class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label class="searchLabel" >Component</label>
                                <select  name="component" id="optComponent" class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>                           
                        </div>                        
                    </fieldset>                    
                </form>
            </div>            
            <div class="modal"><div class="loadingLabel">Options Loading</div></div>
        </div>          
        <div id="dialogInvalid" class="ui-dialog-content ui-widget-content"  title="Invalid" >
            <p>Must Specify the Card's Title!!!</p>
        </div>
        <div id="dialogNoResults" class="ui-dialog-content ui-widget-content"  title="No Results" >
            <p>Your criteria doesn't match any bugs in the system</p>
        </div>
        <div id="dialogAddEditCard" class="ui-dialog-content ui-widget-content"  title="Edit" >

            <div id="edit-tabs" class="ui-tabs ui-widget ui-widget-content ui-corner-all">
                <ul>
                    <li><a href="#Details">Details</a></li>
                    <li><a href="#Attachments">Attachments</a></li>
                </ul>
                <div id="Details" style="height: 500px;">
                    <fieldset>
                        <div id="detailsTop" style="max-height: 80px;">
                            <label for="summary">Title:</label>
                            <textarea  name="summary" id="summary" class="text ui-widget-content ui-corner-all" style="width:100%; height: 40px; max-height: 60px;"  ></textarea>
                        </div>
                        <div id="detailsLeft"style="float: left;">
                            <div style="width: 100%; margin: 5px;">
                                <label for="product">Product:</label>
                                <select  name="product" id="product"  class="text ui-widget-content ui-corner-all" ></select>
                            </div>
                            <div style="width: 100%; margin: 5px;">
                                <label for="component">Component:</label>
                                <select  name="component" id="component"  class="text ui-widget-content ui-corner-all" ></select>
                            </div>                          
                            <div style=" width:135px; margin: 5px; float:left;">
                                <label for="version">version</label>
                                <select  name="version" id="version"  class=" text ui-widget-content ui-corner-all">    </select>
                            </div>                                                   
                        </div>
                        <div id="detailsRight">
                            <label for="Comments">Comments:</label>
                            <div id="Comments" class="ui-widget-content ui-corner-all">
                                <div id ="accordion" class="ui-accordion ui-widget ui-helper-reset ui-accordion-icons"> </div>  
                                <div class="modal"><div class="loadingLabel">Loading Comments</div></div>
                            </div>
                        </div>                            
                    </fieldset>
                    <div class="modal"><div class="loadingLabel">Loading Fields</div></div>
                </div>               
                <div id="Attachments">

                    <div id="attTableDiv"  class="ui-widget-content ui-corner-all">
                        <table id="attachmentTable" class="ui-widget ui-widget-content">
                            <thead>
                                <tr class="ui-widget-header ">
                                    <th>
                                        Attachments
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>                       
                        </table>
                        <div class="modal"><div class="loadingLabel">Loading Attachments</div></div>
                    </div>

                    <form  action="ajax_UploadAttachment.php" method="post" enctype="multipart/form-data" target="upload_target">
                        <div id="addAttTableDiv">
                            <table id="attachmentAddTable" class="ui-widget ui-widget-content ui-corner-all">
                                <thead>
                                    <tr class="ui-widget-header ">
                                        <th colspan="2">
                                            Add Attachment
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <label for="attachmentFileName">File:</label>
                                        </td>
                                        <td>
                                            <input id="attachmentFileName" name="file_name" type="file"/>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <label for="attachmentDescription">Description:</label>
                                        </td>
                                        <td>
                                            <input name="summary" class="text ui-widget-content ui-corner-all"style="width: 300px;" id="attachmentDescription"type="text"/>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <label  for="attachmentIsPatch">Is Patch:</label>
                                        </td>
                                        <td>
                                            <input style="width : 20px; margin:0;"name="is_patch" class="text ui-widget-content ui-corner-all" id="attachmentIsPatch"type="checkbox"/>
                                        </td>
                                    </tr>                               
                                    <tr>
                                        <td>
                                            <label for="attachmentComment">Bug Comment:</label>
                                        </td>
                                        <td>
                                            <textarea name="comment" style="width: 300px; height: 100px;" class="text ui-widget-content ui-corner-all" id="attachmentComment"></textarea>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <input type="hidden" name="ids" id="attachmentBugId" value=""/>
                                        </td>
                                        <td>
                                            <input style="float:right;"  type="submit" value="Submit"id="btnAttachmentSubmit"/>
                                        </td>
                                    </tr>
                                </tbody>                     
                            </table>
                            <div class="modal"><div class="loadingLabel">Uploading Attachment</div></div> 
                        </div>                        
                    </form>                    
                    <div style="clear: both;"></div>                  
                </div>
            </div>
        </div>   
        <div id="dialogSearch" class="ui-dialog-content ui-widget-content"  title="Advanced Search" >
            <div id="search">
                <div class="box"style="max-height: 40px; width: auto;">
                    <label for="summary" style="float:left; margin-right: 10px;">Summary:</label>
                    <textarea  name="summary" id="searchSummary" class="text ui-widget-content ui-corner-all"></textarea>
                </div>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                Search by:
                            </td>
                            <td>
                                <select  id="searchFieldOption"  class="text ui-widget-content ui-corner-all" >                       
                                    <option value="all">All</option>                                                                
                                </select>
                            </td>
                            <td>
                                <button id="addSearchField">Add Field</button>
                                <button id="removeSearchField">Remove Field</button>
                            </td>                            
                        </tr>
                    </tbody>
                </table>        
                <div id="searchFieldsDiv">
                    <div class="box">
                        <label for="product"class="searchLabel" name="product">Product</label>
                        <select  name="product" id="searchProduct"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                    </div>
                    <div class="box">
                        <label for="version"class="searchLabel" name="version">Version</label>
                        <select  name="version" id="searchVersion"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                    </div>
                    <div class="box">
                        <label class="searchLabel" >Component</label>
                        <select  name="component" id="optComponent" class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                    </div>

                </div>                     
                <span>
                    <button id="searchSubmit" >Search</button>
                </span>                                   
                <div id="Results" class="ui-widget">                 
                    <div id="bugs-contain" class="ui-widget" >
                        <h1>Bugs:</h1><div id="pageNumDiv"></div>
                        <table id="bugs" class="ui-widget ui-widget-content" cellspacing="0" cellpadding="4" width="100%">
                            <thead>
                                <tr class="ui-widget-header ">
                                    <th colspan="1">ID</th> 
                                    <th colspan="1">Product</th> 
                                    <th colspan="1">Version</th> 
                                    <th colspan="1">Assignee</th> 
                                    <th colspan="1">Status</th>  
                                    <th colspan="1">Resolution</th> 
                                    <th colspan="1">Summary</th> 
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                        </table>  
                        <div class="modal"><div class="loadingLabel">Loading Results</div></div> 
                        <p></p>
                    </div>

                </div>                
            </div>
            <div class="modal"><div class="loadingLabel">Loading Fields</div></div>
        </div>
        <div class="columnContainer">          
            <div class="toolbar">  
                <label for="quickSearchTextBox" >Quick Search</label>
                <input id="quickSearchTextBox" type="text" class="ui-widget-content ui-corner-all"/>
                <label for="quickSearchField" >by:</label>
                <select id="quickSearchField" class="text ui-widget-content ui-corner-all">
                    <option value="product">Product</option>
                    <option value="priority">Priority</option>
                    <option value="creator">Creator</option>
                    <option value="keywords">Keywords</option>
                    <option value="see_also">See Also</option>
                    <option value="id">Bug ID</option>
                    <option value="resolution">Resolution</option>
                    <option value="op_sys">Operating System</option>
                    <option value="status">Status</option>
                    <option value="summary">Summary</option>
                    <option value="severity">Severity</option>
                    <option value="version">Version</option>
                    <option value="deadline">Deadline</option>
                    <option value="component">Component</option>                    
                </select>               
                <button id="btnAddCard" >Add Card</button>
                <button id="btnSearchCard" >Advanced Search</button>
                <button id="btnOptions">Options</button>
                <button id="btnLogout">Log out</button>
            </div>           
        </div>
        <div class="mbmenu" id="contextMenuCard">
            <a action="editView(0)">View Card Details</a>
            <a action="editView(1)">View Card Attachments</a>
            <a rel="separator"> </a>
            <a class="{menu:'moveCardTo'}">Move Card to</a>
            <a class="{menu:'setPriority'}">Set Priority</a>
            <a rel="separator"> </a>
        </div>
        <div id="moveCardTo" class="mbmenu">
        </div>
        <div id="moveAllCards" class="mbmenu">
        </div>
        <div id="setPriority" class="mbmenu">
        </div>       
        <div class="mbmenu" id="contextMenuColumn">            
            <a class="{menu:'moveAllCards'}">Move All Cards to</a>
            <a rel="separator"> </a>
            <a action="addCardToCol()">Add Card</a>
            <a rel="separator"> </a>
            <a action="sortContextHelper()">Sort Column</a>
            <a action="filterContextHelper()">Filter Column</a>
        </div> 
        <iframe id="secretIFrame" src="" style="display:none; visibility:hidden;"></iframe>
        <iframe id="upload_target" name="upload_target" src="blank.php" style=" display:none; visibility:hidden;"></iframe>   
        <div class="modal"><div>Board Loading</div></div>
    </body>
</html>

