<?php
/*
Copyright(c) 2012, Eckhardt Optics
Authors: Evan Oman, John Eckhardt

This is part of Bugzilla Kanban Board.

Bugzilla Kanban Board is free software: you can
redistribute it and/or modify it under the terms of the GNU
General Public License (GNU GPL) as published by the Free Software
Foundation, either version 3 of the License, or (at your option)
any later version.  The code is distributed WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.
 */
define("BUGZILLA_URL", "http://bugzilla/xmlrpc.cgi");

//setup your SMTP connection details here
define("SMTP_HOST", "mail.yourserver.com");
define("SMTP_PORT", 26);
define("SMTP_USER", "username");
define("SMTP_PASS", "password");

define("EMAIL_FROM_ADDRESS", "address");
define("EMAIL_FROM_NAME", "from name");
?>