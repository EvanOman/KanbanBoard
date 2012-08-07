/* 
    Document   : Kanban.js
    Created on : May 23, 2012, 9:59:20 AM
    Author     : Evan Oman
    Description:
        This file handles all of the functionality requitred to: 
            1. Provide the user with a usable and interactive Kanban interface
            2. Communicate with the PHP files that query the Bugzilla Server
            3. Communicate with the PHP files that store .ini settings
 */



//First we want global variables to store the priority icons and the jobMap colors
var prioMap = {};
var jobMap = {};
var prioSortKey = {};
var limitWIP ={};

//USed to store form data in case the user submits a bad value to the server
var cardChangeData = [];

//These variables represent our loading ajax calls. At first we are waiting for them(hence the defferred)
var getCompsVersXHR = $.Deferred();
var getNamesXHR = $.Deferred();
var getAccProXHR = $.Deferred();
var getFormFieldsXHR = $.Deferred();

//An object that stores the compoonent and version relationship to the product
var componentData = null;

//Stores the .ini setting where a card can be and where it goes if something is wrong
var allowedColumnMap = {};
var defaultColumnMap = {};

//Stores the neswted column object that we use to build the board
var columnNest = {};

//Used to store which columns belong hidden on load
var tabColumns = [];
           
//Stores the relationship between Bugzilla's names for columns and our column IDs           
var colSortKeyMap = {};

//HEre we have a global array that stores the ids of all the items being sorted
var sortingArray = [];

//Starts the update timer that keeps the board up to date
var updateTimer = setTimeout(updateBoard, 30000);

//The base element for determing shift selection
var baseShiftClickItem;

//Some bugzilla field names are different than the bug parameter names. This object stores these relationships
var bugzillaFieldtoParam = {
    "bug_status": "status", 
    "bug_severity": "severity",
    "rep_platform": "platform"  
};

//Stores the current filter being applied to the tab columns
var tabColumnFilter = {};

//Stores the updated card data for a card whose edit dialog is open
var updateData = {};

//Keeps a record of the loading messages telling the user about status related changes:
var messageArr =[];

//Stores the ids that have administrative privelages
var adminIds = []; 

//For debugging, checks how many context menues are being made 
var calls = 0;

//Sets the default theme to hot-sneaks
$("#jqueryCss").attr("href", "themes/hot-sneaks/jquery-ui.css");

