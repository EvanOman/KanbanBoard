<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en-US" lang="en-US">
    <head>
        <title>Eckhardt Optics Kanban Board</title>
        <link type="text/css" href="jquery-ui-1.8.20.custom.css" rel="stylesheet" />
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
        <script type="text/javascript" src="jquery.ui.accordion.js"></script>        
        <script type="text/javascript" src="mbMenu.js"></script>
        <script type="text/javascript" src="jquery.metadata.js"></script>
        <script type="text/javascript" src="jquery.hoverIntent.js"></script>
        <script type="text/javascript" src="jquery.json-2.3.js"></script>
        <script type="text/javascript" src="tablesorter/jquery.tablesorter.js"></script>
        <script type="text/javascript" src="tiny_mce/tiny_mce.js"></script>
        <script type="text/javascript" src="tablesorter/addons/pager/jquery.tablesorter.pager.js"></script>
        <link type="text/css" href="tablesorter/themes/blue/style.css" rel="stylesheet" />
        <link type="text/css" href="index.css" rel="stylesheet" />


        <script type="text/javascript">
            var prioMap = {};
            
            function initialize()
            {
                $.ajax({
                    url: "ajax_get_options.php",
                    dataType: "json",                    
                    success: function(data, status){                                                
                        if (data.error)
                        {
                            alert(data.error);
                        }
                        else if (!data.success)
                        {
                            alert("Something is wrong");
                        }
                        else 
                        {  
                            prioMap = data.options.prioIcons;
                        }
                        
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("There was an error:" + textStatus);
                    }
                });
            }
            initialize();
            $(document).ready(function() {
                
                //Enables the sortable behavior that allows the reordering of the cards
                $( ".column,.tablists" ).sortable({
                    connectWith: ".column,.tablists",
                    placeholder: "ui-state-highlight",
                    forcePlaceholderSize: true,
                    tolerance: 'pointer',
                    cursorAt: { top: 15 }
                }).disableSelection();
                
                //Initially diables the sorting of tabbed items
                $(".tablists").sortable("disable");
                
                //Prevents the banners from being selctable or sortable
                $(".column, .tablists").sortable({
                    cancel:".banners, .bigBanners",
                    items: "li:not(.banners, .bigBanners)"
                });
                
                
                //Method that opens, closes, and switches the tabs appropriately
                function handleTabLists(tablist){
                    
                    if ($(tablist).is(":visible"))
                        $(tablist).hide(1000).sortable( "disable" ); 
                    else
                    {
                        $(".tablists").each(function(){
                            if ($(this).is(":visible"))
                                $(this).hide().sortable( "disable" );
                        });
                        $(tablist).show().sortable( "enable" );
                    }
                }
                
                function closeContextMenu(){
                    $.fn.removeMbMenu($.mbMenu.options.actualMenuOpener);
                }
                
                //Handles the tab buttons dynamically
                $(".toolbar .btnTab").click(function(){
                    var tab =  $(this).html();
                   
                    handleTabLists("#"+tab);
                });
                

                //Handles the add card button
                $("#btnAddCard").click(function(){
                    addCard();
                }); 
                $("#btnSearchCard").click(function(){
                    getCompsVers(null, "search");
                    $("#dialogSearch ").dialog("open");
                });
                $("#btnOptions").click(function(){
                    $("#dialogOptions ").dialog("open");
                });               
                    
                //Pulls up the edit menu whenever a card is double clicked                       
                $(".card").live( "dblclick", function () { 
                    $( "#edit-tabs" ).tabs("select", 0);
                    editCard($(this).attr("id"));
                });

                
                //Sets up the invalids entry dialog menu
                $( "#dialogInvalid" ).dialog({
                    autoOpen: false,
                    show: "blind",
                    hide: "explode",                    
                    modal: true,
                    buttons: {
                        Cancel: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
                
                
                //Sets up the invalids entry dialog menu
                $( "#dialogNoResults" ).dialog({
                    autoOpen: false,
                    show: "blind",
                    hide: "explode",
                    show: "blind",
                    hide: "explode",                    
                    modal: true,
                    buttons: {
                        Close: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
                
                //Sets up the invalids entry dialog menu
                $( "#dialogLogin" ).dialog({
                    autoOpen: false,
                    show: "blind",
                    hide: "explode",
                    show: "blind",
                    hide: "explode",
                    
                    modal: true,
                    buttons: {
                        Login:  function(){
                            var login = $("#login").val().replace(/\s+/g, '');
                            var password = $("#password").val().replace(/\s+/g, '');
                            $.ajax({
                                async: false,
                                url: "ajax_POST.php",
                                type: "POST",
                                dataType: "json",
                                data: {                                     
                                    "method": "User.login",
                                    "login":  login,
                                    "password":  password
                                },
                            
                                success: function(data, status){
                                    if (data.result.faultString != null)
                                    {
                                        alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                                    }
                                    else if (!data.result)
                                    {
                                        alert("Something is wrong");
                                    }
                                    else 
                                    {
                                        alert("Login successful")
                                    }
                                    
                                    //Allows sortable behavior for the search results table
                                    $("#bugs").trigger("update");                                     
                                },
                                error: function(jqXHR, textStatus, errorThrown){
                                    alert("There was an error:" + textStatus);
                                }
                            })
                        },
                        Close: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
                
                
                                
                //Creates the options dialog
                $( "#dialogOptions" ).dialog({
                    autoOpen: false,
                    resizable: false,
                    height: 300,
                    width: 400,
                    show: { effect: 'blind'},
                    hide: "explode",
                    modal: true,
                    buttons: {
                        //TODO Needs to take in offset and limit parameters
                        Save: function() {
                            $("#dialogOptions #prioIconTable tbody tr").each(function(){
                                var name = $(this).find("td").first().text();
                                if ($(this).find("input[type=radio]:checked").length == 0)
                                    {
                                       var iconClass = "none"; 
                                    }
                                    else
                                    {
                                       iconClass = $(this).find("input[type=radio]:checked").val(); 
                                    }
                                
                                prioMap[name] = iconClass;
                            });
                            $.ajax({
                                    url: "ajax_write_options.php",
                                    type: "POST",
                                    data: {
                                        map: prioMap                                       
                                    },    
                                    dataType: "json",
                                    
                                    success: function(data, status){
                                        
                                        
                                        if (data.error)
                                        {
                                            alert(data.error);
                                        }
                                        else if (!data.success)
                                        {
                                            alert("Something is wrong");
                                        }
                                        else 
                                        {
                                            
                                            $(".card").each(function(){
                                                var prio = $(this).data("priority").replace(/\s+/g, ''); 
                                                if (prioMap[prio]=="none")
                                                {
                                                    $(".iconBar .prioBack .prioIcon", $(this)).removeClass().addClass("prioIcon");
                                                }
                                                else
                                                {
                                                    $(".iconBar .prioBack .prioIcon", $(this)).removeClass().addClass("prioIcon "+prioMap[prio]);
                                                }

                                            });
                                            
                                          $("#dialogOptions").dialog("close");                                            
                                        }
                                       
                                    },
                                    error: function(jqXHR, textStatus, errorThrown){
                                        alert("(Fields)There was an error:" + textStatus);
                                    }
                                }); 
                        },                    
                        //Resets all the feilds to null to allow a fresh dialog window each time
                        Close: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
                
                function makeRowPrioOptions(prioName){
                    var row = $('<tr>\
                        <td>'+prioName+'</td>\
                        <td><form><div id="'+prioName+'radiodiv">\
                                <input type="radio" id="'+prioName+'icon1" name="radio" value="High" />\
                                <label for="'+prioName+'icon1">\
                                    <div class="prioBack">\
                                        <div class="prioIcon High">\
                                        </div>\
                                    </div>\
                                </label>\
                                <input type="radio" id="'+prioName+'icon2" name="radio" value="Critical"/>\
                                <label for="'+prioName+'icon2">\
                                    <div class="prioBack">\
                                        <div class="prioIcon Critical">\
                                        </div>\
                                    </div>\
                                </label>\
                                <input type="radio" id="'+prioName+'icon3" name="radio" value="Low"/>\
                                <label for="'+prioName+'icon3">\
                                    <div class="prioBack">\
                                        <div class="prioIcon Low">\
                                        </div>\
                                    </div>\
                                </label>\
                                <input type="radio" id="'+prioName+'icon4" name="radio" value="none"/>\
                                <label for="'+prioName+'icon4">\
                                    <div class="prioBack">\
                                        <div class="prioIcon">\
                                            No Icon\
                                        </div>\
                                    </div>\
                                </label>\
                            </div></form>\
                        </td>\
                    </tr>');
                    $(row).find("input[type=radio][value="+prioMap[prioName]+"]").attr("checked","checked");
                    $("#dialogOptions #prioIconTable tbody").append(row);
                    
                    $("#"+prioName+"radiodiv").buttonset();
                    
                    
                }
                
                //Creates the search dialog box
                $( "#dialogSearch" ).dialog({
                    autoOpen: false,
                    resizable: false,
                    height: 800,
                    width: 1400,
                    show: { effect: 'blind', complete: function() { $("#searchSummary").focus();}},
                    hide: "explode",
                    modal: true,
                    buttons: {
                        //TODO Needs to take in offset and limit parameters
                        Search: function() {
                            advSearchResults = [];
                            ajaxSearch(10,0)
                        },                    
                        //Resets all the feilds to null to allow a fresh dialog window each time
                        Close: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
                
                //Creates the edit dialog box
                $( "#dialogAddEditCard" ).dialog({
                    autoOpen: false,
                    minHeight: 650,
                    minWidth: 1060,
                    /*height: 560,
                    width: 1060,*/
                    show: { effect: 'highlight', complete: function() { $("#title").focus();}},
                    hide: "explode",
                    modal: true,
                    buttons: {
                        "Save Card": function() {
                            
                           
                            $( this ).dialog( "close" );
                                                                                
                        },
                        Cancel: function() {
                            $( this ).dialog( "close" );
                        }    
                    },
                    
                    //Resets all the feilds to null to allow a fresh dialog window each time
                    close: function() {
                        $("#Details input, #Details textarea, #Details select").val("");
                    }
                    
                });
                
                
                //Allows calendar plugin
                $( ".Dates" ).datepicker({ dateFormat: "yy-mm-dd" }); 
                
                //Allows the tabs on the edit dialog
                $( "#edit-tabs" ).tabs();                                
                
              
                //Initializes the board's column context menu
                $(document).buildContextualMenu(
                {
                    menuWidth:200,
                    overflow:2,
                    menuSelector: ".menuContainer",
                    iconPath:"ico/",
                    hasImages:false,                    
                    closeOnMouseOut: true,
                    fadeInTime:200,

                    fadeOutTime:100,

                    adjustLeft:0,
                    adjustTop:0,
                    opacity:.99,
                    shadow:true,
                    onContextualMenu:function(o,e){}

                });
                
                //Populates the context menu and add card menu with the correct columns:
                $("body .tablists, body .column").each(function(){
                    var col = $(this).attr("id");
                    
                    var anc = $("<a>").html(col);
                    var option = $("<option>").html(col);
                    
                    //append the option to the context menu
                    $("#moveAllCards, #moveCardTo").append(anc);
                    
                    //append the option to the <select>
                    $("#Details #cf_whichcolumn").append(option);
                });
                
                
                //Handles the moveallCards submenu 
                $("#moveAllCards a").click( function(){
                    //Finds and saves the column that was right clicked
                    var startCol = $($.mbMenu.lastContextMenuEl).attr("id");                
                    var endCol = $(this).html();
                    
                    if (startCol != endCol)
                    {
                        //Cycles through each card in the specified column and moves them into the ending column
                        var colArr = [];
                        $("#"+startCol+" .card").each(function(){
                        
                            var newLi = $('<li></li>').append(this);
                            $("#"+endCol).append(newLi); 
                            var cardId = $(this).attr("id");
                            colArr.push(cardId);
                        
                        });
                        updatePosition(endCol, colArr);
                    
                        //Previously the moveall method moved the cards but left all of the <li>s behind. This removes those(except the first: The banner)
                        $("#"+startCol+" li:not(:first-child)").remove();
                    }
                    
                    closeContextMenu(); 
                });
                
                
                //Handles the moveCardTo submenu moveCardTo
                $("#moveCardTo a").click(  function(){
                    var card = $($.mbMenu.lastContextMenuEl).parent();
                    var newLi = $('<li></li>').append(card);
                    var column = $(this).html();
                    
                    $("#"+column).append(newLi);
                    var cardId = $($.mbMenu.lastContextMenuEl).attr("id");
                    
                    updatePosition(column, cardId);
                                       
                    closeContextMenu(); 
                });
                
                
                //Handles the edit dialog background color change based off of user selection
                $("#bug_severity").change(function () {
                    var job = $(this).val();
                    
                    dialogDisplay(job);
                });
                
                //Populates the components field based off of the selected product
                $("#product").change(function () {
                
                    var name = [$(this).val()];
                    
                    getCompsVers(name, "Details");
                
                });
                
                
                //Populates the components field of the search menu based off of the selected product
                //TODO If I drag to select certain values and release the click outside the select area, the versions arent updated. Need work around(tried click, live, bind)
                //Also note that the actual .val() after ending a drag outside of the box is correct which is indicative of a failure to call getCompsVers below
                $("#searchProduct").change(function () {
                    //Grabs the selected values
                    var name = $(this).val();                
                    getCompsVers(name, "search");
                
                });
                                            
                //Updates the cards position whenever it is moved
                $( ".column, .tablists" ).sortable({
                    receive: function(event, ui) { 
                        
                        var col = $(this).attr("id");
                        updatePosition1(col);
                    }
                });
                
                
                
                //Initializes the TinyMCE Richtext editior
                tinyMCE.init({
                    // General options
                    mode : "exact",
                    elements: "comments, description",
                    theme : "advanced",
                    plugins : "pagebreak,style,layer,table,save,advhr,advimage,advlink,emotions,iespell,inlinepopups,insertdatetime,preview,media,searchreplace,print,contextmenu,paste,directionality,fullscreen,noneditable,visualchars,nonbreaking,xhtmlxtras,template",
                    height : "380", //For some reason 480 used to work...


                    // Theme options
                    theme_advanced_buttons1 : "save,newdocument,|,bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,styleselect,formatselect,fontselect,fontsizeselect",
                    theme_advanced_buttons2 : "cut,copy,paste,pastetext,pasteword,|,search,replace,|,bullist,numlist,|,outdent,indent,blockquote,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code,|,insertdate,inserttime,preview,|,forecolor,backcolor",
                    theme_advanced_toolbar_location : "top",
                    theme_advanced_toolbar_align : "left",
                    theme_advanced_statusbar: "bottom",
                    theme_advanced_resizing : true,

                    // Example content CSS (should be your site CSS)
                    content_css : "index.css",

                    // Drop lists for link/image/media/template dialogs
                    template_external_list_url : "js/template_list.js",
                    external_link_list_url : "js/link_list.js",
                    external_image_list_url : "js/image_list.js",
                    media_external_list_url : "js/media_list.js"

                    
                });
                

                
                
                
                //setup the dialog with the proper field values for the bug_severity dropdown
                //Evan, go ahead and do the same for other dropdowns.  You might be able to find a way to get
                //MULTIPLE fields in one ajax call;  make an array out of the names field.
                //then parse the results --> handle each field's values
                //Hint: you'll have to wrap a foreach(to handle fields) around the foreach(to handle field's values) that I wrote.
                //And then also find some way to associate their field's name with this page's select dropdowns. (id or name maybe?)
                //also, note, I put this in the document.ready so that I'd be sure that the dialog code exists before I try to modify it.
                //The Array of fields that we want to find values for
                var formFields = ["priority","bug_severity", "bug_status", "resolution", "cf_whichcolumn", "rep_platform", "op_sys"];
            
                //A single Ajax call that finds all the specified field option values                
                $.ajax({
                    url: "ajax_POST.php",
                    //async: false,
                    type: "POST",
                    data: {
                        "method": "Bug.fields",
                        "names": formFields
                    },    
                    dataType: "json",
                    
                    success: function(data, status){
                        
                      
                        if (data.result.faultString != null)
                        {
                            alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                        }
                        else if (!data.result)
                        {
                            alert("Something is wrong");
                        }
                        else 
                        {
                            for (var j in data.result.fields)
                            {
                                var fieldName = data.result.fields[j].name;                                
                                
                                //remove all <option>s from the specified select
                                $("#Details select[name="+fieldName+"]").empty();
                                
                                //Priority has a context menue that needs to be populated as well
                                if (fieldName == "priority")
                                {
                                    //Populates the priority context menu as well
                                    for (var i in data.result.fields[j].values) 
                                    {    
                                        //get the value
                                        var name = data.result.fields[j].values[i].name;
                                        var value = data.result.fields[j].values[i].sortkey;
                                        //create an option element with a value and the inner html being the name
                                        var a = $("<a>").html(name).attr({"value":value}).addClass("p");
                                                                                
                                        //append the option to the context menu
                                        $("#setPriority").append(a);
                                        
                                        makeRowPrioOptions(name);
                                    }  
                                }
                               
                                
                                //iterate through all the allowed values for this field
                                for (var i in data.result.fields[j].values) 
                                {    
                                    //get the value
                                    var name = data.result.fields[j].values[i].name;
                                   
                                    //create an option element with a value and the inner html being the name
                                    var option = $("<option>").val(name).html(name);

                                    //append the option to the <select>
                                    $("#Details select[name="+fieldName+"], #search select[name="+fieldName+"]").append(option);
                                }
                            }
                        }
                        console.log(prioMap);
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("(Fields)There was an error:" + textStatus);
                    }
                }); 

                
                
                //An Ajax call that finds all accessible product ids. 
                $.ajax({
                    url: "ajax_POST.php",
                    type: "POST",  
                    data:{
                        "method": "Product.get_accessible_products"
                    },
                    dataType: "json",
                    success: function(data){
                        
                        if (data.result.faultString != null)
                        {
                            alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                        }
                        else if (!data.result)
                        {
                            alert("Something is wrong");
                        }
                        
                        var productIds = data.result.ids;
                        getNames(productIds);
                        
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("There was an error:" + textStatus);
                    }
                });
                
                //A function that finds the name associated with each each id that is passed in. Very slow, consider revision
                function getNames(productIds){
                    $.ajax({
                        url: "ajax_POST.php",
                        type: "POST",  
                        data:{
                            "method": "Product.get",
                            "ids": productIds
                        },
                        dataType: "json",
                        success: function(data){
                        
                            if (data.result.faultString != null)
                            {
                                alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                            }
                            else if (!data.result)
                            {
                                alert("Something is wrong");
                            }
                            else
                            {
                                for (var i in data.result.products)
                                {
                                    var name = data.result.products[i].name;
                                
                                    //create an option element with a value and the inner html being the name
                                    var option = $("<option>").val(name).html(name);

                                    //append the option to the <select>
                                    $("#Details select[name=product], #search select[name=product]").append(option);
                                } 
                                //Automatically populates the components and version fields based off of the first(default) product
                                var firstProduct = $("#Details select[name=product] option").first().html();
                            
                            
                                getCompsVers([firstProduct], "Details");
                                getCompsVers(null, "search");
                            }
                                
                        
                        },
                        error: function(jqXHR, textStatus, errorThrown){
                            alert("There was an error:" + textStatus);
                        }
                    });
                    
                };
                
                
           
                //Finds all bugs assigned to me and posts them to the board 
                $.ajax({
                    url: "ajax_POST.php",
                    type: "POST",
                    data: { 
                        "method": "Bug.search",
                        "assigned_to": "evan.oman@blc.edu" //Test for Landfill tara@bluemartini.com
                    },
                    dataType: "json",
                    success: function(data, status){
                        
                        if (data.result.faultString != null)
                        {
                            alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                        }
                        else if (!data.result)
                        {
                            alert("Something is wrong");
                        }
                        else
                        {
                            for (var i in data.result.bugs)
                            {
                                var bug = data.result.bugs[i];
                                postCard(bug.id,/*bug.cf_whichcolumn*/ bug.cf_whichcolumn, bug.component, bug.priority, bug.product, bug.severity, bug.summary, bug.version, bug.creator, bug.deadline, "Test", bug.status);
                            }
                        }
                    }
                });                                                
                
                //Sets the priority of the card 
                $(".p").live("click", function(){
                    //Grabs the anchor's text
                    var prio = $(this).html();
                    var val = $(this).attr("value");
                    
                    alert(val);
                    //Finds which card was right clicked
                    var card = $.mbMenu.lastContextMenuEl;
                    //Stores the selected priority as the cards priority
                    
                    $(card).data({"priority": prio});
                    //TODO Need a way to associate the priority string with  its sortkey
                    /*$(card).data({"priokey": val});*/
                    
                    displayHandler($(card));
                    closeContextMenu(); 
                });
                
                
                //This is a helper function that passes a card Id to the attachments and comments tabs
                $("#edit-tabs ul li a").click( function(){
                    var tab = $(this).html();
                    var id = $(this).attr("value");

                    if (tab == "Comments")
                    {
                        ajaxGetComments(id);
                    }
                });
                
                $('#accordion .header').live("click",function() {
                    $(this).next().toggle("slow");
                    return false;
                }).next().hide();
                
            });
              
              
              
            /*--------------------End Document.Ready------------------------*/
            
        
            var componentData = null;
        
            //Retrieves all of the available components and versions for a given product. Now revised to pull down all the products and components once and then reuse the info
            function getCompsVers(name, dialogID){
                if (componentData == null)
                {
                    $.ajax({
                        //Need this to be completed before other actions occur:
                        //async: false,
                        url: "ajax_POST.php",
                        type: "POST",
                        data: {
                            "method": "Bug.fields",
                            "names": ["component", "version"],
                            "value_field": "product"                            
                        },    
                        dataType: "json",
                    
                        success: function(data, status){
                        
                      
                            if (data.result.faultString != null)
                            {
                                alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                            }
                            else if (!data.result)
                            {
                                alert("Something is wrong");
                            }
                            else 
                            {   
                                componentData =  data.result.fields;                            
                            }
                        },
                        error: function(jqXHR, textStatus, errorThrown){
                            alert("(Fields)There was an error:" + textStatus);
                        }
                    });
                }
               
                for (var j in componentData)
                { 
            
                    var fieldName = componentData[j].name;
                                
                    //remove all <option>s from the specified select
                    $("#"+dialogID+" select[name="+fieldName+"]").empty();
                                
                    //iterate through all the allowed values for this field
                    for (var k in componentData[j].values) 
                    {   
                        //get the value
                        var visval =  componentData[j].values[k].visibility_values[0];
                        //Need to check if name is null before looping through it because other wise there is nothing to loop through
                        if (name != null)
                        {                        
                            for (var l in name)
                            {    //create an option element with a value and the inner html being the name  
                                var comp = componentData[j].values[k].name;
                                var option = $("<option>").val(comp).html(comp);
                                
                                //This is a crude method of weeding out which values should be displayed based off of the product name                           
                                if (visval == name[l])
                                {                                                               
                                    //append the option to the <select>
                                    $("#"+dialogID+" select[name="+fieldName+"]").append(option);
                                }                                    
                            }         
                        } else{
                            //If name is null we will simply display all options
                            var comp = componentData[j].values[k].name;
                            var option = $("<option>").val(comp).html(comp);
                            $("#"+dialogID+" select[name="+fieldName+"]").append(option);
                        }          
                    }
                }
            };
            
            function editCard(cardId) {
                var card = $('#'+cardId);
                //This method has been modified to allow for immediate retireval(the components and versions are stored, ajax only called once)
                getCompsVers([card.data("product")], "Details");
                //Changes the edit dialog to have the correct fields for the selected card's Product.                 
                //Populates the fields
                $("#title").val(card.data("title"));
                $("#bug_severity").val(card.data("bug_severity"));
                $("#user").val(card.data("user"));
                $("#priority").val(card.data("priority"));
                $("#cf_whichcolumn").val(card.data("cf_whichcolumn"));
                $("#deadline").val(card.data("deadline"));
                $("#description").val(card.data("description"));
                $("#product").val(card.data("product"));  
                $("#version").val(card.data("version"));
                $("#component").val(card.data("component"));                
                $("#bug_status").val(card.data("status"));
                $("op_sys").val(card.data("op_sys"));
                $("rep_platform").val(card.data("rep_platform"));
              
                
                //Adds edit specifc dialog properties
                $("#dialogAddEditCard").dialog( "option", "title", "Edit Card" );
                $("#edit-tabs ul li").show();
                $("label[for=cf_whichcolumn],#cf_whichcolumn").hide();
                
                //We need the comments and the atavhements tabs to be specific to the card as well but we only want to retireve this data from the server if it is requested by the user
                //To accomplish this we will set the comments and attachments tabs to have an associated value equal to the id of the card being Edited
                $("#edit-tabs ul li a").each(function(){
                    //Sets each tab on the Edit dialog to have the card ID as a value
                    $(this).attr({
                        "value": cardId
                    });                                  
                });
                
                dialogDisplay(card.data("bug_severity"));
                
                $( "#dialogAddEditCard" ).dialog( "option", "buttons", { 
                    "Save Card": function() {                                                                                                
                        //Finds the current column of the selected card
                        var col = card.parent().parent().attr("id");
                        //Sends the field info to Bugzilla to be processed
                        ajaxEditBug(col, $("#component").val(), cardId, $("#priority").val(), $("#product").val(), $("#bug_severity").val(), $("#title").val(), $("#version").val(),$("#user").val(),
                        $("#deadline").val(), $("#description").val(), $("#bug_status").val(), $("#op_sys").val(),$("#rep_platform").val()); 
                        //displayHandler(card); 
                            
                    },
                    Cancel: function() {
                        $( this ).dialog( "close" );
                    }   
                });
                $( "#dialogAddEditCard" ).dialog( "option", "close",function()  {
                   
                    $("#Details input, #Details textarea, #Details select").val("");
                }
            );   
                $( "#dialogAddEditCard" ).dialog( "open" );
                
            }
            
            function addCard() {
                //Adds add card specifc dialog properties
                $("#edit-tabs ul li:not(:first-child)").hide();
                $( "#edit-tabs" ).tabs("select", 0);
                $("label[for=cf_whichcolumn],#cf_whichcolumn").show();
                $("#dialogAddEditCard").dialog( "option", "title", "Add Card" );
                var first = $("#bug_severity option").first().val();                
                dialogDisplay(first);
                getCompsVers([$("#product").val()], "Details");
                    
                $( "#dialogAddEditCard" ).dialog( "option", "buttons", { "Save Card": function() {
                        if($( "#title" ).val()=="")
                        {
                            $("#dialogInvalid").dialog("open");
                        }
                        else{      
                            //Files a new bug in the bugzilla server
                            createCardBugzilla($("#cf_whichcolumn").val(), $("#component").val(), $("#priority").val(), $("#product").val(),  $("#bug_severity").val(), $("#title").val(), 
                            $("#version").val(),$("#user").val(),$("#deadline").val(), $("#description").val(), $("#bug_status").val(),$("#op_sys").val(), $("#rep_platform").val() ); 
                                                          
                            
                        } 
                    },
                    Cancel: function() {
                        $( this ).dialog( "close" );
                    }   
                });
                $( "#dialogAddEditCard" ).dialog( "option", "close",function()  {
                   
                    $("#Details input, #Details textarea, #Details select").val("");
                }
            );   
                $( "#dialogAddEditCard" ).dialog( "open" );
                
            }                                
            
            function editCardContextMenu() {
                
                editCard($($.mbMenu.lastContextMenuEl).attr("id"));
            }           
            
            function addCardToCol() {
                //Finds and saves the column that was right clicked
                var startCol = $($.mbMenu.lastContextMenuEl).attr("id"); 
                
                //Presets the form to open with the correct column selected                
                $("#cf_whichcolumn").val(startCol);
                addCard();
            }
            
            function editView(index){
                $( "#edit-tabs" ).tabs("select", index);
                //Handles special case when the Comments card is selected
                if (index == 2){
                    if (card.data("comments") == null){
                        
                    }
                }
                editCardContextMenu();
            }                       
            
            /*<editor-fold>*/
            function displayHandler(card) {
                //Finds the card's values    
                var cardRef = "#"+card.attr("id").replace(/\s+/g, '');
                var job = card.data("bug_severity").replace(/\s+/g, '');
                var prio = card.data("priority").replace(/\s+/g, '');                
                var deadline = card.data("deadline");
                var date = new Date(deadline+ " UTC <?php echo date("O"); ?>");
                /* TODO For some reason instantiating a new date messes the day up by one, need to figure out why
                alert(deadline); Prints correct date
                alert(date); Prints the day before the correct date
                 */ 
                
                
                if (job != null)
                {
                    $("#bug_severity option").each(function(){
                    
                        $(cardRef).removeClass($(this).val());
                    })
                    $(cardRef).addClass(job).attr({"title": job});
                    
                    $("#bug_severity option").each(function(){
                        $("#Details").removeClass($(this).val());
                    });
                    $("#Details").addClass(job);
                }
                if (job == null)
                {
                    $("#bug_severity option").each(function(){
                        $("#Details").removeClass($(this).val());
                    });
                    $("#Details").addClass("enhancement");
                    $(cardRef).addclass("enhancement");
                    
                }
        
                //$(cardRef).addclass("Task");
                
                
                //This section adds and switches the priority icon. TODO need to find new method taking the sortkey used by bugzilla
                if (prio != "Medium" && $(cardRef + " .prioBack").length == 0)
                {
                    $(cardRef+ " .iconBar").append("<div class=\"prioBack\"><div class=\"prioIcon\"></div></div>");
                }
                if (prio != "Medium")
                {
                    $("#priority option").each(function(){                    
                        $(cardRef+" .iconBar .prioBack .prioIcon").removeClass($(this).val());
                    });
                
                    $(cardRef+" .iconBar .prioBack .prioIcon").addClass(prio).attr({"title": prio + " Priority"});
                }
                else if (prio == "Medum")
                {
                    $(cardRef+" .iconBar .prioBack ").remove();
                }
                
                
                //This section handles the calendar icon
                if (deadline != null && $(cardRef + " .iconBar .calBack").length == 0)
                {
                    $(cardRef+ " .iconBar").append("<div class=\"calBack\"><div class=\"calIcon\"></div></div>"); 
                }
                if (deadline == null || deadline == "")
                {
                    $(cardRef+ " .iconBar .calBack").remove(); 
                }

                //TODO This is a temporary fix, need to figure out why the days are different
                var day = date.getDate() ;                
                var month = date.getMonth(); 
                var year = date.getFullYear();
                var until = daysUntil(year, month, day);
                $(cardRef+ " .iconBar .calBack .calIcon").html(day).attr({"title": "Due: "+ deadline + " ("+until+" days from today)"});
                if (until <= 7 && until > 0)
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").addClass("calIconWeek");
                }
                else
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").removeClass("calIconWeek");    
                }
                if (until == 1)
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").attr({"title": "Due: "+ deadline + " (Tomorrow)"});
                }  
                
                if (until <= 0)
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").addClass("calIconNeg");
                    $(cardRef+ " .iconBar .calBack .calIcon").attr({"title": "Due: "+ deadline + " ("+(-until)+" days ago)"});
                }
                else
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").removeClass("calIconNeg");
                }
                if (until == 0)
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").attr({"title": "Due: "+ deadline + " (Today)"});
                }
                if (until == -1)
                {
                    $(cardRef+ " .iconBar .calBack .calIcon").attr({"title": "Due: "+ deadline + " (Yesterday)"});
                }
                               
            }
            /*</editor-fold>*/  
            
            
            function daysUntil(year, month, day) {
                var now = new Date(),
                dateEnd = new Date(year, month, day), 
                days = (dateEnd - now) / 1000/60/60/24;   // convert milliseconds to days

                return Math.ceil(days);
            }

            function dialogDisplay(job){
                $("#bug_severity option").each(function(){
                    $("#Details").removeClass($(this).val().replace(/\s+/g, ''));
                });
                
                if (job == null)
                {
                    $("#Details").addClass("DesignBug");
                }
                else
                {
                    job = job.replace(/\s+/g, '');
                    $("#Details").addClass(job);
                }
            }
            
            //Card creation function, adds the card to the page. Need the following Bugzilla parameters: product, component, version, bug_severity, priority. 
            function  createCardBugzilla(col, component,   priority, product, severity, summary, version, user, deadline, description, status, op_sys, rep_platform){ 
                   
                
                $.ajax({
                    url: "ajax_POST.php",
                    type: "POST",
                    data: { 
                        "method": "Bug.create",
                        "cf_whichcolumn": col,
                        "component": component,
                        "priority": priority,
                        "product": product,
                        "severity": severity,
                        "summary": summary,
                        "version": version,
                        "deadline": deadline,
                        "op_sys": op_sys,
                        "rep_platform": rep_platform,
                        "status":status
                        
                    },
                    dataType: "json",
                    success: function(data, status){
                
                        if (data.result.faultString != null)
                        {
                            alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                        }
                        else if (!data.result)
                        {
                            alert("Something is wrong");
                        }
                        else 
                        {
                            //Card creation logic will be placed here as soon as the Bug.create/Bug.update issues have been resolved
                            //The Bugzilla Documentation states that the create method will only return the new ID upon completion
                            var id = data.result.id;
                            alert("Bug succesfully added.\nID:"+id);
                            //Now that we have the new card's Id we can post it to the board:
                            postCard(id,col, component,   priority, product, severity, summary, version, user, deadline, description, status);
                            $( "#dialogAddEditCard" ).dialog( "close" ); 
                        }
                        
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("There was an error:" + textStatus);
                    }
                });               
                
            }
            
            //Posts a card to the page containing all of the propper information. Used to post new cards and also to populate the board with existing cards
            function postCard(id,col, component,   priority, product, severity, summary, version, user, deadline, description, status, op_sys, rep_platform){
                var newCard = $('<div id="'+id+'" class="card "><div class="cardText">'+summary+'</div><div class="iconBar"></div></div>');
                    
                newCard.addClass("cmVoice {cMenu:\'contextMenuCard\'}, normal");
                //<div class="cardText">Existing Card</div><div class="iconBar"></div></div>   
                var newLi = $('<li></li>').append(newCard);
                                                                       
                $("#"+col.replace(/\s+/g, '')).append(newLi);
                
                //NOTE: I realize saving the data locally and on the database violates the DRY principle however I don't want the user to have to wait for an AJAX call to complete in order to access bug info
                newCard.data({
                    "title": summary,
                    "bug_severity": severity,
                    "priority": priority,
                    "product": product,
                    "component": component,
                    "version": version,
                    "user": user,
                    "cf_whichcolumn": col,
                    "deadline": deadline,
                    "description": description,
                    "status": status,
                    "op_sys": op_sys,
                    "rep_platform": rep_platform
                        
                });
                    
                $(document).buildContextualMenu(
                {
                    menuWidth:200,
                    overflow:2,
                    menuSelector: ".menuContainer",
                    iconPath:"ico/",
                    hasImages:false,
                    fadeInTime:200,
                    fadeOutTime:100,
                    adjustLeft:0,
                    adjustTop:0,
                    opacity:.99,
                    shadow:true,
                    onContextualMenu:function(o,e){}

                });
                displayHandler(newCard);
            }

            
            //NOTE: This function is dependent on the existance of the Bugzilla cf_whichcolumn custom field
            function ajaxEditBug(col, component, id, priority, product, severity, summary, version, user, deadline, description, status, op_sys, rep_platform){
                $.ajax({
                    url: "ajax_POST.php",
                    type: "POST",
                    data: { 
                        "method": "Bug.update",
                        "ids": id,
                        "component": component,
                        "priority": priority,
                        "product": product,
                        "severity": severity,
                        "summary": summary,
                        "version": version,
                        "status": status,
                        "op_sys": op_sys,
                        "deadline": deadline,
                        "rep_platform": rep_platform
                    },
                    dataType: "json",
                    success: function(data){
                
                        if (data.result.faultString != null)
                        {
                            alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                        }
                        else if (!data.result)
                        {
                            alert("Something is wrong");
                        }
                        else 
                        {
                            $('#'+id+" .cardText").html($("#title").val());
                            //NOTE: I realize saving the data locally and on the database violates the DRY principle however I don't want the user to have to wait for an AJAx call to complete in order to access bug info
                            $("#"+id).data({
                                "cf_whichcolumn": col,
                                "component": component,                   
                                "product": product,
                                "priority": priority,
                                "bug_severity": severity,
                                "title": summary,
                                "version": version,
                                "user": user,
                                "deadline": deadline,
                                "description": description,
                                "status": status,
                                "op_sys": op_sys,
                                "rep_platform": rep_platform
                            });       
                            displayHandler($("#"+id));
                            //Only want to close the dialog after the information has been sent and no errors pop up
                            $( "#dialogAddEditCard" ).dialog( "close" );
                            
                        }
                        
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("There was an error:" + textStatus);
                    }
                });
                
               
            }
            
            //An update function that stores a card position when called
            function updatePosition(column, cardId)
            {
                //Automatically updates the card's position both in local data and server data. Waiting on Bug.update Resolution                                                
                $.ajax({
                    url: "ajax_POST.php",
                    type: "POST",
                    data: { 
                        "method": "Bug.update",
                        "ids": cardId,                        
                        "cf_whichcolumn": column
                    },
                    dataType: "json",
                    success: function(data, status){
                
                        if (data.result.faultString != null)
                        {
                            alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                        }
                        else if (!data.result)
                        {
                            alert("Something is wrong");
                        }
                        else 
                        {
                            //Will eventually hold the card.data map below. Need to make the Bug.Update work first
                            $("#"+cardId).data({
                                "cf_whichcolumn": column
                            });
                        }
                     
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("There was an error:" + textStatus);
                    }
                });                                                
                    
            }
               
            //A function that updates the cf_whichcolumn field of every card in a column
            /*TODO Need to figure out how to OVERLOAD!! */
            function updatePosition1(col)
            {
                //Instead of making an ajax call for each card I push each ID into an array and pass the single array into a single ajax call
                var cardArr = [];
                $("#"+col+" .card").each(function(){
                    var cardId = $(this).attr("id");
                    cardArr.push(cardId);
                    
                });
                updatePosition(col, cardArr);
            } 
            
            var advSearchResults = [];
            
            function ajaxSearch(limit, pageNum) {   
                if (typeof(advSearchResults[pageNum]) == "undefined")
                {
                    
                    //Documentation: "Note that you will only be returned information about bugs that you can see. Bugs that you can't see will be entirely excluded from the results. 
                    //So, if you want to see private bugs, you will have to first log in and then call this method."
                    //alert("search");                                                      
                    var searchArr = [$("#searchProduct"),$("#searchBug_severity"),$("#searchSummary"),$("#searchVersion"),$("#searchBug_status"), $("#searchResolution"),$("#searchPriority")];
                            
                    //Need to covert each search parameter to an array and remove all void values to avoid problems with PHP             
                    for (var i in searchArr){
                        var id = searchArr[i].attr("id");
                        //Bug.search doesn't like 'null' values so we will simply replace them with all the possible fields(not selecting a parameter filters nothing)
                        //TODO is there a better way? Is this doing what we want?                                
                        if ($("#"+id).val() == null)
                        {
                            var vals = []
                            $("#"+id+" option").each(function(){
                                vals.push($(this).val());
                            })
                            $("#"+id).val(vals);                                     
                        }
                        //If the value is not an array
                        if ( ! $.isArray($("#"+id).val()))
                        {                                    
                            //Turn it into an array
                            $("#"+id).val( [$("#"+id).val()]);
                        }
                    }
                
                    //This sets the offset to be exact where we want it after the page is changed
                    var offset = (pageNum) * limit;
                   
                    $.ajax({
                        url: "ajax_POST.php",
                        type: "POST",
                        dataType: "json",
                        data: { 
                            /*"ids":  $("#searchId").val(),*/
                            "method": "Bug.search",
                            "priority":  $("#searchPriority").val(),//
                            "product":  $("#searchProduct").val(),//
                            "severity":  $("#searchBug_severity").val(),//
                            "summary":  $("#searchSummary").val(),//
                            "version":  $("#searchVersion").val(),//
                            "resolution":  $("#searchResolution").val(),
                            "status":  $("#searchBug_status").val(),
                            "limit": limit,
                            "offset": offset
                                 
                        },
                            
                        success: function(data, status){
                            
                        
                            if (data.result.faultString != null)
                            {
                                alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                            }
                            else if (!data.result)
                            {
                                alert("Something is wrong");
                            }
                            else 
                            {
                                //Search results will be printed to the screen from here
                                advSearchResults[pageNum] = data.result.bugs;
                                processResults();
                            }
                                     
                        },
                        error: function(jqXHR, textStatus, errorThrown){
                            alert("There was an error:" + textStatus);
                        }
                    }); 
                } 
                else{
                    processResults();
                }
                function processResults(){
                    //First thing we want to do is clear the previous results and the next button:
                    $( "#bugs tbody tr, #next" ).remove();
                
                    //We wait to remove the previous button because if the user ends up at the no more results page, having a backl button would be handy
                    $("#prev" ).remove()
                            
                    var bug = advSearchResults[pageNum]; 
                            
                    //This checks to see if we opened a page of results that is empty
                    if (bug[0] == null && offset > 0){
                        $("#dialogNoResults").html("<p>No more results to display</p>");
                        $("#dialogNoResults").dialog("open");
                    }
                    //This checks to see if the initial search yeilded no results
                    else if (bug[0] == null)
                    {
                        $("#dialogNoResults").html("<p>Your criteria doesn't match any bugs in the system</p>");                                                  
                        $("#dialogNoResults").dialog("open");                           
                    }
                    else {
                        for (var i in bug){                                                                                    
                            $( "#bugs tbody" ).append( "<tr>" +
                                "<td><a href='#Details' onClick='editCard("+bug[i].id+");'>"+bug[i].id+"</a></td>" + 
                                "<td>"+bug[i].product+"</td>" + 
                                "<td>"+bug[i].version+"</td>" +
                                "<td>"+bug[i].assigned_to+"</td>" +
                                "<td>"+bug[i].status+"</td>" +
                                "<td>"+bug[i].resolution+"</td>" +
                                "<td>"+bug[i].summary+"</td>" +
                                "</tr>" );                                           
                        }
                    }
                            
                    //This line finds the number of rows(that is the the number of results) in our table. We subtract 1 to account for the header
                    var row = ($("#bugs tr").length - 1);
                         
                    //This statement ensures that a "next" button will only be appended if there are more results to show(if the specified limit divides the number of results the
                    //user will still be able to access the last empy page)
                    if (row == limit)
                    {
                        var next = $("<button id='next' class='btnTab' style='float: right'>").html("Next");
                        next.click(function(){
                            ajaxSearch(limit, pageNum+1)
                        });
                        $("#Results").append(next);
                    }
                        
                    if (pageNum != 0)
                    {
                        var prev = $("<button id='prev' class='btnTab' style='float: left'>").html("Previous");
                        prev.click(function(){
                            ajaxSearch(limit, pageNum-1)
                        });
                                
                        $("#Results").append(prev);
                    }
                    else if (pageNum <=0 && $("#prev").length > 0)
                    {
                        $("#prev").remove();
                    }
                }
            }
            
            //Gets a given card's comments and posts them to the Comments tab 
            function ajaxGetComments(ids) { 
            
            
                var card = $("#"+ids);
                
                //We only want to pull down the card's comments once to save time
                if (card.data("comments") == null)               
                {
                    $.ajax({
                        async: false,
                        url: "ajax_POST.php",
                        type: "POST",
                        dataType: "json",
                        data: {                        
                            "method": "Bug.comments",
                            "ids": ids                        
                        },
                            
                        success: function(data, status){                       
                            if (data.result.faultString != null)
                            {
                                alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                            }
                            else if (!data.result)
                            {
                                alert("Something is wrong");
                            }
                            else 
                            {
                                //...bugs[ids].comments is used instead of ...bugs.ids.comments because Bugzilla returns a numeric hash key which the dot operator doesn't like.
                                var comArr = data.result.bugs[ids].comments; 
                                card.data({
                                    "comments": comArr
                                });
                            }                                   
                        },
                        error: function(jqXHR, textStatus, errorThrown){
                            alert("There was an error:" + textStatus);
                        }
                    }); 
                }  
                //First we want to remove any previous comments:
                $("#Comments #accordion div, #Comments #accordion .header").each(function(){
                    $(this).remove();
                });
            
                //Now that we have the comment data, we want to post it to the comments tab
                var comArr = card.data("comments");
                for (var i in comArr)
                {       
                    var commId = "Comment"+i;
                    var commText = comArr[i].text;
                    var commAuthor = comArr[i].author;
                    var date = new Date(comArr[i].time);
                    var time = date.toLocaleTimeString();
                    date = date.toLocaleDateString();
                    
                    var anchorAuthor = $('<a href="#">').text(commAuthor);
                    var anchorName = $('<a href="#'+commId+'"  style="float: right; margin-right: 5px">').text(commId);
                    var spanTime = $('<span style="margin-left: 5px;">').text(date+" "+time);
                    
                    var anchorReply = $('<a href="#" class="commentReplyLink" style="float: right;">').text("Reply");
                    var header = $('<h3 class="header">').append(anchorAuthor,spanTime, anchorReply, anchorName);                    
                    var p = $('<p>').text(commText);
                    var comm = $('<div class="commDiv" id="'+commId+'">').append(header, p);                      
                    $("#Comments #accordion").append(comm);
                }
                
                //Although accordian doesn't do what i want(it only allows one comment to be open at a time), this line initalizing the comments
                //with ui styling
                /* $( "#accordion" ).accordion("enable");*/                                               
            }
            
            $(".commentReplyLink").live("click", function(e){
                e.stopPropagation();
                commentReply($(this).closest("div").attr("id"));
            });
            
            function commentReply(ids)
            {
                alert(ids);
                var quote = "(In response to "+ids+"): "+$("#"+ids+" p").text();               
                var header = $('<h3 class="header">').text("Comment:");
                var text = $('<textarea style="width: 95%; height:100%;">').text(quote);
                var comm = $('<div class="commDiv">').append(text);                      
                $("#Comments #accordion").append(header,comm);
            }
        </script>
    </head>
    <body>
        <div id="dialogOptions" class="ui-dialog-content ui-widget-content"  title="Options" >
            <table id="prioIconTable">
                <tbody>
                    
                </tbody>
            </table>
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
        <div id="dialogInvalid" class="ui-dialog-content ui-widget-content"  title="Invalid Input" >
            <p>Must Specify the Card's Title!!!</p>
        </div>
        <div id="dialogNoResults" class="ui-dialog-content ui-widget-content"  title="No Results" >
            <p>Your criteria doesn't match any bugs in the system</p>
        </div>
        <div id="dialogAddEditCard" class="ui-dialog-content ui-widget-content"  title="Edit" >

            <div id="edit-tabs" class="ui-tabs ui-widget ui-widget-content ui-corner-all">
                <ul>
                    <li><a href="#Details">Details</a></li>
                    <li><a href="#Comments">Comments</a></li>
                    <li><a href="#Attachments">Attachments</a></li>
                </ul>
                <div id="Details" style="height: 500px;">
                    <form>
                        <fieldset>
                            <div style="float:top; max-height: 80px;">
                                <label for="title">Title:</label>
                                <textarea  name="title" id="title" class="text ui-widget-content ui-corner-all" style="width:960px; height: 40px; max-height: 60px;"  ></textarea>
                            </div>
                            <div style="float: left;">
                                <label for="product">Product:</label>
                                <select  name="product" id="product"  class="text ui-widget-content ui-corner-all" ></select>
                                <label for="component">Component:</label>
                                <select  name="component" id="component"  class="text ui-widget-content ui-corner-all" ></select>
                                <div style="float: top">
                                    <div style="float: left;">
                                        <label for="version">version</label>
                                        <select  name="version" id="version"  class=" text ui-widget-content ui-corner-all, half">    </select>
                                    </div>
                                    <div style="float: left; margin-left: 10px;">
                                        <label for="bug_severity">Severity:</label>
                                        <select  name="bug_severity" id="bug_severity"  class=" text ui-widget-content ui-corner-all, half" ></select>
                                    </div>
                                </div>
                                <div style="float: top">
                                    <div style="float: left;">
                                        <label for="bug_status">Status:</label>
                                        <select  name="bug_status" id="bug_status"  class="text ui-widget-content ui-corner-all, half" ></select>
                                    </div>
                                    <div style="float: left; margin-left: 10px;">
                                        <label for="user">Assigned User:</label>
                                        <select  name="user" id="user"  class="text ui-widget-content ui-corner-all, half" >   
                                            <option></option>
                                            <option>User 1</option>
                                            <option>User 2</option>
                                            <option>User 3</option>
                                            <option>User 4</option>
                                        </select>
                                    </div>
                                </div>
                                <div style="float: top">
                                    <div style="float: left;">
                                        <label for="priority">Priority:</label>
                                        <select  name="priority" id="priority"  class="text ui-widget-content ui-corner-all, half">    </select>
                                    </div>
                                    <div style="float: left; margin-left: 10px;">
                                        <label for="deadline">Deadline:</label>
                                        <input type="text" name="deadline" id="deadline" class="Dates text ui-widget-content ui-corner-all, half" />
                                    </div>
                                </div>
                                <div style="float: top">
                                    <div style="float: left;">
                                        <label for="op_sys">Operating System</label>
                                        <select  name="op_sys" id="op_sys"  class="text ui-widget-content ui-corner-all, half">    </select>
                                    </div>
                                    <div style="float: left; margin-left: 10px;">
                                        <label for="rep_platform">Hardware</label>
                                        <select  name="rep_platform" id="rep_platform"  class="text ui-widget-content ui-corner-all, half">    </select>
                                    </div>
                                </div>
                                <div style="float: left;">
                                    <div style="float: left; ">
                                        <label for="cf_whichcolumn">Into Column:</label>
                                        <select  name="cf_whichcolumn" id="cf_whichcolumn"  class="text ui-widget-content ui-corner-all, half" >                               
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div id="rightDiv" style="float: left; margin-left: 10px; width: 665px; height: 325px;">
                                <span style="width: 75%;">
                                    <label for="description">Description:</label>
                                    <textarea  name="description" id="description" class="text ui-widget-content ui-corner-all" style="width:95%; height: 95%; max-height: 100%; max-width: 100%;"  ></textarea> 
                                </span>
                            </div>                            
                        </fieldset>
                    </form>
                </div>

                <div id="Comments" style="height: 500px;">
                    <div id ="accordion"> </div>                    
                </div>
                <div id="Attachments">
                    <p>These are attachments</p>
                </div>
            </div>
        </div>   
        <div id="dialogSearch" class="ui-dialog-content ui-widget-content"  title="Advanced Search" >
            <div id="search">
                <form style="height:300px;">
                    <fieldset style="margin-top: 10px;">
                        <div class="box"style="float:top; max-height: 40px; width:830px;">
                            <label for="title" style="float:left; margin-right: 10px;">Summary:</label>
                            <textarea  name="title" id="searchSummary" class="text ui-widget-content ui-corner-all" style="float:left !important; width:auto; height: 20px; max-height: 60px; width:745px;"  ></textarea>
                        </div>
                        <div style="float: left; width:100%">
                            <div class="box">
                                <label for="product"class="searchLabel">Product:</label>
                                <select  name="product" id="searchProduct"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="version"class="searchLabel">Version</label>
                                <select  name="version" id="searchVersion"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="bug_severity"class="searchLabel">Severity:</label>
                                <select  name="bug_severity" id="searchBug_severity"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="priority"class="searchLabel">Priority</label>
                                <select  name="priority" id="searchPriority"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="bug_status"class="searchLabel">Status:</label>
                                <select  name="bug_status" id="searchBug_status"  class="text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                            <div class="box">
                                <label for="resolution"class="searchLabel">Resolution:</label>
                                <select  name="resolution" id="searchResolution"  class=" text ui-widget-content ui-corner-all" multiple="multiple"></select>
                            </div>
                        </div>                        
                    </fieldset>
                </form>
                <div id="Results" class="ui-widget">                 
                    <div id="bugs-contain" class="ui-widget" >
                        <h1>Bugs:</h1>
                        <table id="bugs" class="ui-widget ui-widget-content, tablesorter" cellspacing="0" cellpadding="4" width="100%">
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
                    </div>
                </div>
            </div>
        </div>

        <ul class="tablists cmVoice {cMenu: 'contextMenuColumn'}" id="Backlog" > 
            <li class="bigBanners">Backlog</li>      
        </ul> 
        <ul class="tablists cmVoice {cMenu: 'contextMenuColumn'}" id="Archive">
            <li class="bigBanners">Archive</li>      
        </ul>    
        <ul class="tablists cmVoice {cMenu: 'contextMenuColumn'}" id="Limbo">
            <li class="bigBanners">Limbo</li>      
        </ul> 
        <div class="toolbar">                
            <button class="btnTab">Backlog</button>
            <button class="btnTab">Archive</button>
            <button class="btnTab">Limbo</button>
            <button id="btnAddCard">Add Card</button>
            <button id="btnSearchCard">Advanced Search</button>
            <button id="btnOptions">Options</button>
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
            <a action="editView(1)">View Card Comments</a>
            <a action="editView(2)">View Card Attachments</a>
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
        </div>
    </body>
</html>

