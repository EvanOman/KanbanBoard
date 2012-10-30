This project requires several things from your Bugzilla installation.

1. Bugzilla must be version 4.0 or higher.  The Kanban Board has been tested on versions 4.0 and 4.2.

2. There is currently a bug in Bugzilla with an incorrect content length being returned from the XMLRPC.cgi when there are 2-byte characters in your bug fields.  View https://bugzilla.mozilla.org/show_bug.cgi?id=486306 comment 36 for an unofficial workaround.

3. The sortkeys in your Bugzilla fields must be unique. (Unique to the field; you could have two different fields with a sort key of 100)

4. To keep track of which column the item is in, Bugzilla needs a custom field added, named 'whichcolumn' (which turns into 'cf_whichcolumn') with type "Drop Down".  Values in it are the names of the columns (including big lists like Backlog or Archive) in which the cards will be placed.  

These are the bare minimum requirements.