//Pulls down the .ini settings and sets variables accordingly 
function initialize()
{            
    $.ajax({
        url: "ajax_get_options.php",
        dataType: "json",                    
        success: function(data){                                                
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
                jobMap = data.options.jobColors;                
                allowedColumnMap = data.options.allowedColumnMap;
                defaultColumnMap = data.options.defaultColumnMap;
                limitWIP = data.options.limitWIP;
                colDivChar = data.options.colDivChar.colDivChar;
                tabColumns = data.options.tabColumns.tabColumns;
                adminIds = data.options.adminIds.adminIds;
                
                //We dont want this function to run until the initialize function completes but we also want the document to be ready
                $(document).ready(function() {
                    //First things first we want to populate the board with the correct cards:                    
                    boardCardPopulate();             
                    
                    //And configure the board according to the user type
                    if (adminIds.indexOf(userID) == -1)
                    {
                        $("#btnOptions").remove();
                        $("#dialogOptions").empty();
                        $("#dialogOptions").dialog("destroy");
                    }
                });
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    });
}

//Here we call initialize so it is the first function to fire
initialize();  


/*---------------------------------------------------------------------------BEGIN DOCUMENT READY ------------------------------------------------------------------------*/
$(document).ready(function() {
    //Add a loading class to the dialogs so they cant be used until all of the fields are loaded
    $('body, #Details, #dialogSearch, #dialogOptions').addClass("loading"); 
     
     
    /*-------------AJAX Calls---------------------*/
    
    getCompsVersXHR = $.ajax({
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
                //Stores the comoponent and version data for future use
                componentData =  data.result.fields;                                                 
            }                                                                                                                                                                                                          
        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("(Fields)There was an error:" + textStatus);
        }
    });
                
    //An Ajax call that finds all accessible product ids. 
    getAccProXHR = $.ajax({
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
               
               
    //A single Ajax call that finds all the specified field option values                
    getFormFieldsXHR = $.ajax({
        url: "ajax_POST.php",
        //async: false,
        type: "POST",
        data: {
            "method": "Bug.fields"
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
                //Instead of merely populating existing fields, I am going to actually build the dialog add/edit
                //menu based off of the Bugzilla field-type parameter which has the following map:
                /* 
                 *Number    Form Type
                 *  0        Unknown
                 *  1        Free Text(iput type=text?)
                 *  2        Drop Down(Select)
                 *  3        Multiple-Selection Box(Select multiple = multiple)
                 *  4        Large Text Box(textarea)
                 *  5        Date/Time(datepicker)
                 *  6        Bug Id(input type=number?)
                 *  7        Bug URLs(input)               
                 */
                for (var j in data.result.fields)
                {                    
                    //Gets the backend name for the field
                    var fieldName = data.result.fields[j].name;                                
                    
                    if (fieldName == "component" || fieldName == "product" || fieldName == "classification")
                    {
                        continue; 
                    }
                    //Gets the display name for the field
                    var fieldDisplayName = data.result.fields[j].display_name; 
                    
                    //Finds the field type number:
                    var fieldType = data.result.fields[j].type;                   
                    
                    var html = $("<div>");
                        
                    html.append("<label>"+fieldDisplayName+"</label>");
                    
                    switch(fieldType){                         
                        case 2:
                            html.append( "<select class=' ui-widget-content ui-corner-all' name='"+fieldName+"'></select>");
                            break;
                        case 3:
                            html.append("<select class=' ui-widget-content ui-corner-all' name='"+fieldName+"' multiple='multiple'></select>");
                            break;
                        case 4:
                            html.append( "<textarea class=' ui-widget-content ui-corner-all' name='"+fieldName+"' style='height:100%; width: 100%;'></textarea>");
                            break;
                        case 5:
                            var date = "<input class=' ui-widget-content ui-corner-all' type='text' name='"+fieldName+"'/>"; 
                                         
                            //Allows calendar plugin
                            $( date ).datepicker({
                                dateFormat: "yy-mm-dd"
                            }).appendTo(html);             
                            break;
                        case 7:
                        case 8:
                        case 0:
                            if (fieldName == "assigned_to")
                            {
                                html.append("<input  class=' ui-widget-content ui-corner-all' type='text' name='"+fieldName+"'/>");  
                                break;
                            }
                            else
                            {
                                continue;     
                            }                            
                        case 1:
                        case 6:
                            html.append("<input  class=' ui-widget-content ui-corner-all' type='text' name='"+fieldName+"'/>");
                            break;                    
                        default:
                            console.error("Invalid Field Type\nField Name: "+fieldName+"\nType: " +fieldType);
                            break;                                        
                    }                                                           
                    
                     
                    //Appends the field to the dialogs
                    $("#detailsLeft, #optFilterDiv, #searchFieldsDiv").append(html);
                  
                    
                    //Priority has a context menue that needs to be populated as well
                    if (fieldName == "priority")
                    {
                        //Populates the priority context menu as well
                        for (var i in data.result.fields[j].values) 
                        {    
                            //get the value
                            var prio = data.result.fields[j].values[i].name;
                            var sortkey = data.result.fields[j].values[i].sort_key;
                                        
                            prioSortKey[prio]=sortkey;

                            //create an option element with the inner html being the name
                            var a = $("<a>").html(prio);
                                                                                
                            //append the option to the context menu
                            $("#setPriority").append(a);                                                                    
                        }  
                    }                   
                    //Need to create the column-ID map:
                    else if (fieldName == "cf_whichcolumn")
                    {
                        //Populates the priority context menu as well
                        for (var k in data.result.fields[j].values) 
                        {    
                            //get the value
                            var colName = data.result.fields[j].values[k].name;
                            var columnID = data.result.fields[j].values[k].sort_key;                            
                            colSortKeyMap[colName] = "column_"+columnID;                            
                            
                            if (colName != "---")
                            {
                                var anc = $("<a>").html(colName).attr("value", colSortKeyMap[colName]);                            
                    
                                //append the option to the context menu
                                $("#moveAllCards, #moveCardTo").append(anc);    
                            }                                               
                        } 
                        //Starts the column appending process
                        buildBoardHelper();                                                
                    }
                    
                    if ( fieldType == 2 || fieldType == 3)
                    {
                        //iterate through all the allowed values for this field
                        for (var i in data.result.fields[j].values) 
                        {                               
                            //get the value
                            var nameVal = data.result.fields[j].values[i].name;                                                        
                            //create an option element with a value and the inner html being the name
                            selectOption = $("<option>").val(nameVal).html(nameVal);                                                       
                            //append the option to the <select>
                            $("select[name="+fieldName+"]").append(selectOption);  
                        }
                            
                    }                                                    
                                                                                                   
                }
                
            }
                        
        },
        error: function(jqXHR, textStatus){
            alert("(Fields)There was an error:" + textStatus);
        }
    });       
    
   
 
           
    /*-------------Jquery UI Initialization---------------------*/       
    
    //These features require that the columns be initialized:
    //We need to wait for the columns to be added
    $.when(getFormFieldsXHR).done(function(){
    
        //Enables the sortable behavior that allows the reordering of the cards
        $( ".column,.tablists" ).sortable({
            connectWith: ".column,.tablists",
            placeholder: "ui-state-highlight",
            forcePlaceholderSize: true,
            tolerance: 'pointer',
            appendTo: 'body',
            cursorAt: {
                top: 15
            },
            cancel: "li:has(.loading),  li.swimlane",
            //The items parameter expects only a selector which prevents the use of Jquery so here I have made a(likely very inefficent) selector which selects every li with a card in it that isn't loading
            items: "li:has(.card):not(:has(.loading)), li.swimlane",
            start: function(event, ui)
            {
                //If the element is part of a selected group we need to hide the selected elements because we are moving
                if ($(ui.item).find(".card").hasClass("sorting-selected"))
                {
                    $(".column .sorting-selected, .tablists .sorting-selected").each(function(){                        
                        var id = $(this).attr("id");
                        sortingArray.push(id);
                    }).parent().hide();
                    
                }
            },
            stop: function(event, ui)
            {       
                //If isSorted is true we know that the sorted card has been successfully received. If it equals undefined we know that the receive was never hit(ie the sortable
                //card was dragged back to its original column). The only way we want to cancel is if isSorted is false
                var condition = ($(ui.item).data("isSorted") || typeof($(ui.item).data("isSorted")) == "undefined");
               
                //If the card we are moving is part of a selected group we need to move the group wherever the card moves to
                if ($(ui.item).find(".card").hasClass("sorting-selected") && condition)
                {
                    var sortColumn = ui.item.parent().attr("id");
                
                    var cardArr = [];
                
                   
                    $(".sorting-selected").each(function(){
                        var col = $(this).data("cf_whichcolumn");
                   
                        if (col != sortColumn)
                        {
                            cardArr.push($(this));                      
                        }                   
                    });
                
                    if (cardArr.length)
                    {
                        appendCard(cardArr, sortColumn);
                    }                                                                
                    $(".sorting-selected").removeClass("sorting-selected").parent().show();     
                }
              
                $(".sorting-selected:hidden").parent().show();   
                $(ui.item).removeData();
                
                sortingArray = [];
            },
            
            //Updates the cards position whenever it is moved
            receive: function(event, ui) {     
                
                var cardId = ui.item.find(".card").attr("id");
                var status = $("#"+cardId).data("status");
                var col = $(this);                
                var colID = reverseKeyLookup(colSortKeyMap, col.attr("id"));
                
                if (allowedColumnMap[status].indexOf(colID) == -1)
                {
                    $(ui.item).data("isSorted", false);
                    alert(colID + " is not a valid Column choice for the "+status+" status");                    
                    $(ui.sender).sortable('cancel');                       
                }
                else
                {                   
                    //Updates the card's stored position
                    updatePosition(col.attr("id"),cardId );
                                
                    $(document).trigger("columnChange", [$(ui.sender).attr("id"), $(this).attr("id")]); 
                    
                    $(ui.item).data("isSorted", true);
                                                                      
                }
                
                $(".sorting-selected:hidden").parent().show();                               
            }, 
            helper: function(event, element){
                
                //If the element doesnt has a selected class we know that this element doesn't need the helper div
                if (!$(element).find(".card").hasClass("sorting-selected"))                
                {
                    return element;
                }
                //If the above is false we know that there are selected elements that need to be cloned and shown in the drag
                else
                {
                    var div = $("<div></div>");
                    
                    $(".sorting-selected").clone().appendTo(div);
                    
                    return div;
                }                                                   
            }
        }).disableSelection();
           
        //Initially diables the sorting of tabbed items
        $(".tablists").sortable("disable");  
        
        
        
        
    });
    
    //Adds button styling to all the buttons
    $("button").button(); 
    
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
        
                
    //Sets up the changed data dialog menu
    $( "#dialogDataChanged" ).dialog({
        autoOpen: false,
        title: "External Change Detected",
        show: "blind",
        hide: "explode",                    
        modal: true,
        height: "auto",
        width: 500,
        resizable: false,
        closeOnEscape: false,
        open: function(event, ui) {
            $(" .ui-dialog-titlebar-close", $(this).parent()).hide();
        },
        buttons: {
            KeepMyChanges: function(){
                $(this).dialog("close");
            },
            ViewExternalChanges: function(){
                var cardId = $("#dialogAddEditCard").data("cardId")
                
                // $("#dialogAddEditCard").dialog("close");
                
                editCard($("#"+cardId).data());
                
                $(this).dialog("close");
            }
        }
    });
    //Sets up the invalids entry dialog menu
    $( "#dialogNoResults" ).dialog({
        autoOpen: false,
        show: "blind",
        hide: "explode",                   
        modal: true,
        buttons: {
            Close: function() {
                $( this ).dialog( "close" );
            }
        }
    });
                   
                
    //Creates the sort/filter dialog
    $( "#dialogSort" ).dialog({
        autoOpen: false,
        resizable: false,
        height: 250,
        width: "auto",
        show: {
            effect: 'blind'
        },
        hide: "explode",
        modal: true                    
    });
                                
    //Creates the options dialog
    $( "#dialogOptions" ).dialog({
        autoOpen: false,
        resizable: false,
        height: 750,
        width: 1350,
        show: {
            effect: 'blind'
        },
        hide: "explode",
        modal: true,
        buttons: {
            Save: function(){
                //Want to make sure all of the option value have been loading before we can save anything
                if (!$("#dialogOptions").hasClass("loading"))
                {
                    dialogOptionsSave();
                }
                                              
            },
            Close: function() {
                $("#adminInputs input").each(function(){
                    $(this).parent().remove();    
                });
                
                $( this ).dialog( "close" );
            }
        }
    });
                                
    //Creates the search dialog box
    $( "#dialogSearch" ).dialog({
        autoOpen: false,
        resizable: false,
        height: "auto",
        width: 1400,
        show: {
            effect: 'blind', 
            complete: function() {
                $("#searchSummary").focus();
            }
        },
        hide: "explode",
        modal: true, 
        close: function(){
            //Here we completely reset the search dialog
            $( "#bugs tbody tr, #next" ).remove();           
            $("#prev, #next" ).remove();
            $("#pageNumDiv, #Results p").empty();
            $("#searchSummary").val("");
            $("#dialogSearch .box").hide();
        }
    });
    
    
    //Creates the filter dialog box
    $( "#dialogFilter").dialog({
        autoOpen: false,
        resizable: false,
        height: "auto",
        width: 1400,
        title: "Advanced Filter",
        show: {
            effect: 'blind'            
        },
        hide: "explode",
        modal: true, 
        buttons: {
            "Apply Filter": function(){
                dialogFilterSubmit();
            },
            Cancel: function() {
                $( this ).dialog( "close" );
            }    
        },
        close: function(){
            $("#dialogFilter #optFilterDiv .box select, #dialogFilter #optFilterDiv .box input, #filterFieldOption").val("");
        }            
    });
    
                
    //Creates the edit dialog box
    $( "#dialogAddEditCard" ).dialog({
        autoOpen: false,
        height: 650,
        width: 1060,
        resizable: false,
        show: {
            effect: 'highlight', 
            complete: function() {
                $("#Details textarea[name=summary]").focus();
            }
        },
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
                
                   
    //Allows the tabs on the edit dialog
    $( "#edit-tabs" ).tabs();
    
    //Sets up radio button styling
    $("#sortRadioDiv").buttonset();
    
    
    /*-------------Event Handlers-----------------*/    
    
    $("#themeSelect").change(function(){
        
        var theme = $(this).val();
        
        $("#jqueryCss").attr("href", "themes/"+theme+"/jquery-ui.css");
    });
    
    $("#dialogOptions").on("click", "#addAdmin", function(){
        $(this).parent().before("<td><input type='number' min='1' /></td>")
    });
    
    $(".columnContainer").on("click", ".btnRemoveFilter", function(){
        //Resets the filter object to empty;
        tabColumnFilter = {};
        
        //Filters with a null filter which resets the tablists to pre filter state
        advancedFilter(null, ".tablists"); 
    });
    
    $(".toolbar").on("click", "#btnFilter", function(){
        dialogFilterOpen();
    });
    
    //Sets a change on the default column choice to make sure that the defaulted column is listed as an allowed column
    $( "#defaultColumnDiv " ).on( "change",".box select:not([multiple='multiple'])" ,function(e) {
        var defVal = $(this).val();
        
        var multiple = $(this).siblings("[multiple='multiple']"); 
        
        var valArr = multiple.val();
        
        if (valArr != null)
        {
            valArr.push(defVal);
        
            multiple.val(valArr);    
        }
        else
        {
            multiple.val(defVal);      
        }
        
    }); 
     
    $( ".columnContainer" ).on( "click",".column, .tablists" ,function(e) {
        $('.sorting-selected').removeClass('sorting-selected');
    });
    
    $( ".columnContainer" ).on( "click",".card" ,function(e) { 
        
        e.stopPropagation();
        if (!$(this).hasClass("loading"))
        { 
            if (e.ctrlKey)
            { 
                $(this).toggleClass('sorting-selected');
            }
            else if (e.shiftKey)
            {
                if (!$('.sorting-selected').length)
                {
                    $(this).toggleClass('sorting-selected');                                
                }
                else
                {
                    $('.sorting-selected').removeClass('sorting-selected');
                
                    //Re adds the class to the end elements
                    $("#"+baseShiftClickItem).addClass('sorting-selected');
                    $(this).addClass('sorting-selected');
                
                
                    var startCol = $("#"+baseShiftClickItem).closest("ul").attr("id");
               
                    var endCol = $(this).closest("ul").attr("id");
                
                    var startIndex = $("#"+baseShiftClickItem).parent().index(); 
                   
                    var endIndex = $(this).parent().index(); 
               
                    if (startCol == endCol)
                    {   
                        if (startIndex < endIndex && Math.abs(startIndex - endIndex) != 1)
                        {
                            $("#"+startCol +" li:lt("+endIndex+"):gt("+startIndex+") .card").addClass('sorting-selected');  
                        }
                        else if (Math.abs(startIndex - endIndex) != 1)
                        {
                            $("#"+startCol +" li:lt("+startIndex+"):gt("+endIndex+") .card").addClass('sorting-selected');       
                        }
                    
                    }
                    else
                    {
                        var startColKey = parseInt(startCol.substr(7));
                     
                        var endColKey = parseInt(endCol.substr(7));
                        $(".column").filter(function(){
                            var colID = $(this).attr("id");
                       
                            //Grtabs the number part of our column id                       
                            var colKey = parseInt(colID.substr(7));
                       
                            if (startColKey < endColKey)
                            {
                                if (colKey > startColKey && colKey < endColKey)
                                {
                                    return true;
                                }                                
                            }
                            else
                            {
                                if (colKey < startColKey && colKey > endColKey)
                                {
                                    return true;
                                }   
                            }
                        
                            return false;
                            
                        }).find(".card").addClass("sorting-selected"); 
                    
                        if (startColKey < endColKey)
                        {
                            $("#"+startCol+" li:gt("+startIndex+") .card").addClass("sorting-selected");
                            $("#"+endCol+" li:lt("+endIndex+") .card").addClass("sorting-selected");
                        }
                        else
                        {
                            $("#"+startCol+" li:lt("+startIndex+") .card").addClass("sorting-selected");
                            $("#"+endCol+" li:gt("+endIndex+") .card").addClass("sorting-selected");     
                        }
                    }
                }                
            }
            else
            {
                $('.sorting-selected').removeClass('sorting-selected');             
            }
        
            if ($('.sorting-selected').length == 1)
            {
                baseShiftClickItem = $('.sorting-selected').attr("id");                                
            }
        }
        else
        {
            $(this).removeClass("sorting-selected");
        }
    });    
    
    //Add card partameter to this event and call update position on it
    $(document).bind("columnChange", function(event, sender, receiver){
        
        //If the user drags a card into a tablist we want to make sure that it matches the filter being applied 
        if ($("#"+receiver).hasClass("tablists"))
        {
            advancedFilter(tabColumnFilter, ".tablists");
        }
        
        columnWIPCheck(sender);
        columnWIPCheck(receiver);
        
    });
       
    $("#dialogAddEditCard").on("click", "#btnCommentSubmit", function(e){
        
        if ($("#commentReplyText").val() != "" )
        {
            //Gets the id of the card to which the comment is being appended
            var cardId = $("#dialogAddEditCard").data("cardId");
                
            sendComment(cardId);
        }
      
    });
    
    //Adds shift-enter submission for the comments section
    $("#dialogAddEditCard").on("keydown", "#commentReplyText",function(event){
        if(event.shiftKey && event.which == 13)
        {
            if ($("#commentReplyText").val() != "" )
            {
                //Gets the id of the card to which the comment is being appended
                var cardId = $("#dialogAddEditCard").data("cardId");
            
                //A card Id eqaul to zero tells us that the Add Card Dialog is open and we don't want to try to add a comment to a card that doesn't exist yet
                if (cardId != 0)
                {
                    sendComment(cardId); 
                }         
            }
        }
    });      
   
    //Handles the tab buttons dynamically
    $(".toolbar").on("click", ".btnTab", function(){
        var tab =  colSortKeyMap[$(this).text()];
        
        //If the column is still loading(ie it is in pre init state)
        if ($("#"+tab).parent().hasClass("loading"))
        {
            tablistCardPopulate(tab);                       
        }               
        
        handleTabLists("#"+tab);                
    });                

    //Handles the add card button
    $("#btnAddCard").click(function(){                    
        addCard();
                    
        //Sets a default value for the coloumn field(this way the context menu's addCard still works)
        $("#Details [name=cf_whichcolumn]").val("Limbo");
    }); 
        
    $("#btnSearchCard").click(function(){
        dialogSearchOpen();        
    });
                
    $("#btnOptions").click(function(){        
        dialogOptionsOpen();
    });               
                   
    $("#searchSubmit").click(function(){
        //want to make sure that all field value have been popluated before submitting a query
        if (!$("#Details").hasClass("loading"))
        {
            //Empties the search cache
            advSearchResults = [];
                    
            //Removes all of the page numbers
            $("#pageNumDiv").empty();
                    
            //The 10 here is a dummy value, will maybe someday be replaced by a user defined number of search results
            var numResults = 10;
                    
            ajaxSearch(numResults,0);
        }
    }); 
                                                                        
    $("#dialogAddEditCard").on("click","#btnAttachmentSubmit" ,function(){
        
        if ($("#attachmentFileName").val() == "" || $("#attachmentFileName").val() == "")
        {
            $("#dialogInvalid p").text("This attachment form requires a valid file name and description");
            
            $( "#dialogInvalid" ).dialog("open");        
            
            return false; 
        }
        else
        {
            $("#Attachments").addClass("loading");
            return true;
        }
    });
                
    //Logs out a user
    $("#btnLogout").click(function(){
        $("#dialogInvalid").dialog({ 
            title: "Are you sure?",
            buttons: {
                Logout: function(){
                    ajaxLogout(); 
                },
                Cancel: function(){
                    $(this).dialog("close")  
                }
            },
            close: function(){
                $("#dialogInvalid").dialog({ 
                    title: "Invalid",
                    buttons: {               
                        Cancel: function(){
                            $(this).dialog("close")  
                        }
                    }
                }); 
            }
        });
        
        $("#dialogInvalid p").text("Are you sure you want to log out of the Kanban Board?")
        
        $("#dialogInvalid").dialog("open");                              
    });
                
                
    //Pulls up the edit menu whenever a card is double clicked                       
    $("body").on( "dblclick", ".card" ,function () {
                    
        if (!$(this).hasClass("loading"))
        {
            $( "#edit-tabs" ).tabs("select", 0);                        
            editCard($(this).data());
        }
                    
    });
                
         
    /*$("#contextMenuCard").on("click","#mb_sortKeyOptions table" ,function(){
        var colId = $($.mbMenu.lastContextMenuEl).attr("id");
        
        var value = reverseKeyLookup(colSortKeyMap, colId);
        
        alert(value);
        
        var sortKey = $(this).find("a").attr("value");                                         
                    
        var order = "desc";
                    
        closeContextMenu();
                    
        sortColumn(value, sortKey, order);
                    
                    
    });*/
                                                        
    //Handles the moveallCards submenu(not the best selector but thats all that would work)
    $("body").on("click","#mb_moveAllCards table" , function(){
        //Finds and saves the column that was right clicked
        var startCol = $($.mbMenu.lastContextMenuEl).attr("id");       
        var endCol = $(this).find("a").attr("value");        
                    
        if (startCol != endCol)
        {
            //Cycles through each card in the specified column and moves them into the ending column
            var colArr = [];
            $("#"+startCol+" .card").each(function(){ 
                
                var card = $(this);
                
                if (!card.hasClass("loading"))
                {                                                     
                    colArr.push(card);     
                }                                        
            });
            
            appendCard(colArr, endCol);            
        }
                    
        closeContextMenu(); 
    });
                
                
    //Handles the moveCardTo submenu moveCardTo
    $("body").on("click" ,"#mb_moveCardTo table" ,function(){                          
        var column = $(this).find("a").attr("value");        
        var card = $($.mbMenu.lastContextMenuEl);                
  
        if (column != card.data("cf_whichcolumn"))
        {
            appendCard(card, column);         
        }                                                              
        closeContextMenu(); 
    });
                
                
    //Handles the edit dialog background color change based off of user selection
    $("#Details").on("change", "select[name=bug_severity]",function () {
        var job = $(this).val();
                   
        dialogDisplay(job);
    });
                
    //When the bug status is chanbged to resolved, Bugzilla requires a valid resolution. This function shows a resolution select field when neccessary
    $("#Details").on("change","select[name=bug_status]" , function () {
        var status = $(this).val();
                    
        //Only adds a new select field if the status is resolved and the Resolution field doesn't already exist
        if (status == "RESOLVED" || status == "CLOSED")
        {
            $("#Details select[name=resolution]").parent().show();            
        }
        else if (status != "RESOLVED" && status != "CLOSED")
        {
            //If the status doesn't equal resolved we remove the resolution box because we can't have a NEW bug with a resolution
            $("#Details select[name=resolution]").parent().hide();
                       
            //We also want to make sure that the resolution field no longer has a value. We also trigger change on this element because we want to get rid of the dupe_of field as well
            $("#Details select[name=resolution]").val("").change();                                    
        }
                   
    });
    
    //When the bug resolution is chanbged to duplicate, Bugzilla requires a valid duplicate bugId. This function shows a duplicate text area select field when neccessary
    $("#Details").on( "change","select[name=resolution]" , function () {
        var resolution = $(this).val();
                    
        //Only adds a new select field if the status is resolved and the Resolution field doesn't already exist
        if (resolution == "DUPLICATE")
        {
            var html = $("<div>");
            html.append("<label>Duplicate of</label>"); 
            html.append("<input  class=' ui-widget-content ui-corner-all' type='text' name='dupe_of'/>");
            $("#detailsLeft").append(html);  
        }
        else 
        {
            $("input[name='dupe_of']").parent().remove();
        }
                   
    });
                                   
    //Populates the components field based off of the selected product
    $("#product").change(function () {
                
        var name = [$(this).val()];
                    
        getCompsVers(name, "Details");
                
    });
                
                
    //Populates the components field of the search menu based off of the selected product                
    $("#searchProduct").change(function () {
        //Grabs the selected values
        var name = $(this).val();                
        getCompsVers(name, "dialgogSearch");
                
    });
                
    //Populates the components field of the search menu based off of the selected product                
    $("#optFilterDiv").on("change","select[name'product']", function () {
        //Grabs the selected values
        var name = $(this).val();
        getCompsVers(name, "dialogOptions");
                
    });
                
    //When the filter options select changes we have two cases: 
    //1.The filter is already on the board in which case we want to change the button to a remove(maybe toggle?)
    //2.The filter is not yet shown and needs to be displayed to the page(which is the default functionality)   
    $("#filterFieldOption").change(function () {
        var field = $(this).val();
        
        if (field != "all")
        { 
            if ($(field).parent().is(":visible") )
            {
                $("#addFilterOption").hide();
                $("#removeFilterOption").show(); 
            }
            else
            {
                $("#removeFilterOption").hide(); 
                $("#addFilterOption").show();
            }
        }
        else
        {
            //If the number of visible filters is equal to the number of total filter we knbow that all of the possible filters are being shown
            if ($("#dialogFilter #optFilterDiv .box select").length == $("#dialogFilter #optFilterDiv .box select:visible").length)
            {
                $("#addFilterOption").hide();
                $("#removeFilterOption").show();
            }                
            else
            {
                $("#removeFilterOption").hide(); 
                $("#addFilterOption").show();    
            }
        }
    });
    
    $("#dialogFilter").on( "click","#addFilterOption" ,function(){                                                                                                         
        var field = $("#filterFieldOption").val();  
        
        if (field != "all")
        {
            //Makes sure any values stored are reset to null(or in this case an empty string "")
            //$("#"+field).val(""); 
                            
            //Shows the field's container
            $(field).parent().show();  
                            
            //Then trigger the change to refresh the button
            $("#filterFieldOption").change();     
        }
        else
        {
           
            
            $("#filterFieldOption option").each(function(){
                var filter = $(this).val();
                if ($(filter).attr("name") != "resolution")
                {
                    $(filter).val("");   
                }
                else
                {
                    //The resolution field has an empty string value so setting it to "" doesn't work. This is a temporary fix
                    $(filter).val("not a resolution");      
                }
               
                $(filter).parent().show();
                
                //Then trigger the change to refresh the button
                $("#filterFieldOption").change();
            });
        }
        
    });
    
    $("#dialogFilter").on( "click","#removeFilterOption" ,function(){                                                                                                         
        var field = $("#filterFieldOption").val();   
                        
        if (field != "all")
        {
            //Hides the field's container
            $(field).parent().hide();
                            
            //Makes sure any values stored are reset to null(or in this case an empty string "")
            $(field).val(""); 
                            
            //Then trigger the change to refresh the button
            $("#filterFieldOption").change();
        }
        else
        {
            $("#filterFieldOption option").each(function(){
                var filter = $(this).val();
                if ($(filter).attr("name") != "resolution")
                {
                    $(filter).val("");   
                }
                else
                {
                    //The resolution field has an empty string value so setting it to "" doesn't work. This is a temporary fix
                    $(filter).val("not a resolution");      
                }
                
                $(filter).parent().hide();
               
                //Then trigger the change to refresh the button
                $("#filterFieldOption").change();
            });
        }
    });   
    
    //Same as above, just for the search dialog   
    $("#searchFieldOption").change(function () {
        var field = $(this).val();
        
        if (field != "all")
        { 
            if ($(field).parent().is(":visible") )
            {
                $("#addSearchField").hide();
                $("#removeSearchField").show(); 
            }
            else
            {
                $("#removeSearchField").hide(); 
                $("#addSearchField").show();
            }
        }
        else
        {
            //If the number of visible filters is equal to the number of total filter we knbow that all of the possible filters are being shown
            if ($("#dialogSearch .box select").length == $("#dialogSearch .box select:visible").length)
            {
                $("#addSearchField").hide();
                $("#removeSearchField").show();
            }                
            else
            {
                $("#removeSearchField").hide(); 
                $("#addSearchField").show();    
            }
        }
    });
    
    $("#dialogSearch").on( "click","#addSearchField" ,function(){
        
        
        var field = $("#searchFieldOption").val();  
        
        if (field != "all")
        {
            //Makes sure any values stored are reset to null(or in this case an empty string "")
            //$("#"+field).val(""); 
                            
            //Shows the field's container
            $(field).parent().show();  
                            
            //Then trigger the change to refresh the button
            $("#searchFieldOption").change();     
        }
        else
        {
            $("#searchFieldOption option").each(function(){
                var filter = $(this).val();
               
                $(filter).val("");
               
                $(filter).parent().show();
                
                //Then trigger the change to refresh the button
                $("#searchFieldOption").change();
            });
        }
        
    });
    
    $("#dialogSearch").on( "click","#removeSearchField" ,function(){ 
        
        var field = $("#searchFieldOption").val();   
                        
        if (field != "all")
        {
            //Hides the field's container
            $(field).parent().hide();
                            
            //Makes sure any values stored are reset to null(or in this case an empty string "")
            $(field).val(""); 
                            
            //Then trigger the change to refresh the button
            $("#searchFieldOption").change();
        }
        else
        {
            $("#searchFieldOption option").each(function(){
                var filter = $(this).val();
               
                $(filter).val("");
               
                $(filter).parent().hide();
               
                //Then trigger the change to refresh the button
                $("#searchFieldOption").change();
            });
        }
    });   
    
    //Sets the priority of the card 
    $("body").on("click", "#mb_setPriority table",function(){                  
                    
        //Finds the anchor
        var a = $(this).find("a");
                    
        //Grabs the anchor's text
        var prio = a.html();

        //Finds which card was right clicked
        var card = $($.mbMenu.lastContextMenuEl);
                    
        var cardId = card.attr("id");
        closeContextMenu();
        if (card.data("priority")!= prio)
        {    
            $.ajax({
                url: "ajax_POST.php",
                type: "POST",
                beforeSend:function(){
                    card.addClass("loading");
                },
                data: { 
                    "method": "Bug.update",
                    "ids":cardId,
                    "priority": prio 
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
                    
                        var lastchangetime = data.result.bugs[0].last_change_time;
                    
                        card.data("last_change_time", stringtoTimeStamp(lastchangetime));
                                    
                        card.data({
                            "priority": prio
                        });
                                    
                        displayHandler(card);
                                    
                        card.removeClass("loading"); 
                    }
                }
            });                                                                                          
        }
    });
                
                
    //This is a helper function that passes a card Id to the attachments and comments tabs
    $("#edit-tabs ul li a").click( function(){
        var tab = $(this).html();
        var id = $("#dialogAddEditCard").data("cardId");
                   
        if (tab == "Attachments")
        {
            getAttachments(id);
        }
    });
      
    $("#accordion").on("click",".commentReplyLink" ,function(e){
        e.stopPropagation();
        var ids = $(this).closest("div").attr("id");
        var quote = "(In response to "+ids+"): '"+$("#"+ids+" p").text()+"'\n";

        $("#commentReplyText").val(quote);
    }); 
    
    $('#accordion').on("click",'.header' ,function() {
        $(this).next().toggle("slow");
        return false;
        
        $('.header').next().hide();
    });
    
                
    $("#attachmentTable").on("click", "tbody tr a",function(e){
        e.preventDefault();
        var id = $(this).attr("value");
        $("#secretIFrame").attr("src","ajax_DownloadAttachment.php?id="+id);
                 
    });
                                                      
    $( "#bugs tbody" ).on("click", "tr td a", function (e){
        e.preventDefault();
        var cardId = $(this).text();
        
        var data = $("#"+cardId).data();
        
        if (data != undefined)
        {
            editCard(data); 
        }
        else
        {
            $("#dialogInvalid p").text("This bug is not available because you have not opened its column. Open the tab-columns and search again to edit this bug.");
            $("#dialogInvalid").dialog("open");
        }
        
      
    });           
    
    //Here I will add my simple quick search filter
    $("#quickSearchTextBox").keyup(function(){
        var key =  $("#quickSearchTextBox").val();       
                
        //Since this text box is in the toolbar we know we want to search the .columns and visible tablists
        var container = $(".column, .tablists:visible");
        
        var field = $("#quickSearchField").val();
                
        quickCardSearch(key, container, field);
                 
    });
    
    $("#quickSearchTextBox").attr("title", "Enter a paramter value to search for.\nTo seach for a literal string use ' or \"");
   
    //In case somebody is tricky and changes the field from above with text in the text box
    $("#quickSearchField").change(function(){
        $("#quickSearchTextBox").keyup(); 
    });
   
   
    /*--------------Plugin Implementation-----------------------*/
                
              
    //Initializes the board's column context menu(may need to add this to the success of the column build call)
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
                
   
/*----------------------Other--------------------------------*/                                             
});
              
              
              
/*--------------------End Document.Ready------------------------*/
                                           
//Method that opens, closes, and switches the tabs appropriately
function handleTabLists(tablist){
    var container = $(tablist).parent();
    if (container.is(":visible"))
    {
        container.hide(1000);
        $(tablist).sortable( "disable" ); 
    }
    else
    {
        $(".tablistsCon").each(function(){
            if ($(this).is(":visible"))
            {
                $(this).hide();
                $(tablist).sortable( "disable" );
            }
        });
        container.show();
        $(tablist).sortable( "enable" );
    }
    
    //Triggers the key up event on the quick seatrch effictly searching the newly opened tablist as soon as it is opened
    $("#quickSearchTextBox").keyup();
}

function closeContextMenu(){
    $.fn.removeMbMenu($.mbMenu.options.actualMenuOpener);
} 

function getAttachments(id)
{
    var card = $("#"+id);

    if (card.data("attachments") == null)
    {
        $.ajax({
            url: "ajax_POST.php",
            type: "POST",  
            beforeSend: function(){
                $("#attTableDiv").addClass("loading");  
            },
            data:{
                "method": "Bug.attachments",
                "ids": id,
                "exclude_fields": ["data"]
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
                else{                               
                    card.data({
                        "attachments": data.result.bugs[id]
                    });

                    postAttachments(card);

                    $("#attTableDiv").removeClass("loading");
                }                      


            },
            error: function(jqXHR, textStatus, errorThrown){
                alert("There was an error:" + textStatus);
            }
        });
    }

    else {
        postAttachments(card);
    }
}

function postAttachments(card)
{
    $("#attachmentTable tbody").empty();                           

    var attachments = card.data("attachments");
    
    if (attachments.length)
    {
        for ( var i in attachments)
        {
            var att = attachments[i];                                
            var date = new Date(stringtoTimeStamp(att.creation_time));
            var time = date.getHours()+":"+padtoTwo(date.getMinutes());
            date = date.getFullYear() + "-" + padtoTwo((date.getMonth() + 1)) +"-" + padtoTwo(date.getDate());               
            var patch = (att.is_patch) ? ", patch" : "";

            var tr = '<tr><td><div><a href="#" value="'+att.id+'">'+att.summary+'</a> ('+att.file_name+patch+')</div><div>'+date+' '+time+', '+att.creator +'</div></td></tr>';
            $("#attachmentTable tbody").append(tr);                                                               
        }      
    }
    else
    {                                               
        var trNone = '<tr><td><div>No Attachments to Display</div></td></tr>';
        $("#attachmentTable tbody").append(trNone);              
    }
   
}                     

//Retrieves all of the available components and versions for a given product. Now revised to pull down all the products and components once and then reuse the info
function getCompsVers(name, dialogID){

    //This case handles when the product names have already been appended and the caller only wants getCompsVers to change the field value
    if ($("#product option").length != 0)
    {
        compsVersFieldPopulate(name, dialogID);            
    }
    else 
    {
        //This case handles when the product names have not been appended and the caller wants the new values to be appended for the first time, also want to refresh any open dialog
        //This function works by queueing the calls made and perfroming them only when the name ajax calls comeplete
        $.when(getCompsVersXHR,getNamesXHR).done(function(){

            if ($("#dialogAddEditCard").dialog("isOpen"))
            {
                var card = $("#"+$("#dialogAddEditCard").data("cardId"));                
                dialogFields(card.data());
            }

            //This line triggers the search page's 'change' function which then updates the component field to be non empty
            $("#searchProduct, #optFilterDiv select[name='product']").change();

            compsVersFieldPopulate(name, dialogID);
            
            //We need to wait until all the values in all the fields are entered so we call dialogFilter options with a false condition(loads everything but doesn't open)
            dialogOptionsOpen(false);
            
            dialogSearchOpen(false);
              
            
            //Triggers the filter select 
            $("#filterFieldOption").change();
   
        });  
    }                                                                   
}

function compsVersFieldPopulate(name, dialogID)
{
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
                comp = componentData[j].values[k].name;
                option = $("<option>").val(comp).html(comp);
                $("#"+dialogID+" select[name="+fieldName+"]").append(option);
            }                                                                                                 
        }                                                                                                     
    }        
}

