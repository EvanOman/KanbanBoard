//Next we want global variables to store the priority icons and the jobMap colors
var prioMap = {};
var jobMap = {};
var prioSortKey = {};
var boardFilterOptions = {};
var limitWIP ={};

var cardChangeData = [];

var getCompsVersXHR = $.Deferred();
var getNamesXHR = $.Deferred();
var getAccProXHR = $.Deferred();
var getFormFieldsXHR = $.Deferred();
var componentData = null;
var blankColumnMap = {};

var columnNest = {};

var tabColumns = ["Backlog", "Limbo", "Archive"];
            
var colSortKeyMap = {};
            
var colDivChar = "?";

//The base element for determing shift selection
var baseShiftClickItem;

var bugzillaFieldtoParam = {
    "bug_status": "status", 
    "bug_severity": "severity",
    "rep_platform": "platform"  
};

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
                jobMap = data.options.jobColors;
                boardFilterOptions =  data.options.boardFilterOptions;
                blankColumnMap = data.options.blankColumnMap;
                limitWIP = data.options.limitWIP;

                //We dont want this function to run until the initialize function completes but we also want the document to be ready
                $(document).ready(function() {
                    //First things first we want to populoate the board with the correct cards:                    
                    boardCardPopulate(); 
                   
                });
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    });
}
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
                    $("#detailsLeft").append(html);
                  
                    
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
                                         
                            var anc = $("<a>").html(colName).attr("value", colSortKeyMap[colName]);                            
                    
                            //append the option to the context menu
                            $("#moveAllCards, #moveCardTo").append(anc);
                    
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
            cancel: "li:has(.loading)",
            //The items parameter expects only a selector which prevents the use of Jquery so here I have made a(likely very inefficent) selector which selects every li with a card in it that isn't loading
            items: "li:has(.card):not(:has(.loading))",
            start: function(event, ui)
            {
                //If the element is part of a selected group we need to hide the selected elements because we are moving
                if ($(ui.item).find(".card").hasClass("sorting-selected"))
                {
                    $(".column .sorting-selected, .tablists .sorting-selected").parent().hide();
                }
            },
            stop: function(event, ui)
            {
                //If the card we are moving is part of a selected group we need to move the group wherever the card moves to
                if ($(ui.item).find(".card").hasClass("sorting-selected"))
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
                
            },
            //Updates the cards position whenever it is moved
            receive: function(event, ui) {     
                //Updates the card's stored position
                var cardId = ui.item.find(".card").attr("id");
                
                updatePosition($(this).attr("id"),cardId );
                                
                $(document).trigger("columnChange", [$(ui.sender).attr("id"), $(this).attr("id")]);
                     
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
    $(/*"#btnAddCard,#btnSearchCard,#btnOptions, .btnTab, #btnAttachmentSubmit, #searchSubmit, #addFilterOption, #removeFilterOption, #btnLogout"*/ "button").button(); 
    
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
                
    //Creates the sort/filter dialog
    $( "#dialogSort" ).dialog({
        autoOpen: false,
        resizable: false,
        height: 175,
        width: 550,
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
                $( this ).dialog( "close" );
            }
        }
    });
                                
    //Creates the search dialog box
    $( "#dialogSearch" ).dialog({
        autoOpen: false,
        resizable: false,
        height: 800,
        width: 1400,
        show: {
            effect: 'blind', 
            complete: function() {
                $("#searchSummary").focus();
            }
        },
        hide: "explode",
        modal: true                  
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
        
        columnWIPCheck(sender);
        columnWIPCheck(receiver);
        
    });
       
    $("#dialogAddEditCard").on("click", "#btnCommentSubmit", function(e){
        //Gets the id of the card to which the comment is being appended
        var cardId = $("#dialogAddEditCard").data("cardId");
                
        sendComment(cardId);
    });
    
    //Adds shift-enter submission for the comments section
    $("#dialogAddEditCard").on("keydown", "#commentReplyText",function(event){
        if(event.shiftKey && event.which == 13)
        {
            //Gets the id of the card to which the comment is being appended
            var cardId = $("#dialogAddEditCard").data("cardId");
            
            //A card Id eqaul to zero tells us that the Add Card Dialog is open and we don't want to try to add a comment to a card that doesn't exist yet
            if (cardId != 0)
            {
                sendComment(cardId); 
            }         
        }
    });      
   
    //Handles the tab buttons dynamically
    $(".toolbar").on("click", ".btnTab", function(){
        var tab =  colSortKeyMap[$(this).text()];
        handleTabLists("#"+tab);
    });                

    //Handles the add card button
    $("#btnAddCard").click(function(){                    
        addCard();
                    
        //Sets a default value for the coloumn field(this way the context menu's addCard still works)
        $("#Details [name=cf_whichcolumn]").val("Limbo");
    }); 
        
    $("#btnSearchCard").click(function(){
        getCompsVers(null, "search");
        $("#dialogSearch ").dialog("open");
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
            $("#addAttTableDiv").addClass("loading");
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
        if (status == "RESOLVED")
        {
            $("#Details select[name=resolution]").parent().show();            
        }
        else if (status != "RESOLVED")
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
                
    //When the bug status is chanbged to resolved, Bugzilla requires a valid resolution. This function shows a resolution select field when neccessary on the Options menu
    $("#optBug_status").change(function () {
        var status = $(this).val();
                    
        //Only adds a new select field if the status is resolved and the Resolution field doesn't already exist
        if (status == "RESOLVED")
        {
            $("#optResolution").parent().show();
        }
        else if (status != "RESOLVED")
        {
            //If the status doesn't equal resolved we remove the resolution box because we can't have a NEW bug with a resolution
            $("#optResolution").parent().hide();
                       
            //We also want to make sure that the resolution field no longer has a value:
            $("#optResolution").val("");
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
        getCompsVers(name, "search");
                
    });
                
    //Populates the components field of the search menu based off of the selected product                
    $("#optProduct").change(function () {
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
            if ($("#"+field).parent().is(":visible") )
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
            if ($("#dialogOptions .box select").length == $("#dialogOptions .box select:visible").length)
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
    
    $("#dialogOptions").on( "click","#addFilterOption" ,function(){                                                                                                         
        var field = $("#filterFieldOption").val();  
        
        if (field != "all")
        {
            //Makes sure any values stored are reset to null(or in this case an empty string "")
            //$("#"+field).val(""); 
                            
            //Shows the field's container
            $("#"+field).parent().show();  
                            
            //Then trigger the change to refresh the button
            $("#filterFieldOption").change();     
        }
        else
        {
            $("#filterFieldOption option").each(function(){
                var filter = $(this).val();
               
                $("#"+filter).val("");
               
                $("#"+filter).parent().show();
                
                //Then trigger the change to refresh the button
                $("#filterFieldOption").change();
            });
        }
        
    });
    
    $("#dialogOptions").on( "click","#removeFilterOption" ,function(){                                                                                                         
        var field = $("#filterFieldOption").val();   
                        
        if (field != "all")
        {
            //Hides the field's container
            $("#"+field).parent().hide();
                            
            //Makes sure any values stored are reset to null(or in this case an empty string "")
            $("#"+field).val(""); 
                            
            //Then trigger the change to refresh the button
            $("#filterFieldOption").change();
        }
        else
        {
            $("#filterFieldOption option").each(function(){
                var filter = $(this).val();
               
                $("#"+filter).val("");
               
                $("#"+filter).parent().hide();
               
                //Then trigger the change to refresh the button
                $("#filterFieldOption").change();
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
                        updateLastChanged(card.attr("id"));
                                    
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
            $("#dialogInvalid p").text("This bug is not available due to your Board Filter settings. To view this bug change your filter settings.");
            $("#dialogInvalid").dialog("open");
        }
        
      
    });           
    
    //Here I will add my simple quick search filter
    $("#quickSearchTextBox").keyup(function(){
        var key =  $("#quickSearchTextBox").val();       
                
        //Since this text box is in the toolbar we know we only want to search the .columns
        var container = $(".column");
        
        var field = $("#quickSearchField").val();
                
        quickCardSearch(key, container, field);
                 
    });
    
    $("#quickSearchTextBox").attr("title", "Enter a Bug ID or a Bug Summary\nTo seach for a literal string use ' or \"");
   
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
    for ( var i in attachments)
    {
        var att = attachments[i];                                
        var date = new Date(att.creation_time);
        var time = date.toLocaleTimeString();
        time = time.substring(0, time.length -3);
        date = date.toLocaleDateString();

        var patch = (att.is_patch) ? ", patch" : "";

        var tr = '<tr><td><div><a href="#" value="'+att.id+'">'+att.summary+'</a> ('+att.file_name+patch+')</div><div>'+date+' '+time+', '+att.creator +'</div></td></tr>';
        $("#attachmentTable tbody").append(tr);                                                               
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
            $("#searchProduct, #optProduct").change();

            //Sets the proper fields for the options menu
            setBoardFilterValues();

            compsVersFieldPopulate(name, dialogID);
            
            //We need to wait until all the values in all the fields are entered    
            //shows the current filters being applied
            for (var index in boardFilterOptions)
            {
                $("#dialogOptions .box label[name='"+index+"']").parent().show();
                $("#dialogOptions .box label[name='"+index+"']").siblings("select").val(boardFilterOptions[index]);
            }         
            
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
                //TODO Change to generate an input field that will allow the sumbission of a duplicate ID
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
            {  /*                                                              
                //Sends a comment on save if the user forgets to 
                if ($("commentReplyText").val() != "" || $("commentReplyText").val() == undefined)
                {
                    debugger;
                    sendComment(cardId);    
                }
 */
                if ($("input[name=dupe_of]").length && $("input[name=dupe_of]").val() == "")
                {
                    $("#dialogInvalid p").text("You must specify a valid bug ID if this bug is a duplicate");
                    
                    $("#dialogInvalid").dialog("open");                        
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
    var text = $('<textarea id="commentReplyText" class="text ui-widget-content ui-corner-all" style="height: 250px; width:640px;" name="description">').attr("title", "Hold shift and enter to submit comment or click send");
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
                if($( "#Details textarea[name=summary]" ).val()=="" || $("#commentReplyText").val() == "")
                {
                    $("#dialogInvalid p").text("You must specify a valid title and description");
                    
                    $("#dialogInvalid").dialog("open");
                }
                else{                                  
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
                
                postData["last_change_time"] = new Date();
                
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
    data["last_change_time"] = new Date(data["last_change_time"]);
    
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
                    
                    if (card.data("cf_whichcolumn" )!= cardChangeData[ids]["cf_whichcolumn"])
                    {
                        appendCard(card, cardChangeData[ids]["cf_whichcolumn"]);  
                    }
                                           
                    //Here we save the changeData to the local
                    card.data(cardChangeData[ids]);

                    //Then delete the changeData
                    delete cardChangeData[ids];

                    //Updates the card's text
                    $('#'+ids+" .cardText").html("(#"+ids+") "+card.data("summary"));

                    displayHandler(card);
                    
                    //We also need to update the last edit time:
                    updateLastChanged(ids);                   
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
                for (var i in cardIds) { 
                    var card = $("#"+cardIds[i]);

                    updateLastChanged(cardIds[i]);                   
                    
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

        //Finds all of the selected values
        $("#dialogSearch select").each(function(){ 
            //Here I am selecting the field's parameter data bbecause that stores the paramter name to be passed in to bugzilla
            var name = $(this).data("parameter");
            
            var value = $(this).val();
            searchArr[name] = value;
        });

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
                    var tr = "<tr><td><a href='#'>"+bug[i].id+"</a></td>";
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
                    $( "#bugs-contain p").text("*Bugs in red are not available for revision due to your board filter options")
                    return true;
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

    //First and foremost we need to make sure that the dialog we are appending comments tyo is still the dialog we want:
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
            var date = new Date(comArr[i].time);
            var time = date.toLocaleTimeString();
            date = date.toLocaleDateString();

            var anchorAuthor = $('<a href="#">').text(commAuthor);
            var anchorName = $('<a href="#'+commId+'"  style="float: right; margin-right: 5px">').text(commId);
            var spanTime = $('<span style="margin-left: 5px;">').text(date+" "+time);                    

            var anchorReply = $('<a href="#" class="commentReplyLink" style="float: right;">').text("Reply");
            var headerinfo = $('<h3 class="header">').append(anchorAuthor,spanTime, anchorReply, anchorName);                    
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

            $('#Comments, #addAttTableDiv').removeClass("loading");                        
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

function updateLastChanged(cardId)
{
    var now = new Date();
    $("#"+cardId).data("last_change_time", now);
}

function boardCardPopulate(){

    //Finds all bugs assigned to me and posts them to the board 
    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        beforeSend:function(){
            $("body").addClass("loading");                            
        },
        data:  boardFilterOptions                        
        //Will evetually just be the map: 
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
                
                    var cardData = $(".card").first().data();
                
                    for (var index in cardData)
                    {
                        if (index != "metadata")
                        {
                            var option = $("<option>"+index+"</option>");
                                
                            $("#quickSearchField").append(option);
                        }
                    }
                
                    $("body").removeClass("loading");
                }); 
                
            }
        }
    });
}

function setBoardFilterValues()
{
    for (var index in boardFilterOptions)
    {
        //First we want to find the .box holding the index value and set that select's value to the spec
        }
}

function dialogOptionsOpen()
{        
    //Makes sure we have the correct componenet and versions
    getCompsVers(null, "dialogOptions");
        
    //Populates the prioIconTable if it doesn't already exist
    if ($("#prioIconTable tbody tr").length == 0)
    {
        //This each statement populates the table of color options                      
        $("#Details select[name=priority] option").each(function(){
            var name = $(this).val().replace(/\s+/g, '');
                                              
            //Creater a row in the options dialog for that priority name
            makeRowPrioOptions(name);
        });
    }
    
    //Populates the jobColorTable if it doesn't already exist
    if ($("#jobColorTable tbody tr").length == 0)
    {
        //This each statement populates the table of color options                  
        $("#Details select[name=bug_severity] option").each(function(){
            var name = $(this).val().replace(/\s+/g, '');
                                              
            //Creater a row in the options dialog for that job name
            makeRowJobColorOptions(name); 
        });
    }
   
    //Populates the defaultColumntable if it doesn't already exist
    if ($("#defaultColumntable tbody tr").length == 0)
    {
        //This each statement populates the table of color options
        $("#Details select[name=bug_status] option").each(function(){
            //get the value
            var name = $(this).val().replace(/\s+/g, '');
                                        
            //Creater a row in the options dialog for that job name
            makeRowColumnOptions(name);
        });
    } 
    //Populates the WIPSetTable if it doesn't already exist
    if ($("#WIPSetTable tbody tr").length == 0)
    {
        //This each statement populates the table of WIP limit assignments
        $(".column").each(function(){
            //get the value
            var col = $(this).attr("id");
            
            var value = reverseKeyLookup(colSortKeyMap, col);
            
            //Create a row in the options dialog for that column name
            makeRowWIPSet(value);
        });
    } 
    
    
    
    //We need to wait until all the values in all the fields are entered    
    //shows the current filters being applied
    for (var index in boardFilterOptions)
    {
        $("#dialogOptions .box label[name='"+index+"']").parent().show();
        $("#dialogOptions .box label[name='"+index+"']").siblings("select").val(boardFilterOptions[index]);
    }         
                    
    $("#dialogOptions").dialog("open");
    
    //Triggers the filter select(after the duialog is open because otherwise the select's are always hidden)
    $("#filterFieldOption").trigger("change");
}

function dialogOptionsSave()
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

    //Creates a true copy of the boardFilterOptions
    var oldFilter = $.extend(true, {}, boardFilterOptions);

    if ($("#dialogOptions .box:visible select").length != 0)
    {      
        //Finds all of the selected values in boxes that are visible
        $("#dialogOptions .box:visible select").each(function(){ 
            //Grabs the field's parameter data storing the bugzilla parameter name
            var name = $(this).data("parameter");         
            var value = $(this).val();
            boardFilterOptions[name] = value;
        });

        //Removes all null values
        for (var index in boardFilterOptions)
        {
            if (boardFilterOptions[index] == null)
            {
                delete boardFilterOptions[index];
            }
        }  
    }
    else
    {
        //If there arent any filters visible we know that we want to have no filter:
        boardFilterOptions = {};
            
    }
    
   
    //Finds all of the status column assigments
    $("#dialogOptions  #defaultColumntable tr").each(function(){ 
        var status = $(this).find("td").first().text();
        
        var value = $(this).find("select").val();
        
        blankColumnMap[status] = value;
    });
    
    boardFilterOptions["method"] = "Bug.search";
    
    oldFilter["method"] = "Bug.search";
    
    $.ajax({
        url: "ajax_write_options.php",
        type: "POST",
        data: {
            boardFilterOptions: boardFilterOptions,
            prioMap: prioMap,
            jobMap: jobMap, 
            blankColumnMap: blankColumnMap, 
            limitWIP: limitWIP
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
                //Compares each associative array
                if (!deepEquals(boardFilterOptions, oldFilter ))
                {
                    //If the old filter isn't the same as the new filter, we need to refilter the page 
                    //First we remove all cards
                    $(".card").each(function(){
                        $(this).parent().remove();
                    });

                    $("#dialogOptions").dialog("close");     
                    
                    $("body>.modal div").text("Applying Filter");
                    
                    //Now we repopulate the page according to the new filter
                    boardCardPopulate();    


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
    var id = prioName+".none";
    var input = $("<input type='radio' id='"+id+"' name='radio' value='none' />");
    var label = $("<label for='"+id+"' style='float: left;'>");
    var div = $("<div class='prioBack'><div class='prioIcon' >No Icon</div></div>");
    label.append(div);
    iconDiv.append(input, label);         

    td.find("form").append(iconDiv);                    
    row.append(td);

    $(row).find("input[type=radio][value="+prioMap[prioName]+"]").attr("checked","checked");
    $("#dialogOptions #prioIconTable tbody").append(row);

    $("#"+prioName+"radiodiv").buttonset();


}

function makeRowJobColorOptions(job){
    job = job.replace(/\s+/g, '');
    var id = job+"Color";
    var row = $('<tr><td>'+job+'</td></tr>');

    var color = jobMap[job];

    var td = $("<td><div id='"+id+"' class='colorSelector'><div style='background-color:"+color+"'></div></div></td>");

    row.append(td);

    //We do this because the ColorPicker plugin requires Hex 
    color = rgb2hex(color)

    //$(row).find("input[type=radio][value="+prioMap[job]+"]").attr("checked","checked");
    $("#dialogOptions #jobColorTable tbody").append(row);

    $('#'+id).ColorPicker({
        color: color,
        onChange: function (hsb, hex, rgb) {
            $('#'+id+' div').css('backgroundColor', /*'rgb('+rgb.r+', '+rgb.g+', '+rgb.b+')'*/'#'+ hex);
        }

    });



}   

function makeRowWIPSet(col){
    //Grabs the WIP limit from the map stored in the ini 
    var value = limitWIP[col];
    
    var row = $("<tr>");
    var td1 = $("<td>").text(col);
    var input = $("<input type='number' min='0' >").val(value);
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
                getCompsVers(null, "search");
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
    //The date discrepancy was handled by correcting the timezone which is accomplished with this php call
    var date = new Date(deadline+ " UTC"+ timeOffset);
                
    //Changes the background color of the card to match the .ini file
    card.css("background-color", jobMap[job]);
                
    //Sets the title of the card to the jobtype 
    card.attr({
        "title": "(#"+card.attr("id")+")"+job+": " + summary
    });
                
    //For date testing:
    /*
                var lastEditTime = new Date(card.data("last_change_time"));
                
                lastEditTime = lastEditTime.toLocaleDateString() + " at " + lastEditTime.toLocaleTimeString();
                
                
                card.attr({"title": lastEditTime});*/
                
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
    
    if (deadline != null)
    {
        var day = date.getDate() ;                
        var month = date.getMonth(); 
        var year = date.getFullYear();   
        var until = daysUntil(year, month, day);
    }
    else
    {
        //Here if deadline is null we simply assign it a  null value which is better than  the -600,000 this kept returning before 
        until = null;
    }
            
    card.data("dayUntilDue", until);
                
    $(cardRef+ " .iconBar .calBack .calIcon").html(day).attr({
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
    if ($.isArray(cards))
    {
        var cardIds = [];
        
        var startColArr = [];
        
        for (var i in cards)
        {
            var card = cards[i];
            var startCol = card.data("cf_whichcolumn");
            
            //This line makes the status parameter optional for cards that already exist
            if (typeof(card.data("status")) != "undefined")
            {
                status = card.data("status");     
            }
            var newLi = $('<li></li>').append(card);

            //Here we check the location of the card. if the card has no specified column(or oesn't match any of the columns on the board) we place it in a column based on its status
    
            var column = $("#"+col);
            //if the length is 0 we know that column doesn't exist so we rest col to a default
            if (column.length == 0)  
            {        
                col = blankColumnMap[status];
                column = $("#"+colSortKeyMap[col]);
            }
    
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
                $(document).trigger("columnChange",[ col, startColArr[k]]);    
            }
            
            updatePosition(col, cardIds);
        }                
    }
    else
    {                       
              
        startCol = cards.data("cf_whichcolumn");          
        //This line makes the status parameter optional for cards that already exist
        if (typeof(cards.data("status")) != "undefined")
        {
            status = cards.data("status");     
        }
        newLi = $('<li></li>').append(cards);

        //Here we check the location of the card. if the card has no specified column(or oesn't match any of the columns on the board) we place it in a column based on its status
    
        column = $("#"+col);
        //if the length is 0 we know that column doesn't exist so we rest col to a default
        if (column.length == 0)  
        {        
            col = blankColumnMap[status];
            column = $("#"+colSortKeyMap[col]);
        }
    
        column.append(newLi);                    
        
        if (typeof(startCol) != "undefined")
        {
            
            //If startCOl is not undefiend we know that the card has already been added to the board and the user is simply moving a card from one to column to another
            $(document).trigger("columnChange", [col, startCol]);
            updatePosition(col, cards.attr("id"));
        }                    
    }
    //This line removes any li's that don't have a card in them
    $(".column li:not(:has(.card)), .tablists li:not(:has(.card))").remove();       
}

function makeRowColumnOptions(name)
{
    var tr = $("<tr>");
     
    var td1 = $("<td>").text(name);
     
    var td2 = $("<td>");
     
    var select = $("<select id='"+name+"ColumnDefault'>");
    
    //Adds the column options to the select
    $("#Details select[name=cf_whichcolumn] option").each(function(){
        if ($(this).val() != "---")
        {
            select.append($(this).clone()); 
        }        
    });
    
    td2.append(select);
    
    select.val(blankColumnMap[name])
    
    tr.append(td1,td2);        
    $("#defaultColumntable tbody").append(tr);        
}

function columnWIPCheck(columnId)
{        
    var column = $("#"+columnId);
              
    columnId = reverseKeyLookup(colSortKeyMap, columnId);    
               
    var numCards = $(".card", column).length;
    
    var wipLimit = limitWIP[columnId];
    
    if (wipLimit != 0)
    {
        if (numCards > wipLimit )
        {
            column.parent().css("background-color", "red").attr("title", "This column is exceeding its WIP limit");
        }
        else
        {
            column.parent().css("background-color", "").attr("title", "");   
        }
        
    }
    else
    {
        column.parent().css("background-color", "").attr("title", "");   
    }       
    
   
}

//I have refactored my quick search functionality into this function
function quickCardSearch(key, container, field)
{
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

function dialogFilterOpen(colId)
{
    /*--------------Repurposes the search dialog to act as an advanced filter--------------------*/
    
    $("#Results, #searchSubmit").hide();
                                   
    //Creates the advancedfilter dialog 
    $( "#dialogSearch" ).dialog({
        title: "Filter "+ colId              
    });
     
    $( "#dialogSearch" ).data("column", colId);
    
    $( "#dialogSearch" ).dialog("open");
   
}

function dialogFilterSave(colId)
{
    /*--------------Executes Filters--------------------*/
    $()
    
   
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
        /*else if(!$.isNumeric(i))
        {
            continue;
        }*/
        else if (tabColumns.indexOf(index) >= 0 )
        {
            var colHtml = '<div class="tablistsCon"><span class="bigBanners">'+index+'</span>\
                                <ul id="'+ id +'"class="tablists cmVoice {cMenu: \'contextMenuColumn\'}\" ></ul></div>';
                                
            $(".columnContainer").prepend(colHtml);
                                
            var buttonHtml = '<button class="btnTab">'+index+'</button>';
                                
            $("#btnAddCard").before(buttonHtml);
                                
                                
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
            html +=  "<div class=\"columnCon \"><div class=\"banners\">"+index+"</div><ul id=\""+colSortKeyMap[name]+"\" class=\"column cmVoice {cMenu: \'contextMenuColumn\'}\" > </ul> </div>";   
        }
        else
        {
            html += '<div  class="dubColumn"><div class="dubBanners">'+index+'</div>';
                        
            html += buildBoard(nest[index],name);
                        
            html += "</div>";
                        
                        
        }
    }
                           
    return html;
                
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

//An object comparison algorithm taken from stackoverflow: http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
//the algorithm seems to be working correctly  for the boardCardFilterOptions comparison
function deepEquals(x, y)
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
