This project requires several things from your Bugzilla installation.

1. Bugzilla must be version 4.0 or higher.  The Kanban Board has been tested on versions 4.0 and 4.2.

2. There is currently a bug in Bugzilla with an incorrect content length being returned from the XMLRPC.cgi when there are 2-byte characters in your bug fields.  View https://bugzilla.mozilla.org/show_bug.cgi?id=486306 comment 36 for an unofficial workaround.

3. The sortkeys in your Bugzilla fields must be unique. (Unique to the field; you could have two different fields with a sort key of 100)

4. To keep track of which column the item is in, Bugzilla needs a custom field added, named 'whichcolumn' (which turns into 'cf_whichcolumn') with type "Drop Down".  Values in it are the names of the columns (including big lists like Backlog or Archive) in which the cards will be placed.  

These are the bare minimum requirements.

**The main thing that you will need to setup in order for this site to contact your Bugzilla install is to edit the value of BUGZILLA_URL in the confiug.php page. This way the code knows where to send all of its API requests. The program was written with a local Bugzilla install so cross domain requests may have issues but the ajax method we used should work. 