//Here I have separated the field population and dialog configuration to allow getCompsVers to refresh the fields after it finishes loading
function dialogFields(fieldVals)
{    
    //To prevent changing things that I don't want to, we creatre a true copy of the fieldValues
    var fieldValues =  $.extend({}, fieldVals);
    
    
    //Note that the Add Card Dialog is set so that the tabs have a valuer of 0. We only want specific values for the edit dialog
    if (fieldVals != null)
    { //This method has been modified to allow for immediate retireval(the components and versions are stored, ajax only called once)
        getCompsVers([fieldValues["product"]], "Details");
        //Changes the edit dialog to have the correct fields for the selected card's Product.         
         
        //Changes the cf_whichcolumn to have the correct title(if it isnt correct already)
        if (reverseKeyLookup(colSortKeyMap, fieldValues["cf_whichcolumn"]) != -1)
        {
            fieldValues["cf_whichcolumn"] = reverseKeyLookup(colSortKeyMap, fieldValues["cf_whichcolumn"]);
        }
        
        //Populates the fields                
        for (var field in fieldValues)
        {
            if (reverseKeyLookup(bugzillaFieldtoParam, field) != -1)
            {
                var translatedField =  reverseKeyLookup(bugzillaFieldtoParam, field); 
            }
            else
            {
                translatedField = field;    
            }
            $("#Details [name="+translatedField+"]").val(fieldValues[field]);   
        }
   
        if (fieldValues["resolution"] != "" && fieldValues["resolution"] != undefined)
        {
            $("#Details select[name=resolution]").parent().show();
            $("#Details select[name=resolution]").val(fieldValues["resolution"]);
            
            if (fieldValues["resolution"] == "DUPLICATE")
            {                
                var html = $("<div>");
                html.append("<label>Duplicate of</label>"); 
                html.append("<input  class=' ui-widget-content ui-corner-all' type='text' name='dupe_of'/>");
                $("#detailsLeft").append(html);
                $("#Details select[name=dupe_of]").val(fieldValues["dupe_of"]);
                
            }
            else
            {
                $("#Details select[name=dupe_of]").parent().hide();
                $("#Details select[name=dupe_of]").val("");   
            }
        }
        else
        {
            $("#Details select[name=resolution]").parent().hide();     
        }
        $("#attachmentBugId").val(fieldValues["id"]);

        //Sets the dialog background to the correct color
        dialogDisplay(fieldValues["severity"]);
    }
    else {
        //If fieldValues is null then we know that we are in the add card dialog and consequently we want to ensure that all fields are empty(including the comments)
        $("#Details input, #Details textarea, #Details select:not([name=cf_whichcolumn])").val("");    

        //We want the default value for Status for a new card to be "OPEN", not unconfirmed
        $("#Details select[name=bug_status]").val("OPEN");

        //Sets the default priority to medium
        $("#Details select[name=priority]").val("Medium");

        //A new card should never have a resolution 
        $("#Details select[name=resolution]").parent().hide();        

        var first = $("#Details select[name=bug_severity] option").first().val();                
        dialogDisplay(first);

        getCompsVers([$("#Details select[name=product]").val()], "Details");

        getCompsVers([$("#Details select[name=product]").val()], "dialogOptions");

    }
}

function editCard(fieldVals) { 

    //To prevent changing things that I don't want to, we creatre a true copy of the fieldValues
    var fieldValues =  $.extend({}, fieldVals);

    var cardId = fieldValues["id"];

    $("#dialogAddEditCard").data("cardId", cardId);

    var lastEditTime = new Date(fieldValues["last_change_time"]);

    lastEditTime = lastEditTime.toLocaleDateString() + " at " + lastEditTime.toLocaleTimeString();

    //Adds edit specifc dialog properties
    $("#dialogAddEditCard").dialog( "option", "title", "Edit Card #"+cardId+"(Last Edited: " + lastEditTime +")");
    $("#edit-tabs ul li").show();
   
    //Now that we have the correct ID, we populate the fields:
    dialogFields(fieldValues);

    //Pulls down the comments when dialog is opened
    getComments(cardId);                

    $( "#dialogAddEditCard" ).dialog( "option", "buttons", { 
        "Save Card": function() {                                                                                                

            //checks to make sure that the dialog isn't still loading
            if (!$("#Details").hasClass("loading"))
            {                                                                
                //Sends a comment on save if the user forgets to 
                if (typeof($("#commentReplyText").val()) != "undefined" && $("#commentReplyText").val() != "")
                {
                    sendComment(cardId);    
                }

                var col = $("#Details select[name='cf_whichcolumn']").val();
                
                var status =  $("#Details select[name='bug_status']").val();
           
                if ($("input[name=dupe_of]").length && $("input[name=dupe_of]").val() == "")
                {
                    $("#dialogInvalid p").text("You must specify a valid bug ID if this bug is a duplicate");
                    
                    $("#dialogInvalid").dialog("open");                        
                }                                
                else if (allowedColumnMap[status].indexOf(col) == -1)       
                {
                    alert(col + " is not a valid Column choice for the "+status+" status");   
                }
                else
                {
                    //Sends the field info to Bugzilla to be processed
                    ajaxEditBug(); 
                    
                    $( "#dialogAddEditCard" ).dialog( "close" );  
                }                                                                                  
            }


        },
        Cancel: function() {

            $( this ).dialog( "close" );
        }   
    });
    $( "#dialogAddEditCard" ).dialog( "option", "close",function()  {

        //We want to remove any previous comments:
        $("#Comments #accordion div, #Comments #accordion .header").remove();

        //Clears every input values
        $("#Details input, #Details textarea, #Details select").val("");       

        //Clears the attachments
        $("#attachmentTable tbody").empty();   

        //We want to hide this incase it is showing
        $("#Details select[name=resolution]").parent().hide();
        
        $("input[name='dupe_of']").parent().remove();
        
        //We also want to make sure that the resolution field no longer has a value:
        $("#Details select[name=resolution]").val("");


        //And finally we want to clear the add attachment form data
        $("#attachmentFileName, #attachmentDescription, #attachmentComment, #attachmentIsPatch").val("");                                        
    }
    );   
    $( "#dialogAddEditCard" ).dialog( "open" );

}

