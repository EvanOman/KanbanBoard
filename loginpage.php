<!--
To change this template, choose Tools | Templates
and open the template in the editor.
-->
<!DOCTYPE html>
<html>
    <head>
        <title>Log in</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">        
        <link type="text/css" href="themes/black-tie/jquery-ui-1.8.21.custom.css" rel="stylesheet" />
        <script type="text/javascript" src="jquery-1.7.2.js"></script>  
        <link type="text/css" href="index.css" rel="stylesheet" />
        <style type="text/css">
            #loginForm{
                width: auto;
            }

        </style>
        <!link type="text/css" href="index.css" rel="stylesheet" />
    <script type="text/javascript">
        $(document).ready(function(){                      
            
            $("#loginForm").submit(function(e){               
                
                $("body").addClass("loading");
                
                e.preventDefault();
                
                //An attempt to counter mousedown issue(see bug #128)
                //$("#btnSubmit").click();
                                                
                var login = $("#login").val();
                var password = $("#password").val();        
                
                $.ajax({
                    async: false,
                    url: "ajax_login.php",
                    type: "POST",
                    dataType: "json",
                    data: {                                                             
                        "login": login,
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
                            var userId = data.result.id;                                                      
                            
                            alert("Login successful\nWelcome User "+ userId);
                                                        
                            document.location.href = "Index.php";
                        }                                                          
                    },
                    error: function(jqXHR, textStatus, errorThrown){
                        alert("There was an error:" + textStatus);
                    }
                })
            }); 
        });
        
    </script>
</head>
<body>
    <form id="loginForm">
        <fieldset>
            <div style="float: top">
                <div style="float: top;">
                    <label for="login">User Name</label>
                    <input type="text"  name="login" id="login"  class="text ui-widget-content ui-corner-all" style="width: auto;"/>    
                </div>
                <div style="float: top;">
                    <label for="password">Password</label>
                    <input type="password" name="password" id="password"  class="text ui-widget-content ui-corner-all" style="width: auto;"/>   
                </div>
                <div style="float: top;">
                    <label for="remember">Remember Login</label>
                    <input  name="remember" id="remember"  class="text ui-widget-content ui-corner-all" style="width: auto;" type="checkbox"/>
                </div>
                <input type="submit" id="btnSubmit"value="Login"/>
        </fieldset>
    </form>  
    <div class="modal"><div class="loadingLabel">Logging In</div></div>
</body>
</html>
