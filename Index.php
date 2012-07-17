<?php
session_start();

if (!isset($_SESSION["login"]) || !isset($_SESSION["password"])) {
    die(header("location: loginpage.php"));
}

session_write_close();
?>

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en-US" lang="en-US">
    <head>
        <title>Eckhardt Optics Kanban Board</title>
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
            //I have to include this function here because it contains a php reference
            function getGreenwhichTime()
            {
                return <?php echo date("O"); ?>;
            }       
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
                    Set Default Column Values:
                </h2>
                <h1>
                    In case a bug doesn't have a column selected, here you can specify what the default value should be based on the Status of that Bug
                </h1>
                <div style="height:auto">
                    <table id="defaultColumntable">
                        <tbody>

                        </tbody>
                    </table>
                </div>
            </div>
            <div style="float: left;">
                <h2>
                    <br>Board Card Filter:
                </h2>
                <h1>Specify which bugs you want to be displayed on the Kanban board</h1>
                <p>Add Filter by: 
                    <select  id="filterFieldOption"  class="text ui-widget-content ui-corner-all" >
                        <option value="optProduct">Product</option>
                        <option value="optVersion">Version</option>
                        <option value="optBug_severity">Severity</option>
                        <option value="optBug_status">Status</option>
                        <option value="optResolution">Resolution</option>
                        <option value="optPriority">Priority</option>
                        <option value="all">All</option>

                    </select>
                    <button id="addFilterOption">Add Filter</button>
                    <button id="removeFilterOption">Remove Filter</button>
                </p>               
                <form style="height:300px;">
                    <fieldset style="margin-top: 10px;">                        
                        <div style="float: left; width:100%">
                            <div  class="box" >
                                <label for="product"class="searchLabel" name="product">Product</label>
                                <select  name="product" id="optProduct"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="version"class="searchLabel" name="version">Version</label>
                                <select  name="version" id="optVersion"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="bug_severity"class="searchLabel" name="severity">Severity</label>
                                <select  name="bug_severity" id="optBug_severity"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>                           
                            <div class="box">
                                <label for="bug_status"class="searchLabel" name="status">Status</label>
                                <select  name="bug_status" id="optBug_status"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box" style="display: none;">
                                <label for="resolution"class="searchLabel" name="resolution">Resolution</label>
                                <select  name="resolution" id="optResolution"  class=" text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box" style="display: none;">
                                <label for="priority"class="searchLabel" name="priority">Priority</label>
                                <select  name="priority" id="optPriority"  class=" text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                        </div>                        
                    </fieldset>                    
                </form>
            </div>            
            <div class="modal"><div class="loadingLabel">Options Loading</div></div>
        </div>  
        <div id="dialogLogin" class="ui-dialog-content ui-widget-content"  title="Login" >
            <form>
                <fieldset
                    <div style="float: top">
                        <div style="float: top;">
                            <label for="login">User Name</label>
                            <textarea  name="login" id="login"  class="text ui-widget-content ui-corner-all" style="width: 100%;">    </textarea>
                        </div>
                        <div style="float: top;">
                            <label for="password">Password</label>
                            <textarea  name="password" id="password"  class="text ui-widget-content ui-corner-all" style="width: 100%;">    </textarea>
                        </div>
                </fieldset>
            </form>
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
                        <div id="detailsTop" style="float:top; max-height: 80px;">
                            <label for="summary">Title:</label>
                            <textarea  name="summary" id="summary" class="text ui-widget-content ui-corner-all" style="width:990px; height: 40px; max-height: 60px;"  ></textarea>
                        </div>
                        <div id="detailsLeft"style="float: left;">
                            <label for="product">Product:</label>
                            <select  name="product" id="product"  class="text ui-widget-content ui-corner-all" ></select>
                            <label for="component">Component:</label>
                            <select  name="component" id="component"  class="text ui-widget-content ui-corner-all" ></select>
                            <div style="float: top">
                                <div style="float: left;">
                                    <label for="version">version</label>
                                    <select  name="version" id="version"  class=" text ui-widget-content ui-corner-all" style=" width:135px !important; ">    </select>
                                </div>
                                <div style="float: left; margin-left: 10px;">
                                    <label for="bug_severity">Severity:</label>
                                    <select  name="bug_severity" id="bug_severity"  class=" text ui-widget-content ui-corner-all" style=" width:135px !important; "></select>
                                </div>
                            </div>
                            <div style="float: top">
                                <div style="float: left;">
                                    <label for="bug_status">Status:</label>
                                    <select  name="bug_status" id="bug_status"  class="text ui-widget-content ui-corner-all"style=" width:135px !important; " ></select>
                                </div>
                                <div style="float: left; margin-left: 10px;">
                                    <label for="user">Assigned User:</label>
                                    <select  name="user" id="user"  class="text ui-widget-content ui-corner-all" style=" width:135px !important; ">   
                                        <option></option>
                                        <option>User 1</option>
                                        <option>User 2</option>
                                        <option>User 3</option>
                                        <option>User 4</option>
                                    </select>
                                </div>
                            </div>
                            <div style="float: top">
                                <div style="float: left; width: ">
                                    <label for="priority">Priority:</label>
                                    <select  name="priority" id="priority"  class="text ui-widget-content ui-corner-all" style=" width:135px !important; ">    </select>
                                </div>
                                <div style="float: left; margin-left: 10px;">
                                    <label for="deadline">Deadline:</label>
                                    <input type="text" name="deadline" id="deadline" class="Dates text ui-widget-content ui-corner-all" style=" width:135px !important; "/>
                                </div>
                            </div>
                            <div style="float: top">
                                <div style="float: left;">
                                    <label for="op_sys">Operating System</label>
                                    <select  name="op_sys" id="op_sys"  class="text ui-widget-content ui-corner-all" style=" width:135px !important; ">    </select>
                                </div>
                                <div style="float: left; margin-left: 10px;">
                                    <label for="rep_platform">Hardware</label>
                                    <select  name="rep_platform" id="rep_platform"  class="text ui-widget-content ui-corner-all" style=" width:135px !important; ">    </select>
                                </div>
                            </div>
                            <div style="float: left;">
                                <div style="float: left; ">
                                    <label for="cf_whichcolumn">Into Column:</label>
                                    <select  name="cf_whichcolumn" id="cf_whichcolumn"  class="text ui-widget-content ui-corner-all" style=" width:135px !important;">                               
                                    </select>
                                </div>
                                <div style="float: left; margin-left: 10px; display: none;">
                                    <label for="resolution">Resolution:</label>
                                    <select  name="resolution" id="resolution"  class=" text ui-widget-content ui-corner-all" style=" width:135px !important;"></select>
                                </div>
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
                <form style="height:300px;">
                    <fieldset style="margin-top: 10px;">
                        <div class="box"style="float:top; max-height: 40px; width:830px;">
                            <label for="summary" style="float:left; margin-right: 10px;">Summary:</label>
                            <textarea  name="summary" id="searchSummary" class="text ui-widget-content ui-corner-all"></textarea>
                        </div>
                        <div style="float: left; width:100%">
                            <div class="box">
                                <label for="product"class="searchLabel" name="product">Product</label>
                                <select  name="product" id="searchProduct"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="version"class="searchLabel" name="version">Version</label>
                                <select  name="version" id="searchVersion"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="bug_severity"class="searchLabel" name="severity">Severity</label>
                                <select  name="bug_severity" id="searchBug_severity"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="priority"class="searchLabel" name="priority">Priority</label>
                                <select  name="priority" id="searchPriority"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="bug_status"class="searchLabel" name="status">Status</label>
                                <select  name="bug_status" id="searchBug_status"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="resolution"class="searchLabel" name="resolution">Resolution</label>
                                <select  name="resolution" id="searchResolution"  class=" text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                        </div>                        
                    </fieldset>                    
                </form>
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
        <div class="tablistsCon cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="bigBanners">Backlog</span>
            <ul id="Backlog"class="tablists"></ul>                                    
        </div>
        <div class="tablistsCon cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="bigBanners">Archive</span>
            <ul id="Archive"class="tablists"></ul>                                    
        </div>
        <div class="tablistsCon cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="bigBanners">Limbo</span>
            <ul id="Limbo"class="tablists"></ul>                                    
        </div>
        <div class="toolbar">  
            <label for="quickSearchTextBox" >Quick Search</label>
            <input id="quickSearchTextBox" type="text" class="text ui-widget-content ui-corner-all"/>
            <button class="btnTab">Backlog</button>
            <button class="btnTab">Archive</button>
            <button class="btnTab">Limbo</button>
            <button id="btnAddCard" >Add Card</button>
            <button id="btnSearchCard" >Advanced Search</button>
            <button id="btnOptions">Options</button>
            <button id="btnLogout">Log out</button>
        </div>
        <div class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="banners">Ready</span>
            <ul id="Ready"class="column"></ul>                                    
        </div>

        <div class="dubColumn cmVoice {cMenu: 'contextMenuColumn'}" >
            <span class="dubBanners">Development</span>
            <div  class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
                <span class="banners">Doing</span>
                <ul id="DevDoing" class="column"></ul>
            </div>
            <div class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
                <span class="banners">Done</span>
                <ul id="DevDone" class="column"></ul>
            </div>
        </div>

        <div id="Build" class="dubColumn cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="dubBanners">Build</span>
            <div class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
                <span class="banners">Doing</span>
                <ul id="BuildDoing" class="column"></ul>
            </div>
            <div class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
                <span class="banners">Done</span>
                <ul id="BuildDone" class="column"> </ul>
            </div>
        </div>
        <div class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="banners">Test</span>
            <ul id="Test" class="column" > </ul>            
        </div>
        <div class="columnCon cmVoice {cMenu: 'contextMenuColumn'}">
            <span class="banners">Ready for Release</span>
            <ul id="ReadyforRelease" class="column"> </ul>
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
        </div> 
        <iframe id="secretIFrame" src="" style="display:none; visibility:hidden;"></iframe>
        <iframe id="upload_target" name="upload_target" src="blank.php" style=" display:none; visibility:hidden;"></iframe>   
        <div class="modal"><div>Board Loading</div></div>
    </body>
</html>