function addCard() { 

    $("#dialogAddEditCard").data("cardId", 0);

    //Adds add card specifc dialog properties
    $("#edit-tabs ul li:not(:first-child)").hide();
    $( "#edit-tabs" ).tabs("select", 0);               
    $("#dialogAddEditCard").dialog( "option", "title", "Add Card" );              

    var label = $('<label for="commentReplyText">').text("Description:");
    var text = $('<textarea id="commentReplyText" class="text ui-widget-content ui-corner-all" style="height: 250px;" name="description">').attr("title", "Hold shift and enter to submit comment or click send");
    var comm = $('<div class="commDiv">').append(text);                      
    $("label[for=Comments],#Comments").hide();
    $("#detailsRight").prepend(label,comm); 

    //Now that we have the correct ID, we populate the fields:
    dialogFields(null);

    $( "#dialogAddEditCard" ).dialog( "option", "buttons", { 
        "Save Card": function() {
            //Want to make sure all of the fields have loaded before allowing the use of the save button
            if (!$("#Details").hasClass("loading"))
            {
                var col = $("#Details select[name='cf_whichcolumn']").val();
                
                var status =  $("#Details select[name='bug_status']").val();                             
                
                if($( "#Details textarea[name=summary]" ).val()=="" || $("#commentReplyText").val() == "")
                {
                    $("#dialogInvalid p").text("You must specify a valid title and description");
                    
                    $("#dialogInvalid").dialog("open");
                }
                else if (allowedColumnMap[status].indexOf(col) == -1)       
                {
                    alert(col + " is not a valid Column choice for the "+status+" status");   
                }
                else
                {                                  
                    var div = $("<div class='loadingLabel'>Adding Card</div>");
                    $("#Details .modal").empty().append(div);
                    //Files a new bug in the bugzilla server
                    ajaxCreateCard();                                                                                       
                }
            }
        },
        Cancel: function() {
            $( this ).dialog( "close" );

        }   
    });
    $( "#dialogAddEditCard" ).dialog( "option", "close",function()  {

        $("#Details input, #Details textarea, #Details select").val("");

        //Clears the description
        $("#detailsRight label[for=commentReplyText],#detailsRight .commDiv").remove();

        //Shows the comments div again
        $("label[for=Comments],#Comments").show();
    }
    );   
    $( "#dialogAddEditCard" ).dialog( "open" );

}                                

function editCardContextMenu() { 
    var id = $($.mbMenu.lastContextMenuEl).attr("id");
    var data = $("#"+id).data();
    editCard(data);
}           

function addCardToCol() {
    //Finds and saves the column that was right clicked
    var startCol = $($.mbMenu.lastContextMenuEl).attr("id"); 
    
    var value = reverseKeyLookup(colSortKeyMap, startCol);
    
    //Presets the form to open with the correct column selected                
    $("#Details select[name=cf_whichcolumn]").val(value);
    addCard();
}

function editView(index){
    $( "#edit-tabs" ).tabs("select", index);

    editCardContextMenu();

    //Handles special case when the Attachments button is selected
    if (index == 1){                     
        //Gets the ID of the current card being edited
        var cardId = $($.mbMenu.lastContextMenuEl).attr("id"); 
        getAttachments(cardId);
    }
}                       



function daysUntil(year, month, day) {
    var now = new Date(),
    dateEnd = new Date(year, month, day), 
    days = (dateEnd - now) / 1000/60/60/24;   // convert milliseconds to days

    //This function previously rounded when noon came around. Now it always rounds up which ius more consistent which our perception of time
    return Math.ceil(days);
}

function dialogDisplay(job){
    if (job != null)
    {
        job = job.replace(/\s+/g, '');
        $("#Details").css("background-color", jobMap[job]);
    }
    else {
        //This will be our default case.
        $("#Details").css("background-color", "white");
    }

}

//Card creation function, adds the card to the page. Need the following Bugzilla parameters: product, component, version, severity, priority. 
//NOTE: Apprently description can be passed in with this Bug.create
function  ajaxCreateCard(){ 
    
    var postData = {};
    $("#detailsTop textarea, #detailsLeft input, #detailsLeft select, #detailsLeft textarea, #detailsRight textarea").each(function(){       
        var name = $(this).attr("name");
       
        if (typeof(bugzillaFieldtoParam[name]) != "undefined")
        {
            name =  bugzillaFieldtoParam[name]; 
        }        
       
        postData[name] = $(this).val();
    });   
    
    postData["method"] = "Bug.create";
   
    delete postData["resolution"];

    
    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        beforeSend: function(){                        
            $("#Details").addClass("loading");
        },
        data: postData,
        dataType: "json",
        success: function(data){

            if (data.result.faultString != null)
            {
                alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                $("#Details").removeClass("loading");
                $("#Details .loadingLabel").remove();
            }
            else if (!data.result)
            {
                alert("Something is wrong");
                $("#Details").removeClass("loading");
                $("#Details .loadingLabel").remove();
            }
            else 
            {
                //Card creation logic will be placed here as soon as the Bug.create/Bug.update issues have been resolved
                //The Bugzilla Documentation states that the create method will only return the new ID upon completion
                var id = data.result.id;
                alert("Bug succesfully added.\nID:"+id);                
                
                postData["last_change_time"] = new Date().toISOString();
                
                postData["resolution"] = "";
                
                postData["dupe_of"] = null;
                
                postData["id"] = id;
                
                //Now that we have the new card's Id we can post it to the board:(Note that reolution will be an empty string
                postCard(postData);
                $("#Details").removeClass("loading");
                $("#Details .loadingLabel").remove();
                $( "#dialogAddEditCard" ).dialog( "close" ); 
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
                    closeOnMouseOut:true,
                    onContextualMenu:function(o,e){}
                });
                
                //Checks to make sure we arent exceeding anything
                columnWIPCheck(postData["cf_whichcolumn"]);
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    });               

}

//Posts a card to the page containing all of the propper information. Used to post new cards and also to populate the board with existing cards
function postCard(data){
    var newCard = $('<div id="'+data["id"]+'" class="card "><div class="cardText">(#'+data["id"]+') '+data["summary"]+'</div><div class="iconBar"></div><div class="modal"><div>Saving Card</div></div></div>');

    newCard.addClass("cmVoice {cMenu:\'contextMenuCard\'}, normal");
    
     

    //Puts the time in the correct format
    data["last_change_time"] = stringtoTimeStamp(data["last_change_time"]);
    
    //We store the backend column as the backend name for the column
    data["cf_whichcolumn"] = colSortKeyMap[data["cf_whichcolumn"]];  
    
    //We pass in the status because it is not saved yet
    appendCard(newCard, data["cf_whichcolumn"], data["status"]);
    
    $.extend(newCard.data(), data);

    
    displayHandler(newCard);
}


//NOTE: This function is dependent on the existance of the Bugzilla cf_whichcolumn custom field
function ajaxEditBug()
{  
    var ids =  $("#dialogAddEditCard").data("cardId");
    
    var card = $("#"+ids);
    
    //Adds loading icon to a card being saved
    card.addClass("loading");
    
    var postData = {};
    $("#detailsTop textarea, #detailsLeft input, #detailsLeft select, #detailsLeft textarea").each(function(){       
        var name = $(this).attr("name");
       
        if (typeof(bugzillaFieldtoParam[name]) != "undefined")
        {
            name =  bugzillaFieldtoParam[name]; 
        }        
       
        postData[name] = $(this).val();
    });
    

    cardChangeData[ids] = $.extend({}, card.data(), postData);     

    //If the Bug has no resolution we don't want to post anything':
    if (postData["resolution"] == undefined || postData["resolution"] == "")
    {
        delete postData["resolution"];
    }
    
    //If the deadline is an empty string and the bug has no deadline entry then we need not send it to bugzilla
    if (postData["deadline"] == "" && typeof(card.data("deadline")) == "undefined")
    {
        delete postData["deadline"]   
    }
    //Handles duplicate case according to Bugzilla API: "If you want to mark a bug as a duplicate, the safest thing to do is to set this value and not set the status or resolution fields. 
    //They will automatically be set by Bugzilla to the appropriate values for duplicate bugs."
    if (postData["resolution"] == "DUPLICATE")
    {
        delete postData["resolution"];
        
        delete postData["status"];                       
    }
    

    //If we aren't changing anything about the bug there isn't any reason to update so we remove unneccessary values:
    for (var index in postData)
    {
        //If it is the same as before or equal to an empty string(ie not adding any new information)
        if (postData[index] == card.data(index))
        {
            //remove it from the data being posted
            delete postData[index];
        }                   
    } 
    
    //Need to do a special case for cf_which column because it is the only one that is different that Bugzilla
    if (colSortKeyMap[postData["cf_whichcolumn"]] == card.data("cf_whichcolumn"))
    {
        delete postData["cf_whichcolumn"];    
    }
    
    
    //Then after we filtered out the unneccary fields we need to check if anything is left, otherwise there is no need to send the post
    if (!$.isEmptyObject(postData))
    {
        //Now we add some specific property for post data that need to be sent no matter what:
        postData["method"] = "Bug.update";                    
        postData["ids"]= ids;

        $.ajax({
            url: "ajax_POST.php",
            type: "POST",
            data: postData,
            dataType: "json",
            success: function(data){

                if (data.result.faultString != null)
                {
                    alert(data.result.faultString+'\nError Code: '+data.result.faultCode);

                    //If an error occurs we reopen the edit card dialog with the freshly entered form data
                    editCard(cardChangeData[ids]);

                }
                else if (!data.result)
                {
                    alert("Something is wrong");

                    //If an error occurs we reopen the edit card dialog with the freshly entered form data
                    editCard(cardChangeData[ids]);
                }
                else 
                {      
                    cardChangeData[ids]["cf_whichcolumn"] = colSortKeyMap[cardChangeData[ids]["cf_whichcolumn"]];
                    
                    var oldCol = card.data("cf_whichcolumn" );
                                                                            
                    if (oldCol != cardChangeData[ids]["cf_whichcolumn"] || reverseKeyLookup(colSortKeyMap, cardChangeData[ids]["cf_whichcolumn"] ) == "---")
                    {
                        appendCard(card, cardChangeData[ids]["cf_whichcolumn"], cardChangeData[ids]["status"]);  
                    }
                          
                    //Here we save the changeData to the local
                    card.data(cardChangeData[ids]);
                    
                    //Then delete the changeData
                    delete cardChangeData[ids];

                    //Updates the card's text
                    $('#'+ids+" .cardText").html("(#"+ids+") "+card.data("summary"));

                    displayHandler(card);
                    
                    var lastchangetime = data.result.bugs[0].last_change_time;
                    
                    card.data("last_change_time", stringtoTimeStamp(lastchangetime));
                }
                card.removeClass("loading");

            },
            error: function(jqXHR, textStatus, errorThrown){
                alert("There was an error:" + textStatus);
            }

        });

    }
    else
    {
        card.removeClass("loading");    
    }


}

//An update function that stores a card position when called
function updatePosition(column, cardIds)
{
    //This function expects an array so if the input is not not an array we will make it one:
    if (!$.isArray(cardIds))
    {
        cardIds = [cardIds];
    }
    
    //This function takes in either the bugzilla column or the local column id so these lines set the id correctly
    if (colSortKeyMap[column] == undefined)    
    {    
        var bugzillaColumn = reverseKeyLookup(colSortKeyMap, column);    
    }
    else
    {
        bugzillaColumn = column;     
    }
    //Automatically updates the card's position both in local data and server data. Waiting on Bug.update Resolution                                                
    $.ajax({
        url: "ajax_POST.php",
        beforeSend: function(){
            for (var i in cardIds) { 
                $("#"+cardIds[i]).addClass("loading");
            }
        },
        type: "POST",
        data: { 
            "method": "Bug.update",
            "ids": cardIds,                        
            "cf_whichcolumn": bugzillaColumn
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
                var lastchangetime = data.result.bugs[0].last_change_time;   
                
                for (var i in cardIds) { 
                    var card = $("#"+cardIds[i]);
                    
                    card.data("last_change_time", stringtoTimeStamp(lastchangetime));
                                     
                    card.data({                                
                        "cf_whichcolumn": column                                    
                    });
                    
                    card.removeClass("loading");
                }                                                                                                           
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    });                                                


}

var advSearchResults = [];

function ajaxSearch(limit, pageNum) { 

   

    //Checks to see if we already have this page's search results. If not we retrieve the results from bugzilla. If we already have them we simply access the cache. 
    if (typeof(advSearchResults[pageNum]) == "undefined")
    {                                                                                     
        var searchArr = {};
            
        if ($("#dialogSearch .box:visible").length)
        {      
            //Finds all of the selected values in boxes that are visible
            $("#dialogSearch .box:visible select, #searchSummary").each(function(){ 
                //Grabs the field's parameter data storing the bugzilla parameter name
                var name = $(this).attr("name");  
            
                //Checks to see if the field name in question is found in the fieldtoparam map and if so switches the fields accordingly
                if (typeof(bugzillaFieldtoParam[name])!="undefined")
                {
                    name =  bugzillaFieldtoParam[name];
                }
           
                var value = $(this).val();
            
                searchArr[name] = value;
            });
        }
       
        //Removes all null values and makes array switches if neccessary
        for (var index in searchArr)
        {
            if (searchArr[index] == null)
            {
                delete searchArr[index];
            }
            else 
            {
                //If the value is not an array
                if ( ! $.isArray(searchArr[index]))
                {                                    
                    //Turn it into an array
                    searchArr[index] = [searchArr[index]];
                } 
            }
        }                                               

        //Now we want to add the Summary if neccessary
        if ($("#searchSummary").val() != "" && $("#searchSummary").val() != null)
        {
            searchArr["summary"] = $("#searchSummary").val();                         
        }

        //This sets the offset to be exact where we want it after the page is changed
        var offset = pageNum * limit;

        //Adds the method after the above for loop because we dont want the method to be in an array
        searchArr["method"] = "Bug.search";

        searchArr["offset"] = offset;

        searchArr["limit"] = limit;

        $.ajax({
            url: "ajax_POST.php",
            type: "POST",
            dataType: "json",
            beforeSend: function() {
                $('#bugs-contain').addClass("loading"); 
            },
            data: searchArr,

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
                    processAjaxSearchResults();
                    $('#bugs-contain').removeClass("loading");

                    //For page numbers we want to append an anchor for each page we download:
                    var pageLink = $("<button id='page"+pageNum+"' class='btnTab' style='float: left'>").html(pageNum+1);
                    pageLink.click(function(){
                        ajaxSearch(limit, pageNum);
                    });
                    $("#Results #pageNumDiv").append(pageLink);
                    pageLink.button();
                }

            },
            error: function(jqXHR, textStatus, errorThrown){
                alert("There was an error:" + textStatus);
            }
        }); 
    } 
    else{
        processAjaxSearchResults();
    }

    //
    function processAjaxSearchResults(){
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
                var data = $("#"+bug[i].id).data();
                               
                if (data == undefined)
                {
                    var tr = "<tr><td><a href='#' class='unavailableID'>"+bug[i].id+"</a></td>";
                }
                else
                {
                    tr = "<tr><td><a href='#'>"+bug[i].id+"</a></td>";
                }
                
                tr += "<td>"+bug[i].product+"</td>" + 
                "<td>"+bug[i].version+"</td>" +
                "<td>"+bug[i].assigned_to+"</td>" +
                "<td>"+bug[i].status+"</td>" +
                "<td>"+bug[i].resolution+"</td>" +
                "<td>"+bug[i].summary+"</td>" +
                "</tr>";
                
                $( "#bugs tbody" ).append(tr);                                           
            }
            
            $( "#bugs tbody tr td a").each(function(){
                if ($(this).hasClass("unavailableID"))
                {
                    $( "#bugs-contain p").text("*Bugs in red are not available for revision because you have not opened the tab column in which they are contained")
                    return false;
                }
                else
                {
                    $( "#bugs-contain p").text("");  
                }
            });
        }

        //This line finds the number of rows(that is the the number of results) in our table. We subtract 1 to account for the header
        var row = ($("#bugs tr").length - 1);

        //This statement ensures that a "next" button will only be appended if there are more results to show(if the specified limit divides the number of results the
        //user will still be able to access the last empy page)
        if (row == limit)
        {
            var next = $("<button id='next' class='btnTab' style='float: right'>").html("Next");
            next.click(function(){
                ajaxSearch(limit, pageNum+1);
            });
            $("#Results").append(next);
            next.button();
        }

        if (pageNum != 0)
        {
            var prev = $("<button id='prev' class='btnTab' style='float: left'>").html("Previous");
            prev.click(function(){
                ajaxSearch(limit, pageNum-1);
            });

            $("#Results").append(prev);
            prev.button();
        }
        else if (pageNum <=0 && $("#prev").length > 0)
        {
            $("#prev").remove();
        }
    }
}

