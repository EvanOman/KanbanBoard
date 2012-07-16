//Here I create a global variable storing the field values which i may need later on(for now all I need is Resolution)
var RESOLUTION = [];

//Next we want global variables to store the priority icons and the jobMap colors
var prioMap = {};
var jobMap = {};
var prioSortKey = {};
var boardFilterOptions = {
    "method": "Bug.search"
};
var cardChangeData = [];

var getCompsVersXHR = $.Deferred();
var getNamesXHR = $.Deferred();
var getAccProXHR = $.Deferred();
var componentData = null;

var blankColumnMap = {
    "OPEN": "Backlog", 
    "ANALYZED": "Backlog", 
    "UNCONFIRMED": "Backlog", 
    "RESOLVED": "DevDone", 
    "VERIFIED": "TestDone", 
    "CLOSED": "Archive"
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

$(document).ready(function() {
    //Add a loading class to the dialogs so they cant be used until all of the fields are loaded
    $('body, #Details, #dialogSearch, #dialogOptions').addClass("loading"); 
                
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
                
    //setup the dialog with the proper field values for the bug_severity dropdown           
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
                            var sortkey = data.result.fields[j].values[i].sort_key;
                                        
                            prioSortKey[name]=sortkey;

                            //create an option element with the inner html being the name
                            var a = $("<a>").html(name);
                                                                                
                            //append the option to the context menu
                            $("#setPriority").append(a);                                                                    
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
                        $("select[name="+fieldName+"]").append(option);
                    }
                                
                                
                }
            }
                        
        },
        error: function(jqXHR, textStatus){
            alert("(Fields)There was an error:" + textStatus);
        }
    });                              
                
    $("#btnCommentSubmit").live("click", function(e){
        //Gets the id of the card to which the comment is being appended
        var cardId = $("#dialogAddEditCard #edit-tabs a").first().attr("value");
                
        sendComment(cardId);
    });
                            
    //Enables the sortable behavior that allows the reordering of the cards
    $( ".column,.tablists" ).sortable({
        connectWith: ".column,.tablists",
        placeholder: "ui-state-highlight",
        forcePlaceholderSize: true,
        tolerance: 'pointer',
        cursorAt: {
            top: 15
        },
        cancel: "li:has(.loading)",
        //The items parameter expects only a selector which prevents the use of Jquery so here I have made a(likely very inefficent) selector which selects every li with a card in it that isn't loading
        items: "li:has(.card):not(:has(.loading))"  
    }).disableSelection();
                
    //Initially diables the sorting of tabbed items
    $(".tablists").sortable("disable");                                                               
                                                             
    //Handles the tab buttons dynamically
    $(".toolbar .btnTab").click(function(){
        var tab =  $(this).text();
        handleTabLists("#"+tab);
    });                

    //Handles the add card button
    $("#btnAddCard").click(function(){                    
        addCard();
                    
        //Sets a default value for the coloumn field(this way the context menu's addCard still works)
        $("#cf_whichcolumn").val("Limbo");
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
                                
                   
    $("#btnAddCard,#btnSearchCard,#btnOptions, .btnTab, #btnAttachmentSubmit, #searchSubmit, #toggleFilterOption, #btnLogout").button();  
                 
    $("#btnAttachmentSubmit").live("click", function(){
        $("#addAttTableDiv").addClass("loading");
    });
                
    //Logs out a user
    $("#btnLogout").click(function(){
        ajaxLogout(); 
    });
                
                
    //Pulls up the edit menu whenever a card is double clicked                       
    $(".card").live( "dblclick", function () {
                    
        if (!$(this).hasClass("loading"))
        {
            $( "#edit-tabs" ).tabs("select", 0);                        
            editCard($(this).data());
        }
                    
    });
                
    $(".card").live( "click", function (e) {
                    
        if (!$(this).hasClass("loading"))
        {
                       
        }
                    
    });
               
    $("#mb_sortKeyOptions table").live("click",function(){
        var colId = $($.mbMenu.lastContextMenuEl).find("ul").attr("id");
                    
        var sortKey = $(this).find("a").attr("value");                                         
                    
        var order = "desc";
                    
        closeContextMenu();
                    
        sortColumn(colId, sortKey, order);
                    
                    
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
        minHeight: 650,
        minWidth: 1060,                                       
        show: {
            effect: 'highlight', 
            complete: function() {
                $("#summary").focus();
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
                
                
    //Allows calendar plugin
    $( ".Dates" ).datepicker({
        dateFormat: "yy-mm-dd"
    }); 
                
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
    $("#mb_moveAllCards table").live("click", function(){
        //Finds and saves the column that was right clicked
        var startCol = $($.mbMenu.lastContextMenuEl).find("ul").attr("id");
        ;  
        var a = $(this).find("a");
        var endCol = a.html();
                    
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
                    
            //Previously the moveall method moved the cards but left all of the <li>s behind. This removes those
            $("#"+startCol+" li").remove();
        }
                    
        closeContextMenu(); 
    });
                
                
    //Handles the moveCardTo submenu moveCardTo
    $("#mb_moveCardTo table").live("click" , function(){                      
                
        var card = $($.mbMenu.lastContextMenuEl).parent();
        var newLi = $('<li></li>').append(card);
        var a = $(this).find("a");
        var column = a.html();
                    
        $("#"+column).append(card);
        var cardId = $($.mbMenu.lastContextMenuEl).attr("id");
                    
        updatePosition(column, cardId);
                                       
        closeContextMenu(); 
    });
                
                
    //Handles the edit dialog background color change based off of user selection
    $("#bug_severity").change(function () {
        var job = $(this).val();
                   
        dialogDisplay(job);
    });
                
    //When the bug status is chanbged to resolved, Bugzilla requires a valid resolution. This function shows a resolution select field when neccessary
    $("#bug_status").change(function () {
        var status = $(this).val();
                    
        //Only adds a new select field if the status is resolved and the Resolution field doesn't already exist
        if (status == "RESOLVED")
        {
            $("#resolution").parent().show();
        }
        else if (status != "RESOLVED")
        {
            //If the status doesn't equal resolved we remove the resolution box because we can't have a NEW bug with a resolution
            $("#resolution").parent().hide();
                       
            //We also want to make sure that the resolution field no longer has a value:
            $("#resolution").val("");
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
    //I think that all of this can be handled with the .toggle() method
    $("#filterFieldOption").change(function () {
        var field = $(this).val();
                    
        if ($("#"+field).parent().is(":visible") )
        {
            //Handles the case if the field is already being shown:
                        
            //First we need to change the text of the button to fit the action it will perform
            //Need to destroy button before changing the text because otherwise the styling gets funky
            $("#toggleFilterOption").button("destroy").text("Remove").button();
                        
            $("#toggleFilterOption").live( "click", function(){                                                                                                         
                            
                //Hides the field's container
                $("#"+field).parent().hide();
                            
                //Makes sure any values stored are reset to null(or in this case an empty string "")
                $("#"+field).val(""); 
                            
                //Then trigger the change to refresh the button
                $("#filterFieldOption").change();
            });   
        }
        else
        {
            //Handles the case if the field is not being shown:
                        
            //First we need to change the text of the button to fit the action it will perform
            //Need to destroy button before changing the text because otherwise the styling gets funky
            $("#toggleFilterOption").button("destroy").text("Add").button();
                        
            $("#toggleFilterOption").live( "click", function(){                                                                                                         
                            
                //Makes sure any values stored are reset to null(or in this case an empty string "")
                $("#"+field).val(""); 
                            
                //Hides the field's container
                $("#"+field).parent().show();  
                            
                //Then trigger the change to refresh the button
                $("#filterFieldOption").change();
            });   
        }
    });
                                            
    //Updates the cards position whenever it is moved and also checks to make sure that the card isn't loading
    $( ".column, .tablists" ).sortable({                    
        receive: function(event, ui) {                         
            var col = $(this).attr("id");
            var cardId = $(">div",ui.item).attr("id");
            updatePosition(col, cardId);
        }
    });                          
                
               
                                                
                

                                                           
                
    //Sets the priority of the card 
    $("#mb_setPriority table").live("click", function(){                  
                    
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
        var id = $(this).attr("value");
                   
        if (tab == "Attachments")
        {
            getAttachments(id);
        }
    });
                
    $('#accordion .header').live("click",function() {
        $(this).next().toggle("slow");
        return false;
    }).next().hide();
    
                
    $("#attachmentTable tbody tr a").live("click", function(e){
        e.preventDefault();
        var id = $(this).attr("value");
        $("#secretIFrame").attr("src","ajax_DownloadAttachment.php?id="+id);
                 
    })
                
    $("#sortRadioDiv").buttonset();
                
                   
    $( "#bugs tbody" ).on("click", "tr td a", function (e){
        e.preventDefault();
        var cardId = $(this).text();
                           
        editCard($("#"+cardId).data());
    });
                        
                 
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
                var comp = componentData[j].values[k].name;
                var option = $("<option>").val(comp).html(comp);
                $("#"+dialogID+" select[name="+fieldName+"]").append(option);
            }                                                                                                 
        }                                                                                                     
    }        
}

//Here I have separated the field population and dialog configuration to allow getCompsVers to refresh the fields after it finishes loading
function dialogFields(fieldValues)
{                                                         
    //Note that the Add Card Dialog is set so that the tabs have a valuer of 0. We only want specific values for the edit dialog
    if (fieldValues != null)
    { //This method has been modified to allow for immediate retireval(the components and versions are stored, ajax only called once)
        getCompsVers([fieldValues["product"]], "Details");
        //Changes the edit dialog to have the correct fields for the selected card's Product.                 
        //Populates the fields
        $("#summary").val(fieldValues["summary"]);
        $("#bug_severity").val(fieldValues["bug_severity"]);
        $("#user").val(fieldValues["user"]);
        $("#priority").val(fieldValues["priority"]);
        $("#cf_whichcolumn").val(fieldValues["cf_whichcolumn"]);
        $("#deadline").val(fieldValues["deadline"]);
        $("#product").val(fieldValues["product"]);  
        $("#version").val(fieldValues["version"]);
        $("#component").val(fieldValues["component"]);                
        $("#bug_status").val(fieldValues["status"]);
        $("#op_sys").val(fieldValues["op_sys"]);
        $("#rep_platform").val(fieldValues["rep_platform"]);                                                

        if (fieldValues["resolution"] !== "" && fieldValues["resolution"] != undefined)
        {
            $("#resolution").parent().show();
            $("#resolution").val(fieldValues["resolution"]);
        }
        $("#attachmentBugId").val(fieldValues["id"]);

        //Sets the dialog background to the correct color
        dialogDisplay(fieldValues["bug_severity"]);
    }
    else {
        //If cardId is 0 then we know that we are in the add card dialog and consequently we want to ensure that all fields are empty(including the comments)
        $("#Details input, #Details textarea, #Details select:not(#cf_whichcolumn)").val("");    

        //We want the default value for Status for a new card to be "OPEN", not unconfirmed
        $("#bug_status").val("OPEN");

        //Sets the default priority to medium
        $("#priority").val("Medium");

        //A new card should never have a resolution:
        $("#resolution").parent().hide();

        var first = $("#bug_severity option").first().val();                
        dialogDisplay(first);

        getCompsVers([$("#product").val()], "Details");

        getCompsVers([$("#product").val()], "dialogOptions");

    }
}

function editCard(fieldValues) { 

    var cardId = fieldValues["id"];

    $("#dialogAddEditCard").data("cardId", cardId);

    var lastEditTime = new Date(fieldValues["last_change_time"]);

    lastEditTime = lastEditTime.toLocaleDateString() + " at " + lastEditTime.toLocaleTimeString();

    //Adds edit specifc dialog properties
    $("#dialogAddEditCard").dialog( "option", "title", "Edit Card #"+cardId+"(Last Edited: " + lastEditTime +")");
    $("#edit-tabs ul li").show();

    //We need the atachments tabs to be specific to the card as well but we only want to retireve this data from the server if it is requested by the user
    //To accomplish this we will set the attachments tabs to have an associated value equal to the id of the card being Edited
    $("#edit-tabs ul li a").each(function(){
        //Sets each tab on the Edit dialog to have the card ID as a value
        $(this).attr({
            "value": cardId
        });                                  
    });                                                                              

    //Now that we have the correct ID, we populate the fields:
    dialogFields(fieldValues);

    //Pulls down the comments when dialog is opened
    getComments(cardId);                

    $( "#dialogAddEditCard" ).dialog( "option", "buttons", { 
        "Save Card": function() {                                                                                                

            //checks to make sure that the dialog isn't still loading
            if (!$("#Details").hasClass("loading"))
            {
                $( "#dialogAddEditCard" ).dialog( "close" );

                //Sends the field info to Bugzilla to be processed
                ajaxEditBug($("#cf_whichcolumn").val(), $("#component").val(), cardId, $("#priority").val(), $("#product").val(), $("#bug_severity").val(), $("#summary").val(), $("#version").val(),$("#user").val(),
                    $("#deadline").val(), $("#bug_status").val(), $("#op_sys").val(),$("#rep_platform").val(), $("#resolution").val());       
            }


        },
        Cancel: function() {

            $( this ).dialog( "close" );
        }   
    });
    $( "#dialogAddEditCard" ).dialog( "option", "close",function()  {

        //We want to remove any previous comments:
        $("#Comments #accordion div, #Comments #accordion .header").each(function(){
            $(this).remove();
        });

        //Clears every input values
        $("#Details input, #Details textarea, #Details select").val("");

        //Clears the comments:
        $("#Comments #accordion div").remove();

        //Clears the attachments
        $("#attachmentTable tbody").empty();   

        //We want to hide this incase it is showing
        $("#resolution").parent().hide();

        //We also want to make sure that the resolution field no longer has a value:
        $("#resolution").val("");


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
    var text = $('<textarea id="commentReplyText" class="text ui-widget-content ui-corner-all" style="height: 250px; width:640px;">');
    var comm = $('<div class="commDiv">').append(text);                      
    $("label[for=Comments],#Comments").hide();
    $("#detailsRight").prepend(label,comm);


    //Here we set the tab values to 0 to prevent the display of false information
    $("#edit-tabs ul li a").each(function(){
        //Sets each tab on the Edit dialog to have the card ID as a value
        $(this).attr({
            "value": 0
        });                                  
    });

    //Now that we have the correct ID, we populate the fields:
    dialogFields(null);

    $( "#dialogAddEditCard" ).dialog( "option", "buttons", { 
        "Save Card": function() {
            //Want to make sure all of the fields have loaded before allowing the use of the save button
            if (!$("#Details").hasClass("loading"))
            {
                if($( "#summary" ).val()=="")
                {
                    $("#dialogInvalid").dialog("open");
                }
                else{                                  
                    var div = $("<div class='loadingLabel'>Adding Card</div>");
                    $("#Details .modal").empty().append(div);
                    //Files a new bug in the bugzilla server
                    ajaxCreateCard($("#cf_whichcolumn").val(), $("#component").val(), $("#priority").val(), $("#product").val(),  $("#bug_severity").val(), $("#summary").val(), 
                        $("#version").val(),$("#user").val(),$("#deadline").val(), $("#bug_status").val(),$("#op_sys").val(), $("#rep_platform").val(), $("#commentReplyText").val() );                                                                                       
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
        $("#detailsRight label[for=commentReplyText],#detailsRight #commentReplyText").remove();

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
    var startCol = $($.mbMenu.lastContextMenuEl).find("ul").attr("id"); 

    //Presets the form to open with the correct column selected                
    $("#cf_whichcolumn").val(startCol);
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

//Card creation function, adds the card to the page. Need the following Bugzilla parameters: product, component, version, bug_severity, priority. 
//NOTE: Apprently description can be passed in with this Bug.create
function  ajaxCreateCard(col, component,   priority, product, severity, summary, version, user, deadline, status, op_sys, rep_platform, description){ 

    $.ajax({
        url: "ajax_POST.php",
        type: "POST",
        beforeSend: function(){                        
            $("#Details").addClass("loading");
        },
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
            "description": description,
            "rep_platform": rep_platform,
            "status":status


        },
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

                var now = new Date();

                //Now that we have the new card's Id we can post it to the board:(Note that reolution will be an empty string
                postCard(id,col, component,   priority, product, severity, summary, version, user, deadline, status,  op_sys, rep_platform, now, "");
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
            }

        },
        error: function(jqXHR, textStatus, errorThrown){
            alert("There was an error:" + textStatus);
        }
    });               

}

//Posts a card to the page containing all of the propper information. Used to post new cards and also to populate the board with existing cards
function postCard(id,col, component,   priority, product, severity, summary, version, user, deadline, status, op_sys, rep_platform, last_change_time, resolution){
    var newCard = $('<div id="'+id+'" class="card "><div class="cardText">(#'+id+') '+summary+'</div><div class="iconBar"></div><div class="modal"><div>Saving Card</div></div></div>');

    newCard.addClass("cmVoice {cMenu:\'contextMenuCard\'}, normal");
    
    //We pass in the status because it is not saved yet
    appendCard(newCard, col, status); 

    //Puts the time in the correct format
    last_change_time = new Date(last_change_time);

    //NOTE: I realize saving the data locally and on the database violates the DRY principle however I don't want the user to have to wait for an AJAX call to complete in order to access bug info
    newCard.data({
        "id": id,
        "summary": summary,
        "bug_severity": severity,
        "priority": priority,
        "product": product,
        "component": component,
        "version": version,
        "user": user,
        "cf_whichcolumn": col,
        "deadline": deadline,
        "status": status,
        "op_sys": op_sys,
        "rep_platform": rep_platform,
        "last_change_time" : last_change_time,
        "resolution": resolution,
        //NOTE This method of saving the sort key instroduces a new dependency: In order for postCard to be called, Bug.Fields(generic) musty first be called
        "prioSortKey": prioSortKey[priority]

    });

    /**/
    displayHandler(newCard);
}


//NOTE: This function is dependent on the existance of the Bugzilla cf_whichcolumn custom field
function ajaxEditBug(col, component, ids, priority, product, severity, summary, version, user, deadline, status, op_sys, rep_platform, resolution){  

    var card = $("#"+ids);

    cardChangeData[ids] = $.extend({}, card.data(), {
        "id": ids,
        "summary": summary,
        "bug_severity": severity,
        "priority": priority,
        "product": product,
        "component": component,
        "version": version,
        "user": user,
        "cf_whichcolumn": col,
        "deadline": deadline,
        "status": status,
        "op_sys": op_sys,
        "rep_platform": rep_platform,
        "resolution": resolution
    });

    //Adds loading icon to a card being saved
    card.addClass("loading");

    var postData = {
        "cf_whichcolumn": col,
        "component": component,                   
        "product": product,
        "priority": priority,
        "bug_severity": severity,
        "summary": summary,
        "version": version,
        "user": user,
        "deadline": deadline,
        "status": status,
        "op_sys": op_sys,
        "rep_platform": rep_platform,
        "resolution": resolution
    }

    //If the Bug has no resolution we don't want to post anything':
    if (resolution == undefined || resolution == "")
    {
        delete postData["resolution"];
    }

    //If we aren't changing anything about the bug there isn't any reason to update so we remove unneccessary values:
    for (var index in postData)
    {
        //If it is the same as before
        if (postData[index] == card.data(index))
        {
            //remove it from the data being posted
            delete postData[index];
        }                   
    }                                                 

    //Then after we filtered out the unneccary fields we need to check if anything is left, otherwise there is no need to send the post
    if (postData!=null)
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
                    //Here we save the changeData to the local
                    card.data(cardChangeData[ids]);

                    //Then delete the changeData
                    delete cardChangeData[ids];

                    //Updates the card's text
                    $('#'+ids+" .cardText").html("(#"+ids+") "+summary);

                    displayHandler(card);

                    appendCard(card, col, card.data("status"));

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


}

//An update function that stores a card position when called
function updatePosition(column, cardIds)
{
    //This function expects an array so if the input is not not an array we will make it one:
    if (!$.isArray(cardIds))
    {
        cardIds = [cardIds];
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
                var now  = new Date();
                for (var i in cardIds) { 
                    var card = $("#"+cardIds[i]);

                    updateLastChanged(cardIds[i]);

                    card.removeClass("loading"); 
                    card.data({                                
                        "cf_whichcolumn": column                                    
                    });
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
            //Here I am selecting the label's text because I have set it to store the Bugzilla field values
            var name = $(this).siblings("label").attr("name");
            ; 
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
                    processResults();
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
        processResults();
    }

    //
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
                var data = $("#"+bug[i].id).data();
                $( "#bugs tbody" ).append( "<tr>" +
                    "<td><a href='#'>"+bug[i].id+"</a></td>" + 
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
        var text = $('<textarea id="commentReplyText" class="text ui-widget-content ui-corner-all">');
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
                var commId = "Comment"+i;         
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
            var header = $('<h3 class="header">').append(anchorAuthor,spanTime, anchorReply, anchorName);                    
            var p = $('<p>').text(commText);
            var comm = $('<div class="commDiv" id="'+commId+'">').append(header, p);                      
            $("#Comments #accordion").append(comm);
        }       

        $('#Comments').removeClass("loading");
    }

}

$(".commentReplyLink").live("click", function(e){
    e.stopPropagation();
    var ids = $(this).closest("div").attr("id");
    var quote = "(In response to "+ids+"): '"+$("#"+ids+" p").text()+"'\n";

    $("#commentReplyText").val(quote);
});            

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
            }
            else if (!data.result)
            {
                alert("Something is wrong");
            }
            else 
            {                                                        
                //Now that we have successfully posted a comment, we are going to pretend that bugzilla gave us all the data back and save the data 
                //First we need the current time
                var now = new Date();

                //Now we need to put the info in the right format: 
                commentObject = {
                    //We know that the author isa the user that is logged in(my username will be replaced but the $_SESSION["login"] eventually
                    "author": "evan.oman@blc.edu",
                    "bug_id": cardId,
                    "creator": "evan.oman@blc.edu",
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
        for (var i in data.result.attachments) {
            alert("Added Attachment ID: " + i);


            //In a simlar manner to the sendComments Function, we need to update thge comments with the addition of the comment for this attachment:

            //Now that we have successfully posted a comment, we are going to pretend that bugzilla gave us all the data back and save the data 
            //First we need the current time
            var now = new Date();

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
                var commArr = [] 
                comaArr.push(commentObject);
                $("#"+cardId).data("comments", commArr)
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
                for (var i in data.result.bugs)
                {
                    var bug = data.result.bugs[i];
                    postCard(bug.id,/*bug.cf_whichcolumn*/ bug.cf_whichcolumn, bug.component, bug.priority, bug.product, bug.severity, bug.summary, bug.version, bug.creator, bug.deadline, bug.status, bug.op_sys, bug.platform, bug.last_change_time, bug.resolution);                                
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


                $("body").removeClass("loading");
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
        
    //Creates the prioIconTable if it doesn't already exist
    if ($("#prioIconTable tbody tr").length == 0)
    {
        //This each statement populates the table of color options                      
        $("#priority option").each(function(){
            var name = $(this).val().replace(/\s+/g, '');
                                              
            //Creater a row in the options dialog for that priority name
            makeRowPrioOptions(name);
        });
    }
    
    //Creates the jobColorTable if it doesn't already exist
    if ($("#jobColorTable tbody tr").length == 0)
    {
        //This each statement populates the table of color options                  
        $("#bug_severity option").each(function(){
            var name = $(this).val().replace(/\s+/g, '');
                                              
            //Creater a row in the options dialog for that job name
            makeRowJobColorOptions(name); 
        });
    }
   
    //Creates the defaultColumntable if it doesn't already exist
    if ($("#defaultColumntable tbody tr").length == 0)
    {
        //This each statement populates the table of color options
        $("#bug_status option").each(function(){
            //get the value
            var name = $(this).val().replace(/\s+/g, '');
                                        
            //Creater a row in the options dialog for that job name
            makeRowColumnOptions(name);
        });
    }   
    
    $("#dialogOptions").dialog("open");
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

    $("#dialogOptions #jobColorTable tbody tr").each(function(){
        var name = $(this).find("td").first().text();

        //This finds the color of the color preview. Returns an RGB string, hopefully this will work
        var color = $(this).find("td").last().find("div").find("div").css("background-color");                                 

        jobMap[name] = color;
    });

    //Creates a true copy of the boardFilterOptions
    var oldFilter = $.extend(true, {}, boardFilterOptions);

    //Finds all of the selected values in boxes that are visible
    $("#dialogOptions .box:visible select").each(function(){ 
        var name = $(this).siblings("label").attr("name");
        ; 
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
    //

    //Finds all of the selected values in boxes that are visible
    $("#dialogOptions  #defaultColumntable tr").each(function(){ 
        var status = $(this).find("td").first().text();
        
        var value = $(this).find("select").val();
        
        blankColumnMap[status] = value;
    });
    
    $.ajax({
        url: "ajax_write_options.php",
        type: "POST",
        data: {
            boardFilterOptions: boardFilterOptions,
            prioMap: prioMap,
            jobMap: jobMap, 
            blankColumnMap: blankColumnMap
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
                //TODO Need to find a way to compare each associative array
                if (/*!$(boardFilterOptions).compare(oldFilter)*/ true)
                {
                    //If the old filter isn't the same as the new filter, we need to refilter the page 
                    //First we remove all cards
                    $(".card").each(function(){
                        $(this).parent().remove();
                    });

                    $("#dialogOptions").dialog("close");     

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

                        var job = $(this).data("bug_severity").replace(/\s+/g, ''); 
                        var color = jobMap[job];

                        $(this).css("background-color", color);

                        $("#dialogOptions").dialog("close");  
                    });
                }
            //Now that we have made changes to 


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

//This function converts rgb colors to their hex equivalent
function rgb2hex(rgb){
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" +
    ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
    ("0" + parseInt(rgb[3],10).toString(16)).slice(-2);
}

//NOTE:This method makes the following assumptions: every card should have the same data and there should always be a card on the board
function dialogSortOpen(colId)
{   

    /*Not sure if I want to do this in this manner, makes too many assumptions
     *
                        //First we populate the sort criteria selection box if it has been already:
                        if ($("#sortCriteriaSelect").children().length == 0)
                        {
                            //Stores a complete duplicate of the random card data  
                            var cardData = $.extend(true, {}, $(".card").first().data());

                            //Appends each value name
                            for (var index in cardData)
                            {
                                //Right now this appends a metadata option as well, for now I will simply filter it out
                                if (index != "metadata")
                                {
                                    var option = $("<option>").val(index).text(index);
                                    $("#sortCriteriaSelect").append(option);   
                                }                    
                            }
                        }*/

    //Sets the sort menu's title
    $( "#dialogSort" ).dialog( "option", "title", "Sort "+colId);

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
    var columnId = $($.mbMenu.lastContextMenuEl).find("ul").attr("id");

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
    var job = card.data("bug_severity").replace(/\s+/g, '');
    var prio = card.data("priority").replace(/\s+/g, '');                
    var deadline = card.data("deadline");
    var summary = card.data("summary")
    //The date discrepancy was handled by correcting the timezone which is accomplished with this php call
    var date = new Date(deadline+ " UTC"+ getGreenwhichTime());
                
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
    var day = date.getDate() ;                
    var month = date.getMonth(); 
    var year = date.getFullYear();
    var until = daysUntil(year, month, day);
                
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
function appendCard(card, col, status) 
{
    var newLi = $('<li></li>').append(card);

    //Here we check the location of the card. if the card has no specified column(or oesn't match any of the columns on the board) we place it in a column based on its status
    var column = $("#"+col.replace(/\s+/g, ''));
    //if the length is 0 we know that column doesn't exist so we rest col to a default
    if (column.length == 0)  
    {        
        col = blankColumnMap[status];
        column = $("#"+col.replace(/\s+/g, ''));
    }
    
    column.append(newLi);
}

function makeRowColumnOptions(name)
{
    var tr = $("<tr>");
     
    var td1 = $("<td>").text(name);
     
    var td2 = $("<td>");
     
    var select = $("<select id='"+name+"ColumnDefault'>");
    
    //Adds the column options to the select
    $("#cf_whichcolumn option").each(function(){
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