//Gets a given card's comments and posts them to the Comments tab 
function getComments(ids) { 

    var card = $("#"+ids);

    //We only want to pull down the card's comments once to save time
    if (card.data("comments") == null)               
    {
        $.ajax({
            url: "ajax_POST.php",
            type: "POST",
            dataType: "json",
            beforeSend: function() {
                $('#Comments').addClass("loading"); 
            },
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
                    postComments(card);
                } 

            },
            error: function(jqXHR, textStatus, errorThrown){
                alert("There was an error:" + textStatus);
            }
        }); 
    }  
    else {
        postComments(card);
    }

}

function postComments(card){

    //First and foremost we need to make sure that the dialog we are appending comments tyo is still the dialog we want and it is still open:
    if ($("#dialogAddEditCard").data("cardId") == card.data("id"))
    {
        //First we want to remove any previous comments:
        $("#Comments #accordion div, #Comments #accordion .header").each(function(){
            $(this).remove();
        });

        //Now we want to add the comment textbox
        var header = $('<h3 class="header">').text("Comment:");
        var text = $('<textarea id="commentReplyText" class="text ui-widget-content ui-corner-all" name="description">').attr("title", "Hold shift and enter to submit comment or click send");
        var button = $("<button id='btnCommentSubmit'>Send</button>");
        var comm = $('<div class="commDiv">').append(text,button);                      
        $("#Comments #accordion").prepend(header,comm);
        $("#btnCommentSubmit").button();       

        //Now that we have the comment data, we want to post it to the comments tab
        var comArr = card.data("comments");
        for (var i in comArr)
        {   
            //The first(zeroith) comment is actually the bug description so we will label it accordingly
            if (i == 0)
            {
                var commId = "Description";     
            }
            else
            {
                commId = "Comment"+i;         
            }                    
            var commText = comArr[i].text;
            var commAuthor = comArr[i].author;
            var date = new Date(stringtoTimeStamp(comArr[i].time));
            var time = date.getHours()+":"+padtoTwo(date.getMinutes());
            date = date.getFullYear() + "-" + padtoTwo((date.getMonth() + 1)) +"-" + padtoTwo(date.getDate());
            
            var table = $("<table style='width: 100%;'><tbody></tbody></table>");
            
            var anchorAuthor =  $('<a href="#">').text(commAuthor);
            var anchorName = $('<a href="#'+commId+'"  style="float: right; margin-right: 5px">').text(commId);
            var spanTime = $('<span style="margin-left: 5px;">').text(date+" "+time);                    
            var anchorReply = $('<a href="#" class="commentReplyLink" style="float: right;">').text("Reply");
            
            var td1 = $("<td>").append(anchorAuthor);
            var td2 = $("<td>").append(spanTime);
            var td3 = $("<td>").append(anchorReply);
            var td4 = $("<td>").append(anchorName);
            
            var tr = $("<tr>");
            tr.append(td1,td2, td3, td4);  
            
            var headerinfo = $('<h3 class="header">').append(table.append(tr));
            var p = $('<p>').text(commText);
            var commDiv = $('<div class="commDiv" id="'+commId+'">').append(headerinfo, p);                      
            $("#Comments #accordion").append(commDiv);
        }       

        $('#Comments').removeClass("loading");
    }
}
         

function sendComment(cardId)
{

    var comment = $("#commentReplyText").val();

    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        dataType: "json",
        beforeSend: function() {
            $('#Comments').addClass("loading"); 
        },
        data: {                        
            "method": "Bug.add_comment",
            "id": cardId,
            "comment": comment
        },

        success: function(data){                       
            if (data.result.faultString != null)
            {
                alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
                $('#Comments').removeClass("loading");
            }
            else if (!data.result)
            {
                alert("Something is wrong");
                $('#Comments').removeClass("loading");
            }
            else 
            {                                                        
                //Now that we have successfully posted a comment, we are going to pretend that bugzilla gave us all the data back and save the data 
                //First we need the current time
                var now = new Date();

                //Now we need to put the info in the right format: 
                commentObject = {
                    //We know that the author isa the user that is logged in(my username will be replaced but the $_SESSION["login"] eventually
                    "author": userEmail,
                    "bug_id": cardId,
                    "creator": userEmail,
                    "id": data.result.id,
                    "text": comment,
                    //Bugzilla would return the time in an ISO string
                    "time": now.toISOString()
                };

                //Here we store the above comment data to the comments section of the card
                if ($("#"+cardId).data("comments") != null || $("#"+cardId).data("comments") != undefined)
                {
                    $("#"+cardId).data("comments").push(commentObject);
                }
                else 
                {
                    var commArr = [];
                    commArr.push(commentObject);
                    $("#"+cardId).data("comments", commArr)
                }

                //Now that the comment data has been stored, we want to post it but only if the correct dialog is open. I ran into issues where this was called when the next dialog was already
                //open. SO we solve this issue by simply checking to make sure the right dialog is open
                if ($("#dialogAddEditCard").data("cardId") == cardId)
                {
                    getComments(cardId);                                                                   
                }

            }                        
        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    }); 

}

function ajaxUploadCallBack(data){
    
    if (data.error != null)
    {
        alert('PHP Error:'+data.error); 
        $('#Comments, #addAttTableDiv').removeClass("loading");
        return false;
    }    
    else if (data.result.faultString != null)
    {
        alert(data.result.faultString+'\nError Code: '+data.result.faultCode);
        
        $('#Comments, #addAttTableDiv').removeClass("loading");  
    }
    else if (!data.result)
    {
        alert("Something is wrong");
        
        $('#Comments, #addAttTableDiv').removeClass("loading");  
    }
    else 
    {                                        
        for (var i in data.result.attachments) {
            alert("Added Attachment ID: " + i);


            //In a simlar manner to the sendComments Function, we need to update thge comments with the addition of the comment for this attachment:

            //Now that we have successfully posted a comment, we are going to pretend that bugzilla gave us all the data back and save the data             
            var comment = "Created attachment " + data.result.attachments[i].id+ " " + data.result.attachments[i].summary;

            var cardId = data.result.attachments[i].bug_id;

            //Now we need to put the info in the right format: 
            commentObject = {
                //We know that the author isa the user that is logged in(my username will be replaced but the $_SESSION["login"] eventually
                "author": data.result.attachments[i].attacher,
                "bug_id": cardId,
                "creator": data.result.attachments[i].creator,
                "id": data.result.attachments[i].id,
                "text": comment,            
                "time": data.result.attachments[i].creation_time
            };

            //Here we store the above comment data to the comments section of the card
            if ($("#"+cardId).data("comments") != null || $("#"+cardId).data("comments") != undefined)
            {
                $("#"+cardId).data("comments").push(commentObject);
            }
            else 
            {
                var commArr = [];
                commArr.push(commentObject);
                $("#"+cardId).data("comments", commArr);
            }


            //Here we store the returned attachment data to the attachments section of the card
            if ($("#"+cardId).data("attachments") != null || $("#"+cardId).data("attachments") != undefined)
            {
                $("#"+cardId).data("attachments").push(data.result.attachments[i]);
            }
            else 
            {                                                       
                $("#"+cardId).data("attachments", data.result.attachments[i]);
            }

            //And finally we want to clear the add attachment form data
            $("#attachmentFileName, #attachmentDescription, #attachmentComment, #attachmentIsPatch").val("");

        }

        //Now that the comment data has been stored, we want to post it but only if the correct dialog is open. I ran into issues where this was called when the next dialog was already
        //open. SO we solve this issue by simply checking to make sure the right dialog is open
        if ($("#dialogAddEditCard").data("cardId") == cardId)
        {
            getComments(cardId);

            getAttachments(cardId);

            $('#Comments, #Attachments').removeClass("loading");                        
        }
    } 


}

function sortColumn(colId, sortkey, order)
{                
    var col = $("#"+colId);

    //Sets the default for the ordxer to ascending if, for whatever reason, the order is not one of these settings
    if (order != "asc" && order != "desc")
    {
        order = "asc";
    }      

    $('>li', col).tsort('div',{
        data:sortkey, 
        order:order
    });
}

function boardCardPopulate(){
    
    //We want to populate the board itself but not the tablists so we remove them from the list of possible fields
    var colArr = [];
    for (var col in limitWIP)
    {
        //If the column is not a tablist
        if (tabColumns.indexOf(col) == -1)
        {
            //Add it to the array 
            colArr.push(col);  
        }  
    }
    
    //Need to add this because I am using the limitWIP mpa which doesnt include this field
    colArr.push("---");    
    
    //Finds all bugs that match the board filter criteria and posts them to the board 
    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        beforeSend:function(){
            $("body").addClass("loading");                            
        },
        data:  {
            "method": "Bug.search",
            "cf_whichcolumn": colArr
        }                        
        
        ,
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
                //We need to wait for the columns to be added
                $.when(getFormFieldsXHR).done(function(){
                    //Then we can add the cards
                    for (var i in data.result.bugs)
                    {
                        var bug = data.result.bugs[i];
                        postCard(bug);                                
                    }
               
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
                        closeOnMouseOut:true,
                        onContextualMenu:function(o,e){}
                    });
                    //Need to check each column for WIP limit violations
                    $(".column").each(function(){
                        columnWIPCheck($(this).attr("id"));  
                    });                
                    
                    if (messageArr.length)
                    {
                        var message = "The following changes have been made:\n";
                        for (var j in messageArr)
                        {
                            message +=    messageArr[j] +"\n\n";
                        }
        
                        alert(message);
                        
                        messageArr = [];
                    }
    
                    
                    $("body").removeClass("loading");                                       
                                        
                }); 
                
            }
        }
    });
}

function dialogSearchOpen(condition)
{ 
    //Makes sure we have the correct componenet and versions
    getCompsVers(null, "dialogSearch");
    
    //If the select menu's length is 1 we know that the set up code hasn't been called yet  
    if ($("#dialogSearch #searchFieldOption option").length == 1)
    {     
        //Changes the select fields that were appended to the correct form
        $("#searchFieldsDiv select").each(function(){
            
           
            
            var field = $(this);
           
            //turns it into a multple select
            field.attr("multiple", "multiple");
        
            //Adds the box class which gives the correct styling
            field.parent().addClass("box");
        
            //Adds ther correct syling to the label
            field.siblings("label").addClass("searchLabel");
            
            //Populates thes filter select field
            var option = $("<option>").text(field.siblings("label").text()).val("#searchFieldsDiv select[name="+field.attr("name")+"]");
        
            $("#searchFieldOption").append(option);
            
        });
        
        //We only want the selects to show, not the inputs
        $("#searchFieldsDiv input").parent().remove();
    }
    
    // $("#dialogSearch p").text("Search By");
    
    //Hides all of the fields
    $("#searchFieldsDiv .box select").parent().hide();
      
    //Shows the search summary incase its been hidden  
    $("#searchSummary").parent().show()
    
    if (condition || typeof(condition) == "undefined")
    {
        $("#dialogSearch").dialog("open");     
    }
    
    //Triggers the filter select(after the duialog is open because otherwise the select's are always hidden)
    //Then trigger the change to refresh the button
    $("#searchFieldOption").change();
}

function dialogOptionsOpen(condition)
{    //Populates the fields if they don't already exist
    if (!$("#prioIconTable tbody tr").length)
    {                           
        //This each statement populates the table of color options                      
        $("#Details select[name=priority] option").each(function(){
            var name = $(this).val().replace(/\s+/g, '');
                                              
            //Creater a row in the options dialog for that priority name
            makeRowPrioOptions(name);
        });
    

        //This each statement populates the table of color options                  
        $("#Details select[name=bug_severity] option").each(function(){
            var name = $(this).val().replace(/\s+/g, '');
                                              
            //Creater a row in the options dialog for that job name
            makeRowJobColorOptions(name); 
        });
    
        $("#dialogOptions #prioIconTable tbody tr").each(function(){
            var prioName = $(this).find("td").first().text();
            $(this).find("input[type=radio][value="+prioMap[prioName]+"]").attr("checked","checked").button("refresh");
        });
        
   
        //This each statement populates the table of color options
        $("#Details select[name=bug_status]").first().children().each(function(){
            //get the value
            var name = $(this).val().replace(/\s+/g, '');
                                        
            //Creater a row in the options dialog for that job name
            makeColumnOptions(name);
        });              
        
        //Here we set up the multiple select that specifies the tablist seleccts
        var select = $("#Details select[name=cf_whichcolumn]").clone().attr({
            "multiple": "multiple", 
            "name": "tablists"
        }).show();
        
        var box = $("<div class='box'></div>");
        
        box.append(select);
        
        $("#tablistSpecDiv").append(box);
        
        select.find("option").first().remove();
    
        //This each statement populates the table of WIP limit assignments
        $(".column").each(function(){
            //get the value
            var col = $(this).attr("id");
            
            var value = reverseKeyLookup(colSortKeyMap, col);
            
            //Create a row in the options dialog for that column name
            makeRowWIPSet(value);
        });
     
    
    }           
    
    //Sets the colDivChar to the appropriate value
    $("#columnCharText").val(colDivChar);      
    
    //Sets the tabColumns field to have the correct values
    $("select[name=tablists]").val(tabColumns);

    $("#dialogOptions #jobColorTable tbody tr").each(function(){
        var job = $(this).find("td").first().text();
        
        var id = job+"Color";
        
        var color = jobMap[job];
        
        color = rgb2hex(color);
        
        $("#"+id + " div").css("background-color", color)
        
        $('#'+id).ColorPicker({       
            color: color,        
            onChange: function (hsb, hex, rgb) {
                $('#'+id+' div').css('backgroundColor','#'+ hex);
            }

        });
    });
  
    //Sets the allowed and default column values
    $("#defaultColumnDiv .box select[multiple='multiple']").each(function(){
        var status = $(this).attr("name");
        $(this).val(allowedColumnMap[status]);
        $(this).siblings("select:not([multiple='multiple'])").val(defaultColumnMap[status]);
       
    });
    
    if (condition || typeof(condition) == "undefined")
    {
        $("#dialogOptions").dialog("open");     
    }
    
    //Sets the WIP values
    $("#dialogOptions #WIPSetTable tbody tr").each(function(){
        var col =  $(this).find("td").first().text();
        var input = $(this).find("input[type='number']");
        var value = limitWIP[col];
        input.val(value);
    });
    
    if (!$("#adminInputs input").length)
    {
        for (var i in adminIds)
        {
            var id = parseInt(adminIds[i]);
        
            var td = $("<td>");
        
            var input = $("<input type='number' min='1'/>").val(id);
        
            $("#addAdmin").parent().before(td.append(input));
        }  
    }
   
    
    //Triggers the filter select(after the duialog is open because otherwise the select's are always hidden)
    //Then trigger the change to refresh the button
    $("#filterFieldOption").change();
}

function dialogOptionsSave()
{
    if ($("#dialogOptions").dialog("isOpen"))
    {
        //Stores each selection made in the options menu
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
    
        //Stores each color selection and saves it
        $("#dialogOptions #jobColorTable tbody tr").each(function(){
            var name = $(this).find("td").first().text();

            //This finds the color of the color preview. Returns an RGB string, hopefully this will work
            var color = $(this).find("td").last().find("div").find("div").css("background-color");                                 

            jobMap[name] = color;
        });
    
        //Stores each WIP limit selection
        $("#dialogOptions #WIPSetTable tbody tr").each(function(){
            var col = $(this).find("td").first().text();

            //This finds the color of the color preview. Returns an RGB string, hopefully this will work
            var WIPlimit = $(this).find("td").last().find("input").val();                                 

            limitWIP[col] = WIPlimit;
        });          
    
        var allowedColumnMapNew = {};
    
        var defaultColumnMapNew = {};
    
        //Finds all of the status column assigments
        $("#defaultColumnDiv .box").each(function(){ 
            //Finds the multiple select specifyiung the allowed values for a certain status
            var allowedSelect = $(this).find("select[multiple='multiple']");
        
            var allowedValues = allowedSelect.val();
        
            //Finds the single select specifying the default columnb value
            var defSelect = $(this).find("select:not([multiple='multiple'])");
        
            var defValue = defSelect.val();
                
            var status = allowedSelect.attr("name");
        
            allowedColumnMapNew[status] = allowedValues;
        
            defaultColumnMapNew[status] = defValue;
       
        });    
    
        //Makes sure that the default column for each status is contqained within the list of allowed columns(else we will have an infinite recurive loop)
        for (var status in defaultColumnMapNew)
        {
            var valArr = allowedColumnMapNew[status];
            var defVal = defaultColumnMapNew[status];
        
            //Checks to see if the default value is found in the value array
            if (valArr.indexOf(defVal) == -1)
            {
                //If not we add the default value to the list of allowed values
                allowedColumnMapNew[status].push(defVal);                
            }
        }  
    
        var adminArr = [];
        $("#adminInputs input").each(function(){
            var value = $(this).val();
            if (value != "")
            {
                adminArr.push(value);     
            }
            
        });
    
        var newTabColumns = $("select[name=tablists]").val()
    
        var iniPost = {        
            prioMap: prioMap,
            jobMap: jobMap, 
            allowedColumnMap: allowedColumnMapNew, 
            defaultColumnMap: defaultColumnMapNew, 
            limitWIP: limitWIP,
            colDivChar: $("#columnCharText").val(),
            tabColumns: newTabColumns, 
            adminIds: adminArr
        };           
    
        $.ajax({
            url: "ajax_write_options.php",
            type: "POST",
            data: iniPost,    
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
                    //If the column character or the allowed/default maps or the tabcolumns list have changed we need to rebuild the entire page, the following line simply refreshes the page
                    if (iniPost["colDivChar"] != colDivChar || !deepEquals(allowedColumnMapNew, allowedColumnMap) || !deepEquals(defaultColumnMapNew, defaultColumnMap) || !deepEquals(tabColumns, newTabColumns) || !deepEquals(adminIds, adminArr))
                    {
                        location.reload();    
                    }             
                    else
                    {
                        $(".card").each(function(){                                                                   
                            var prio = $(this).data("priority").replace(/\s+/g, ''); 
                            if (prioMap[prio]=="none")
                            {
                                $(".iconBar .prioBack .prioIcon", $(this)).css("background-image", "none");
                            }
                            else
                            {
                                var icon = prioMap[prio];
                                var url = "images/icons/"+icon+".png";
                                $(".iconBar .prioBack .prioIcon", $(this)).css("background-image", "url("+url+")");
                            }

                            var job = $(this).data("severity").replace(/\s+/g, ''); 
                            var color = jobMap[job];

                            $(this).css("background-color", color);

                            $("#dialogOptions").dialog("close");  
                        });
                    
                        //Checks to make sure that the column are correcly colored based off the new WIP limits
                        $(".column").each(function(){
                            columnWIPCheck($(this).attr("id"));
                        });
                                       
                    }
          


                }

            },
            error: function(jqXHR, textStatus, errorThrown){
                alert("(Fields)There was an error:" + textStatus);
            }
        }); 
    }
}

function makeRowPrioOptions(prioName){

    var row = $('<tr><td>'+prioName+'</td></tr>');

    var td = $("<td><form></form></td>");
    var iconDiv = $("<div id='"+prioName+"radiodiv'></div>"); 

    //This for loop autiomatically populates the prioIcon options selection
    for (i=0; i<18; i++)
    {
        var icon = "icon"+i;
        var id = prioName+"."+icon;
        //Note that the new radio id is prioname.icon#
        var input = $("<input type='radio' id='"+id+"' name='radio' value='"+icon+"' />");
        var label = $("<label for='"+id+"' style='float: left;'>");
        var url = 'images/icons/'+icon+'.png';
        var div = $("<div class='prioBack'><div class='prioIcon' style='background-image: url("+escape(url)+")!important;'></div></div>");
        label.append(div);
        iconDiv.append(input, label);                                  
    }

    //In addition to all of the icons we want to have a "no icon" button
    id = prioName+".none";
    input = $("<input type='radio' id='"+id+"' name='radio' value='none' />");
    label = $("<label for='"+id+"' style='float: left;'>");
    div = $("<div class='prioBack'><div class='prioIcon' >No Icon</div></div>");
    label.append(div);
    iconDiv.append(input, label);         

    td.find("form").append(iconDiv);                    
    row.append(td);
    
    $("#dialogOptions #prioIconTable tbody").append(row);

    $("#"+prioName+"radiodiv").buttonset();


}

function makeRowJobColorOptions(job){
    job = job.replace(/\s+/g, '');
    var id = job+"Color";
    var row = $('<tr><td>'+job+'</td></tr>');

    var td = $("<td><div id='"+id+"' class='colorSelector'><div></div></div></td>");

    row.append(td);

    $("#dialogOptions #jobColorTable tbody").append(row);   
}   

function makeRowWIPSet(col){   
    var row = $("<tr>");
    var td1 = $("<td>").text(col);
    var input = $("<input type='number' min='0' >");
    var td2 = $("<td>").append(input);
    
    row.append(td1, td2);
  
    $("#dialogOptions #WIPSetTable tbody").append(row);
} 

//This function converts rgb colors to their hex equivalent
function rgb2hex(rgb){
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" +
    ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[3],10).toString(16)).slice(-2);
}


function dialogSortOpen(colId)
{   
    var title = reverseKeyLookup(colSortKeyMap, colId);
    
    //Sets the sort menu's title
    $( "#dialogSort" ).dialog( "option", "title", "Sort "+title);

    $( "#dialogSort" ).dialog( "option", "buttons", { 
        "Sort": function() {   
            var order = $("#sortRadioDiv").find("input[type=radio]:checked").val();                      

            var sortkey = $("#sortCriteriaSelect").val();

            //Calls my sort function which does the actual sorting
            sortColumn(colId, sortkey, order);

            $( this ).dialog( "close" );
        },
        Cancel: function() {
            $( this ).dialog( "close" );
        }   
    });   
    $( "#dialogSort" ).dialog("open");
}

function sortContextHelper()
{                
    //Finds the column that was right clicked
    var columnId = $($.mbMenu.lastContextMenuEl).attr("id");

    //Passes that columnId to the dialogSortOpen function
    dialogSortOpen(columnId);
}

function filterContextHelper()
{                
    //Finds the column that was right clicked
    var colId = $($.mbMenu.lastContextMenuEl).attr("id");

    //Passes that columnId to the dialogSortOpen function
    dialogFilterOpen(colId)
}


//A function that finds the name associated with each each id that is passed in. Very slow, consider revision
function getNames(productIds){
    getNamesXHR = $.ajax({
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
                    $("select[name=product]").append(option);
                                       
                }                                                                

                //Automatically populates the components and version fields based off of the first(default) product
                var firstProduct = $("#Details select[name=product] option").first().html();                               
                
                getCompsVers([firstProduct], "Details");
                getCompsVers(null, "dialogSearch");
                getCompsVers(null, "dialogOptions");
            }

            //Then we want to remove the loading screen
            $('#Details, #dialogSearch, #dialogOptions').removeClass("loading"); 

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    });

}; 

function ajaxLogout()
{
    //Changes the loading screen text from "Board Loading" to "Logging Out"
    $("body>.modal").find("div").text("Logging out");

    $("body").addClass("loading");

    $.ajax({                  
        url: "ajax_logout.php",  
        dataType: "json",
        success: function(data){
            if (data.success)
            {
                alert("User successfully logged out");

                document.location.href = "loginpage.php";      
            }
            else 
            {
                $("body").removeClass("loading");

                alert("Log out failed");
            }                                                                                                                                                       
        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    })            
}

    
function displayHandler(card) {
    //Finds the card's values    
    var cardRef = "#"+card.attr("id").replace(/\s+/g, '');
    var job = card.data("severity").replace(/\s+/g, '');
    var prio = card.data("priority").replace(/\s+/g, '');                
    var deadline = card.data("deadline");
    var summary = card.data("summary")            
                
    //Changes the background color of the card to match the .ini file
    card.css("background-color", jobMap[job]);
                
    //Sets the title of the card to the jobtype 
    card.attr({
        "title": "(#"+card.attr("id")+")"+job+": " + summary
    });
   
    //This section adds and switches the priority icon.                                         
    if ($(cardRef + " .prioBack").length == 0)
    {
        var prioBack = $("<div class=\"prioBack\"><div class=\"prioIcon\"></div></div>");
        $(cardRef+ " .iconBar").append(prioBack);
    }
                
    $(cardRef + " .prioBack").attr("title", prio+" Priority")
                
    //Now that we have an empty div with the correct div, we refer to the user defined prioMap to add the icons
    var icon  = prioMap[prio];
    var url = "images/icons/"+icon+".png";
    $(cardRef+" .iconBar .prioBack .prioIcon").css("background-image", "url("+url+")")
                                        

                                      
                
                
    //This section handles the calendar icon
    if (deadline != null && $(cardRef + " .iconBar .calBack").length == 0)
    {
        $(cardRef+ " .iconBar").append("<div class=\"calBack\"><div class=\"calIcon\"></div></div>"); 
    }
    if (deadline == null || deadline == "")
    {
        $(cardRef+ " .iconBar .calBack").remove(); 
    } 
    
    //The date discrepancy was handled by correcting the timezone which is accomplished with this php call
    if (typeof(deadline) != "undefined")
    {
        var splitArr = deadline.split("-");        
        var date = new Date(splitArr[0], splitArr[1] - 1, splitArr[2]);     
        var displayDay = date.getDate();
        var dateUntil = stringtoTimeStamp(deadline); 
        dateUntil = new Date(dateUntil);          
        var day = dateUntil.getDate() ;                
        var month = dateUntil.getMonth(); 
        var year = dateUntil.getFullYear();   
        var until = daysUntil(year, month, day) + 1;
    }
    else
    {
        //Here if deadline is null we simply assign it a  null value which is better than  the -600,000 this kept returning before 
        until = null;
    }
            
    card.data("dayUntilDue", until);
                
    $(cardRef+ " .iconBar .calBack .calIcon").html(displayDay).attr({
        "title": "Due: "+ deadline + " ("+until+" days from today)"
    });
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
        $(cardRef+ " .iconBar .calBack .calIcon").attr({
            "title": "Due: "+ deadline + " (Tomorrow)"
        });
    }  
                
    if (until <= 0)
    {
        $(cardRef+ " .iconBar .calBack .calIcon").addClass("calIconNeg");
        $(cardRef+ " .iconBar .calBack .calIcon").attr({
            "title": "Due: "+ deadline + " ("+(-until)+" days ago)"
        });
    }
    else
    {
        $(cardRef+ " .iconBar .calBack .calIcon").removeClass("calIconNeg");
    }
    if (until == 0)
    {
        $(cardRef+ " .iconBar .calBack .calIcon").attr({
            "title": "Due: "+ deadline + " (Today)"
        });
    }
    if (until == -1)
    {
        $(cardRef+ " .iconBar .calBack .calIcon").attr({
            "title": "Due: "+ deadline + " (Yesterday)"
        });
    }                               
}

//Moves a cardf from one column to another  or adding a new card to a column taking into account the possibility of no column assignment
function appendCard(cards, col, status) 
{   
 
    //This function expects an array so if the input isnt an artray, we make it one
    if (!$.isArray(cards))
    {
        cards = [cards];
    }
    var cardIds = [];
        
    var startColArr = [];
    
         
    var column = $("#"+col);
    
    //Here we check the location of the card. if the card has no specified column(or doesn't match any of the columns on the board) we place it in a column based on its status
    if (!column.length)  
    {       
        //Here we store where the column is stored with a different variable because if the column is "---" we want the card data to say "---" but we want it to be placed in the default column
        var actualCol = colSortKeyMap[defaultColumnMap[status]];
        column = $("#"+actualCol);
    }
    else 
    {
        //If the card's column  isn't "---", the actualColumn and the stored column are the same
        actualCol = col;
    }
        
    for (var i in cards)
    {                
        var card = cards[i];
        var startCol = card.data("cf_whichcolumn");
        
        var frontEndCol = reverseKeyLookup(colSortKeyMap, col);
            
        //This line makes the status parameter optional for cards that already exist
        if (typeof(card.data("status")) != "undefined" && typeof(status) == "undefined")
        {
            status = card.data("status");     
        }
        
        //Here we check to make sure where we are putting the card is consistent with its status
        if (allowedColumnMap[status].indexOf(frontEndCol) == -1)
        {
            //If the indexOf function returns -1 we know that the end column is not a valid choice according to this status. 
            if (/*Condition that shows that this is on initial load*/ !card.parent().length)
            {
                //We then return the card(and set its data) to the default column
                var cardId = card.attr("id");
            
                var defCol = defaultColumnMap[status];            
                    
                messageArr.push(frontEndCol + " is not a valid Column choice for the "+status+" status.\nCard #" + cardId+ " will be moved to " +defCol);
            
                defCol = colSortKeyMap[defCol];            
                appendCard(card, defCol, status);            
                updatePosition(defCol, cardId);    
            }
            else
            {
                //If the user is trying to move a card from one column to another we simply tell them they can't
                alert(frontEndCol + " is not a valid Column choice for the "+status+" status.");
            }
                     
            continue;        
        }
        
        var newLi = $('<li></li>').append(card);
             
        column.append(newLi);
               
        cardIds.push(card.attr("id"));
            
        if (typeof(startCol) != "undefined")
        {
            startColArr.push(startCol);  
        }
            
    }
        
    if (startColArr.length)
    {
        
        //If startCOl is not undefiend we know that the card has already been added to the board and the user is simply moving a card from one to column to another
        for (var k in startColArr)
        {
            var start = startColArr[k];
            var startColumn = $("#"+start);
            
            if (!startColumn.length)  
            {        
                start = colSortKeyMap[start];
                startColumn = $("#"+start);                          
            }
            
            //We want to update the WIP of the actual column here because the col doesn't necessarily exist
            $(document).trigger("columnChange",[ actualCol, start]);    
        }
            
        updatePosition(col, cardIds);
    }                
    
    //If the resulting column is a tablist we need to run the filter again
    if (column.hasClass("tablists"))
    {
        advancedFilter(tabColumnFilter, ".tablists");
    }               
    
    //This line removes any li's that don't have a card in them
    $(".column li:not(:has(.card)), .tablists li:not(:has(.card))").remove();       
}

/**
 * makeFilterRangeInputs
 * 
 * @param {String} fieldName the Bugzilla parameter namer of the field
 * @param {String} displayName What you want to be tyhe title of this range input
 * @param {String} type The type of the this range(number or date for now)
 */
function makeFilterRangeInputs(fieldName, displayName, type)
{
    //Here I create a table holding all the numeric ranges based off of the following standards:
    /*
     * fieldName: Name attribute of the table
     * beginMarker: Name of the begin input 
     * endMarker: Name of the end input
     * 
     * Also note that only ranges will be stored in a box so when parsing the filters we know that if we find a table, it is going to be a range based off of the above indicators
     */    
    var div = $("<div class='box'></div>").text(displayName);
    
    var beginLabel = $("<label style='text-align: center;'>From:</label>");
    var begin = $("<input name='begin' class=' ui-widget-content ui-corner-all'type='text' style='width: 100px;'/>");
        
    var table = $("<table name='"+fieldName+"' style='border: 1px solid #CCC; height: 100%; width: 100%;' class='ui-corner-all'></table>");
        
    var tbody = $("<tbody></tbody>");
        
    var tr = $("<tr></tr>");
    var tr2 =   $("<tr></tr>");
    
    var endLabel = $("<label style='text-align: center;'>To:</label>");
    var end = $("<input name='end'class=' ui-widget-content ui-corner-all' type='text'/>");
    
    //Checks the type and if neccesary adds the datePicker functionality
    if (type =="date")
    {
        begin.datepicker({
            dateFormat: "yy-mm-dd"
        }).css("width", "100px");
        
        end.datepicker({
            dateFormat: "yy-mm-dd"
        }).css("width", "100px");
    }
    else if (type == "number")
    {
        begin = $("<input name='begin' class=' ui-widget-content ui-corner-all'type='number'/>").attr({
            "min": 1
        }).css("width", "75px");
        
        end = $("<input name='end'class=' ui-widget-content ui-corner-all' type='number'/>").attr({
            "min": 1
        }).css("width", "75px");
    }
        
    var td1 = $("<td>");
        
    var td2 = $("<td>");
    
    var td3 = $("<td>");
        
    var td4 = $("<td>");
    
          
    td1.append(beginLabel);     
        
    td2.append(begin); 
    
    td3.append(endLabel);     
        
    td4.append(end); 
        
    table.append(tbody.append(tr.append(td1, td2), tr2.append(td3, td4)));
                       
    div.append( table).hide();
        
    $("#optFilterDiv").append(div);
        
    var option = $("<option>").val("table[name='"+fieldName+"']").text(displayName);
        
    $("#filterFieldOption").append(option);  
}

function makeColumnOptions(name)
{  
    var div = $("<div class='box'></div>");
    
    var label = $("<label class='searchLabel'><h4>"+name+"</h4>Allowed</label>");
      
    //Adds the column options to the select
    var select = $("#Details select[name=cf_whichcolumn]").clone().attr({
        "multiple": "multiple", 
        "name": name
    });
    var defSelect = $("#Details select[name=cf_whichcolumn]").clone();
    
    $(" option", defSelect).first().remove();
    
    var defLabel = $("<label style='margin-top: 10px;' class='searchLabel'>Defualt</label>");        
    
    div.append(label, select, defLabel, defSelect);        
    $("#defaultColumnDiv").append(div);         
}

function columnWIPCheck(columnId)
{        
    var column = $("#"+columnId);
              
    columnId = reverseKeyLookup(colSortKeyMap, columnId);    
               
    var numCards = $(".card", column).length;
    
    var wipLimit = limitWIP[columnId];
    
    //Displays the number of cards in the column
    column.parent().find(".wipDisplay").text(wipLimit).attr("title", "Total Cards: " + numCards);
    
    if (wipLimit != 0)
    {
        if (numCards > wipLimit )
        {
            //These lines get the error state class of the current jqwuery ui class
            var $p = $("<p></p>").addClass("ui-state-error").hide().appendTo("body");
            var badWIPBack = $p.css("background");
            $p.remove();
            
            column.parent().css("background", badWIPBack).attr("title", "This column is exceeding its WIP limit");
            column.parent().find(".wipDisplay").css("color", "red");
        }
        else
        {
            column.parent().css("background", "").attr("title", "");  
            column.parent().find(".wipDisplay").css("color", "");
        }
        
    }
    else
    {
        column.parent().css("background-color", "").attr("title", "");   
        column.parent().find(".wipDisplay").css("color", "");
        
        //If the WIP limit is 0 then we dont need to show it
        column.parent().find(".wipDisplay").text("");
    }       
    
   
}

//I have refactored my quick search functionality into this function
function quickCardSearch(key, container, field)
{
    //Here I limit the searching ability of this function to visible cards(so as to not interfer with the backlog filtering)
    var cards = $(" .card", container);
    
    if (key.length <= 0)
    {
        //If there isn't anything in the text box we want to show all of the cards again
        cards.each(function(){
            $(this).parent().show(); 
        });
    }
    //If there is text in the input we want to start filtering 
    else
    {                       
        //If we receive a quote before the keystring we know that the user is looking for a literal string so we handle this case accordingly
        if (key.indexOf('\"')==0 || key.indexOf("\'")==0)
        {
            //First we remove the quote
            key = key.substr(1);
                
            //If the key is numeric we need to search the cardIds
            if ($.isNumeric(key))
            {
                cards.each(function(){
                    var card = $(this);
                
                    var value = card.data(field);
                    if (value != "" && value != null)
                    {
                        value = value.toString();                                          
                    
                        //Here we require that the start of the search term be the start of the summary
                        if (value.indexOf(key) == 0)
                        {
                            card.parent().show();
                        }
                        else
                        {
                            card.parent().hide();       
                        }
                    }
                    else
                    {
                        card.parent().hide();       
                    }
                });     
                   
                   
            }
            //Otherwise the key is a string so we search the summaries
            else
            {                        
                cards.each(function(){
                    var card = $(this);
                    
                    var value = card.data(field);
                    if (value != "" && value != null)
                    {
                        value = value.toString(); 
                     
                        //Here we require that the start of the search term be the start of the summary
                        if (value.indexOf(key) == 0 || value.toLowerCase().indexOf(key.toLowerCase()) == 0)
                        {
                            card.parent().show();
                        }
                        else
                        {
                            card.parent().hide();       
                        }
                    }
                    else
                    {
                        card.parent().hide();       
                    }
                });
            }            
        } 
        //If there isn't a quote we dont need to look for literal strings
        else
        {  
            //If the key is numeric we need to search the cardIds
            if ($.isNumeric(key))
            {                   
                cards.each(function(){
                    var card = $(this);
                                         
                    var value = card.data(field);
                    if (value != "" && value != null)
                    {   
                        value = value.toString();             
                
                        if (value.indexOf(key) >= 0)
                        {
                            card.parent().show();
                        }
                        else
                        {
                            card.parent().hide();       
                        } 
                    }
                    else
                    {
                        card.parent().hide();    
                    }
                    
                });                                    
            }
            //Otherwise the key is a string so we search the summaries
            else 
            {
                cards.each(function(){
                    var card = $(this);
                    
                    var value = card.data(field);
                    if (value != "" && value != null)
                    {
                        value = value.toString(); 
                        //The indexOf method returns the index of a given substring within a given string. If the substring isnt found it returns -1
                        if (value.indexOf(key) >= 0 || value.toLowerCase().indexOf(key.toLowerCase()) >= 0)
                        {
                            card.parent().show();
                        }
                        else
                        {
                            card.parent().hide();       
                        }     
                    }                   
                    else
                    {
                        card.parent().hide();       
                    }     
                });      
            }
                
               
        }
           
    }         
}

function dialogFilterOpen()
{
    //Makes sure we have the correct componenet and versions
    getCompsVers(null, "dialogFilter");
    
    
    if (!$("#dialogFilter .box table").length)
    {    
        //Changes the select fields that were appended to the correct form
        $("#optFilterDiv select").each(function(){                                    
            var field = $(this);
        
            var fieldName = field.attr("name");
            if (fieldName != "cf_whichcolumn")
            {
                //turns it into a multple select
                field.attr("multiple", "multiple");
        
                //Adds the box class which gives the correct styling
                field.parent().addClass("box");
        
                //Adds ther correct syling to the label
                field.siblings("label").addClass("searchLabel");
            
                //Populates thes filter select field
                var option = $("<option>").text(field.siblings("label").text()).val("#optFilterDiv select[name="+field.attr("name")+"]");
        
                $("#filterFieldOption").append(option);      
            }
            else
            {
                field.parent().remove();      
            }
               
          
            
        });
        
        //We only want the selects to show, not the inputs
        $("#optFilterDiv input").parent().remove();
        
        //Here I create the range inputs(for now this is the best way that I could think of to add them)
        makeFilterRangeInputs("deadline", "Deadline", "date");
        
        makeFilterRangeInputs("last_change_time", "Last Edited", "date");
        
        makeFilterRangeInputs("id", "Bug ID", "number");
            
                              
    }       
    
    //Hides all of the filters
    $("#dialogFilter #optFilterDiv .box").hide();        
    
    //shows the current filters being applied
    for (var index in tabColumnFilter)
    {
        if (index == "range")
        {
            //We know that range filters take the form of an object mapping the actual parameter name to an array containing our range values
            for (var i in tabColumnFilter["range"])
            {
                for (var field in tabColumnFilter["range"][i])
                {
                    var valArr = tabColumnFilter["range"][i][field];  
                    
                    //Checks to see if the field name in question is found in the fieldtoparam map and if so switches the fields accordingly
                    if (reverseKeyLookup(bugzillaFieldtoParam, field) != -1)
                    {
                        field =  reverseKeyLookup(bugzillaFieldtoParam, field);
                    }                                        
                    
                    $("#dialogFilter #optFilterDiv .box table[name='"+field+"'] input").first().val(valArr[0]);
                    
                    $("#dialogFilter #optFilterDiv .box table[name='"+field+"'] input").last().val(valArr[1]);                   
                    
                    $("#dialogFilter #optFilterDiv .box table[name='"+field+"']").parent().show();
                }
            }
        }
        else
        {
            var value = tabColumnFilter[index];
        
            if (value != "")
            {
                //Checks to see if the field name in question is found in the fieldtoparam map and if so switches the fields accordingly
                if (reverseKeyLookup(bugzillaFieldtoParam, index) != -1)
                {
                    index =  reverseKeyLookup(bugzillaFieldtoParam, index);
                }
            
                $("#dialogFilter #optFilterDiv .box select[name='"+index+"']").parent().show();
                $("#dialogFilter #optFilterDiv .box select[name='"+index+"']").val(value);     
            }            
        }
      
    }
    
    //Triggers the filter select 
    $("#filterFieldOption").change();
    
    $("#dialogFilter").dialog("open");
      
}

function dialogFilterSubmit()
{                                                                                 
    var filterArr = {};
    
    filterArr["range"] = [];
      
    if ($("#dialogFilter .box:visible").length)
    {      
        //Finds all of the selected values in boxes that are visible
        $("#dialogFilter .box:visible select , #dialogFilter .box:visible table " ).each(function(){ 
            
            //Grabs the field's parameter data storing the bugzilla parameter name
            var name = $(this).attr("name");  
            
            if ($(this).is("table"))
            {
                var rangeArr = [];
                
                var type;
                
                //HEre we loop through the td's of the given table and create an object logically storing the beggining and end values
                $(" td input", $(this)).each(function(){
                    var input = $(this);                    
                    
                    type = $(this).attr("type");
                    
                    var val = input.val();
                                        
                    rangeArr.push(val);                    
                });     
                
                if (rangeArr[0] != "" || rangeArr[1] != "")
                {
                
                    rangeArr.push(type);
                    var obj = {};
                    obj[name] = rangeArr;                
                    filterArr["range"].push(obj);
                }
            }
            else
            {                            
                //Checks to see if the field name in question is found in the fieldtoparam map and if so switches the fields accordingly
                if (typeof(bugzillaFieldtoParam[name])!="undefined")
                {
                    name =  bugzillaFieldtoParam[name];
                }
           
                var value = $(this).val();
            
                filterArr[name] = value;      
            }                                   
        });
    }     
      
    //Removes all null values and makes array switches if neccessary
    for (var index in filterArr)
    {        
        if (filterArr[index] == null || !filterArr[index].length)
        {
            delete filterArr[index];
        }
        else 
        {
            //If the value is not an array
            if ( ! $.isArray(filterArr[index]))
            {                                    
                //Turn it into an array
                filterArr[index] = [filterArr[index]];
            } 
        }
    }                                               
            
    /*/Now we want to add the Summary if neccessary
    if ($("#dialogFilter").val() != "" && $("#searchSummary").val() != null && $("#searchSummary").is(":visible"))
    {
        filterArr["summary"] = $("#searchSummary").val();                         
    }*/
    
    
    
    //Now we remove all the text from the quick search and trigger a keyup in order to remove any chance at conflict between the two filters
    $("#quickSearchTextBox").val("").trigger("keyup");
    
    $("#dialogFilter").dialog("close");    
    
    //Here we unset any existing filters so we can 
    tabColumnFilter = {};
    
    //Here we store the filter as a global variable after unsetting it(we store a deep copy so as to not lose any info)
    $.extend(true, tabColumnFilter, filterArr); 
    
    advancedFilter(filterArr, ".tablists");
    
}

function advancedFilter(filterObject, col)
{        
    var cards = $(" .card", col);
    
    cards.show();
        
    var filteredCount = 0;
    
    //If the filter is null we know that we arent filtering anything and therefore we just stop after shjowing all of the cards
    if (filterObject != null)
    {
        cards.each(function(){
        
            var card = $(this);
        
            //Here we loop through all of the filter fields 
            for (var param in filterObject) 
            {                 
                var cardData = card.data(param);
                var filterArr = filterObject[param];
                
                //If the filter is for some reason an empty string we ignore this filter
                if (filterArr.length == 1 && filterArr[0] == "")
                {
                    continue;
                }
                //If the parameter name is a range we need to handle the filtering differently
                else if (param == "range")
                {
                    //We know that range filters take the form of an object mapping the actual parameter name to an array containing our range values
                    for (var i in filterArr)
                    {
                        for (var index in filterArr[i])
                        {
                            var valArr = filterArr[i][index];
                        
                            var field = index;
                        
                            var type = valArr[2];
                        
                            cardData = card.data(field);
                        
                            //Here we check to make sure this card has the specified field. If it doesn't, we remove it
                            if (typeof(cardData) == "null" || typeof(cardData) == "undefined")
                            {
                                card.hide();
                
                                //Returning true breaks us out of this iteration of the .each. Once a card fails a single filter we dont need to check it again
                                return true;       
                            }
                        
                            //Right now we are only filtering on two types: numbers and dates(whose input type is text)
                            if (type == "number")
                            {
                                //This line checks to make sure that we don't have "" and if we do it switches val1(the from value) to 0 and val2(the to number) to infinity
                                var val1 = (valArr[0] == "") ? 0 : parseInt(valArr[0]) ;
                                var val2 = (valArr[1] == "") ? Infinity : parseInt(valArr[1]);
                            } 
                            else
                            {
                            
                                //This line checks to make sure that we don't have "" and if we do it switches val1(the from value) to 0 and val2(the to number) to infinity
                                //For the dates i have decided it would be easiest to compare the UTC time stamp(milliseconds from midnight 1/1/1970) rather than the date object
                                val1 = (valArr[0] == "") ? 0 : stringtoTimeStamp(valArr[0]);
                                val2 = (valArr[1] == "") ? Infinity : stringtoTimeStamp(valArr[1]);  
                            
                                //Thre last_chaned_time property is a date object so we need to handle this case as well.
                                if (typeof(cardData) =="string")
                                {
                                    //If it is a string we convert it into a number directly
                                    cardData = stringtoTimeStamp(cardData);
                                }
                                                          
                           
                            } 
                            //val1 is lower bouund and val2 is upper bound
                            if (val1 < val2)
                            {
                                if (cardData < val1 || cardData > val2)
                                {                                                                        
                                    card.hide();
                                    
                                    //Adds one to the count of removed items
                                    filteredCount +=1;
                
                                    //Returning true breaks us out of this iteration of the .each. Once a card fails a single filter we dont need to check it again
                                    return true;         
                                }
                                
                                continue;
                            }     
                            else if (val1 > val2)
                            {
                                //val1 is upper bouund and val2 is lower bound
                                if (cardData > val1 || cardData < val2)
                                {
                                    card.hide();
                
                                    //Returning true breaks us out of this iteration of the .each. Once a card fails a single filter we dont need to check it again
                                    return true;         
                                }
                                
                                continue;                                        
                            }
                            else if (val1 == val2)
                            {
                                //if the two cards are the same we only match if the carddata is equal to both values
                                if (cardData != val1)
                                {
                                    card.hide();
                
                                    //Returning true breaks us out of this iteration of the .each. Once a card fails a single filter we dont need to check it again
                                    return true;         
                                }
                                
                                continue;      
                            }
                        }     
                    }                                                      
                }
                //Now if we get to a card and find out that it is both visible and its parameter matches the filter's, we move on to the next filter
                else if (filterArr.indexOf(cardData) != -1)
                {
                    continue;      
                }
                //Else if either of the above are false we know that the card didn't pass the filter and as such we want to hide it
                else
                {
                    card.hide();
                
                    //Returning true breaks us out of this iteration of the .each. Once a card fails a single filter we dont need to check it again
                    return true;     
                }
            }
        });                   
    } 
   
    //If either of these things are true we know that no filter has been applied and therefore we can remove the notification and button in the tablists 
    if (filterObject == null || $.isEmptyObject(filterObject))
    {
        $(".bigBanners").removeClass("ui-state-highlight");
        
        $(".bigBanners button").remove();
            
        $(".tablistsCon").attr("title", "");
    }
    //If not the above, we know that at least one card has been removed and consequently a filter was applied. Therefore we add a notification and removal button to the tablists
    else
    {
        //We only want to add these things if they arent already there, other wise we end up with multiple removal buttons
        if (!$(".bigBanners").hasClass("ui-state-highlight"))
        {
            //This button will be added to the columns and will provide an option for the user to remove any filters 
            var btn = $("<button class='btnRemoveFilter'>").text("Remove Filter").button();
        
            $(".bigBanners").addClass("ui-state-highlight").append(btn);
            
            $(".tablistsCon").attr("title", "This column is being filtered");
        }
       
            
    }
}

function buildBoardHelper()
{
    for (var index in colSortKeyMap)   
    { 
        var id = colSortKeyMap[index];
        
        if (index == "---")
        {
            continue;
        }
        else if (typeof(tabColumns) != "undefined")
        {
            if (tabColumns.indexOf(index) >= 0 )
            {
                var colHtml = '<div class="tablistsCon loading"><span class="bigBanners ui-widget-header">'+index+'</span><ul id="'+ id +'"class="tablists cmVoice {cMenu: \'contextMenuTab\'}\" ></ul>\
                               <div class="modal"><div class="loadingLabel">'+ index +' Loading</div></div></div>';
                                
                $(".columnContainer").prepend(colHtml);
                                
                var buttonHtml = '<button class="btnTab">'+index+'</button>';
                                
                $("#btnAddCard").before(buttonHtml);                                                                
            }
            else
            {
                $.extend(true, columnNest, buildColumnNestObject(index));
            }
        }        
        else
        {
            $.extend(true, columnNest, buildColumnNestObject(index));
        }
      
    }
    $(".columnContainer").append(buildBoard(columnNest, ""));
    
    $(".btnTab").button();
                                
}

function buildColumnNestObject(column)
{
    var nest = {}; 
                               
    var columnSplit = column.split(colDivChar);
                    
    if (columnSplit.length == 1)
    {
        var col = columnSplit[0];
        nest[col] = [];                     
    }
    else
    {                    
        var name = columnSplit[0];
                            
        columnSplit.splice(0,1);
                                                                                    
        nest[name] = buildColumnNestObject(columnSplit.join(colDivChar));                                                                                                             
    }
                
    return nest;
                    
}  
            
function buildBoard(nest, fullName)
{
    var html = "";
    for (var index in nest)
    {
        if ( fullName == "")
        {
            var name = index;
        }
        else
        {
            name = fullName  +colDivChar+ index;
        }
                        
                        
                    
        if (nest[index].length != undefined && nest[index].length == 0)
        {                        
            html +=  "<div class=\"columnCon \"><div class=\"banners ui-widget-header\"><span>"+index+"</span><span class='wipDisplay'>"+limitWIP[name]+"</span></div><ul id=\""+colSortKeyMap[name]+"\" class=\"column cmVoice {cMenu: \'contextMenuColumn\'}\" > </ul> </div>";   
        }
        else
        {
            html += '<div  class="dubColumn"><div class="dubBanners ui-widget-header">'+index+'</div>';
                        
            html += buildBoard(nest[index],name);
                        
            html += "</div>";
                        
                        
        }
    }
                           
    return html;
                
}

function tablistCardPopulate(tabID)
{
    var tabName = reverseKeyLookup(colSortKeyMap, tabID);  
    
    var tab = $("#"+tabID);
    
    //Finds all bugs that are contained in the specified tablist and posts them to the board 
    $.ajax({
        url: "ajax_POST.php",
        type: "POST",       
        data:  {
            "method": "Bug.search",
            "cf_whichcolumn": tabName            
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
                //Then we add the cards
                for (var i in data.result.bugs)
                {
                    var bug = data.result.bugs[i];
                    
                    var card = $("#" + bug.id);
                    
                    //Checks to make sure that the card being posted doesn't already exist for some reason
                    if (!card.length)
                    {
                        postCard(bug);    
                    }
                    
                                                   
                }
               
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
                    closeOnMouseOut:true,
                    onContextualMenu:function(o,e){}
                });                    
                
                  
                if (messageArr.length)
                {
                    var message = "The following changes have been made:\n";
                    for (var j in messageArr)
                    {
                        message +=    messageArr[j] +"\n\n";
                    }
        
                    alert(message);
                        
                    messageArr = [];
                }
                
                tab.parent().removeClass("loading");   
                
                //Applys any filters
                advancedFilter(tabColumnFilter, ".tablists");
                
                //Triggers the key up event on the quick seatrch effictly searching the newly opened tablist as soon as it is opened
                $("#quickSearchTextBox").keyup();
            }
        }
    });
}

function updateBoard()
{
    clearTimeout(updateTimer);
    
    var now = new Date().getTime() - 40000;
    now = new Date(now);
    
    var year = now.getFullYear();
    
    var day =  padtoTwo(now.getDate());  
    
    var month =  padtoTwo(now.getMonth() + 1);        
    
    var time = padtoTwo(now.getHours()) + ":" + padtoTwo(now.getMinutes()) + ":" + padtoTwo(now.getSeconds());
                   
    var isoTime = year + "-" + month + "-" + day + "T" + time + ".000Z";
    
    console.log(time);
    
    //Finds all bugs that have been changed in the last 30 seconds 
    $.ajax({
        url: "ajax_POST.php",
        type: "POST",       
        data:  {
            "method": "Bug.search",
            "last_change_time": isoTime            
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
                var bugs = data.result.bugs;
                
                var bugsCleaned = [];
                
                for (var k in bugs)
                {
                    var id = bugs[k].id;
                    
                    var realCard = $("#"+id);
                    
                    //Checks to see if the card in question has already been updated on this end. This prevents the refreshing of cards that were changed from this board  
                    //First we need to if the card in question exists                                                         
                    if (realCard.length)
                    {
                        var realCardTime = $("#"+id).data("last_change_time");//Already a number
                        var bugzillaTime = stringtoTimeStamp(bugs[k].last_change_time);//Converted to time stamp
                        if (realCardTime != bugzillaTime)
                        {
                            bugsCleaned.push(bugs[k]);
                        }
                    }
                    else
                    {
                        //If the card in questuion doesn't exist on our board it must be new and therefore in need of addition
                        bugsCleaned.push(bugs[k]);                            
                    }
                        
                    
                }
                
                //If there are entries in the clean bug array
                if (bugsCleaned.length)
                {
                    for (var i in bugsCleaned)
                    {
                        var bugId = bugsCleaned[i].id;
                    
                        var card = $("#"+bugId);                                                
                        
                        var col = null;
                        var position = null;
                        var futureColumn = colSortKeyMap[bugsCleaned[i].cf_whichcolumn];
                        
                                                                             
                        if (card.length)
                        {
                            //Checks to see if the card being updated is also the card being edited
                            if ($("#dialogAddEditCard").data("cardId") == bugId && $("#dialogAddEditCard").dialog("isOpen"))
                            {
                                //Stores the updated info
                                updateData[bugId] = bugsCleaned[i];
                                
                                //Opens a dialog asking the user what they want to do in response to the external change
                                $("#dialogDataChanged").dialog("open");
                                
                            }
                            
                                
                            col = card.data("cf_whichcolumn");
                        
                            position = card.parent().index();
                        
                            if (sortingArray.indexOf(bugId) != -1)
                            {
                                $(".tablists, .column").sortable('cancel');
                            }
                        
                            card.parent().remove();      
                        }
                    
                        postCard(bugsCleaned[i]);  
                    
                        if (col != null && col == futureColumn)
                        {
                            if (position == 0)
                            {
                                $("#"+col).prepend($("#"+bugId).parent());
                            }
                            else
                            {
                                $("#"+col+" li:eq("+(position - 1)+")").after($("#"+bugId).parent());                                                           
                            }                         
                        }  
                        
                    }           
                    calls += 1;
                    console.log(calls);
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
                        closeOnMouseOut:true,
                        onContextualMenu:function(o,e){}
                    });
                
                    //Need to check each column for WIP limit violations
                    $(".column").each(function(){
                        columnWIPCheck($(this).attr("id"));  
                    }); 
                    
                    //Here we reapply the tablist filter to make sure that the new cards fit with the existing filter
                    advancedFilter(tabColumnFilter, ".tablists");
                    
                      
                    if (messageArr.length)
                    {
                        var message = "The following changes have been made:\n";
                        for (var j in messageArr)
                        {
                            message +=    messageArr[j] +"\n\n";
                        }
        
                        alert(message);
                        
                        messageArr = [];
                    }
                    
                    //We also need to make sure that added cards fit the quick search criteria
                    $("#quickSearchTextBox").trigger("keyup");
                }   

                updateTimer = setTimeout(updateBoard, 30000); 
            }
        }
    }); 
}

function padtoTwo(value)
{
    if (value < 10)
    {
        return "0"+ value;
    } 
    else
    {
        return value;
    }
}

function reverseKeyLookup(object, value)
{
    for (var index in object)
    {
        if (object[index] == value)    
        {
            return index;      
        }
    }
    
    return -1;
    
}

function stringtoTimeStamp(iso)
{
    //We are expecting Bugzilla's iso809 string which takes the form: "YYYY-MM-DDThh:mm:ss.mil" For example: "2012-06-26T16:18:00.000000" or in some cases: "YYYY-MM-DDThh:mm:ss.milZ"
    //First we need to get rid of that Z(if it exists)
    if (iso.substr(iso.length - 1) == "Z")
    {
        //If the last character is Z we take the first characters
        iso = iso.substr(0, iso.length - 1)
    }
    
    //First we split at the T
    var dateArr = iso.split("T");
    
    //Now we either have ["YYYY-MM-DD"] or ["YYYY-MM-DD", "hh:mm:ss.mil"]    
    if (dateArr.length == 1)
    {
        dateArr = dateArr[0].split("-");
        //If the length is one we know that the date didn't have a time specified so we can just pass it on            
        return new Date(dateArr[0], dateArr[1] - 1, dateArr[2]).getTime() + ((parseInt(timeOffset, 10) / 100) *60*60*1000);
    }
    
    var dates = dateArr[0].split("-");//Now we have ["YYYY", "MM", "DD"]
    
    var times = dateArr[1].split(":");//Now we have ["hh", "mm", "ss.mil"]
    
    //Here we split up the seconds and milliseconds
    times = times.concat(times[2].split("."));
    
    times.splice(3,1);//We should now be left with ["hh", "mm", "ss", "mil"]
    
    //We now create a new date object in the only form that safari accepts(from w3schools.com): 
    //var d = new Date(year, month, day, hours, minutes, seconds, milliseconds); 
    return new Date(dates[0], dates[1] - 1, dates[2], times[0], times[1], times[2], times[3] ).getTime() + ((parseInt(timeOffset, 10) / 100) *60*60*1000);           
}


//An object comparison algorithm taken from stackoverflow: http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
//the algorithm seems to be working correctly  for the boardCardFilterOptions comparison. I convewrted it from overriding the equals sign to taking in to parameters and evaluating
function deepEquals(x, y)
{
    if (x == null && y == null)
    {
        return true;
    }
    else if (x == null || y == null)
    {
        return false;
    }
    else
    {
        var p;
        for(p in y) {
            if(typeof(x[p])=='undefined') {
                return false;
            }
        }
        for(p in y) {
            if (y[p]) {
                switch(typeof(y[p])) {
                    case 'object':
                        if (!deepEquals(x[p],y[p])) {
                            return false;
                        }
                        break;
                    case 'function':
                        if (typeof(x[p])=='undefined' ||
                            (p != 'equals' && y[p].toString() != x[p].toString()))
                            return false;
                        break;
                    default:
                        if (y[p] != x[p]) {
                            return false;
                        }
                }
            } else {
                if (x[p])
                    return false;
            }
        }

        for(p in x) {
            if(typeof(y[p])=='undefined') {
                return false;
            }
        }

        return true;
    }
}

function compare()
{  
    //Adds the method after the above for loop because we dont want the method to be in an array
    searchArr = {};
        
    searchArr["method"] = "Bug.search";

    searchArr["id"] = 199;

    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        dataType: "json",
            
        data: searchArr,

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

                var localCopy = $.extend(true, {}, $("#199").data());
                   
                var serverCopy = $.extend(true, {}, data.result.bugs[0])
                        
                       
                        
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    }); 
                
}
function changes(id)
{  
    //Adds the method after the above for loop because we dont want the method to be in an array
    searchArr = {};
        
    searchArr["method"] = "Bug.history";

    searchArr["ids"] = id;

    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        dataType: "json",
            
        data: searchArr,

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
            
                console.log(data);
            
            /*  //Make some changes:
                data.result.bugs[0].id = "copy";
                
                //Post a copy of the updated card: 
                postCard(data.result.bugs[0]);
                
                $("#copy").parent().hide();                                 

                var localCopy = $.extend(true, {}, $("#199").data());
                   
                var serverCopy = $.extend(true, {}, data.result.bugs[0]);
                
                delete localCopy["id"];
                        
                delete serverCopy["id"];    */   
                        
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    }); 
                
}



/*An example of the bug.history method
 *{
  "version": "1.1",
  "id": "Bug.history",
  "result": {
    "bugs": [
      {
        "history": [
          {
            "when": "2012-08-03T17:31:35.000000",
            "changes": [
              {
                "removed": "Limbo",
                "added": "Development?Doing",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-03T19:24:15.000000",
            "changes": [
              {
                "removed": "Development?Doing",
                "added": "Ready",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-03T19:25:05.000000",
            "changes": [
              {
                "removed": "Ready",
                "added": "Limbo",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-03T21:35:08.000000",
            "changes": [
              {
                "removed": "Limbo",
                "added": "Ready",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-06T16:56:28.000000",
            "changes": [
              {
                "removed": "Ready",
                "added": "Build?Done",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-06T17:00:46.000000",
            "changes": [
              {
                "removed": "Build?Done",
                "added": "Test",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-06T17:01:28.000000",
            "changes": [
              {
                "removed": "Test",
                "added": "Build?Doing",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          {
            "when": "2012-08-06T17:01:56.000000",
            "changes": [
              {
                "removed": "Build?Doing",
                "added": "Development?Done",
                "field_name": "cf_whichcolumn"
              }
            ],
            "who": "evan.oman@blc.edu"
          },
          
                            
        ],        
      }
    ]
  }
}*/