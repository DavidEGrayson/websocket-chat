var ws;
var connected;
var userName;

// Called when the document has been loaded.
function start()
{
		if (!("WebSocket" in window))
		{
				status(false, "Your browser does not support web sockets.  Please use <a href='http://www.google.com/chrome'>Google Chrome</a>.");
				return;
		}
		
		status(false, "Trying to connect.");

		var name = getUrlParameter('name');
		
		ws = new WebSocket("ws://"+window.location.hostname+":8080/chat?name=" + escape(name));
		ws.onopen = onOpen;
		ws.onmessage = onMessage;
		ws.onclose = onClose;

    sendKeepAlives();
    updateElementSizes();
}

function updateElementSizes()
{
		chatView.style.height = window.innerHeight-100+"px";
}

function sendKeepAlives()
{
		if (ws && ws.readyState == WebSocket.OPEN)  // If a websocket is open...
    {
        ws.send('');  // Send an empty string to avoid TCP timeout.
		}
    setTimeout("sendKeepAlives();", 60000);
}

function onClose()
{
		status(false, "Connection closed.");
}

function onOpen()
{
		// Web Socket is connected. You can send data by send() method.
    userName = undefined;
	  status(true, "Connected.");
}

function onMessage(evt)
{
		if (evt.data == "")
		{
				// Received a keepalive message from the host.
				return;
		}

		// The first character is the command.  The rest is
    // the data.
	  var command = evt.data[0]
		var data = evt.data.slice(1)

		if (command=='c')
		{
				// Received a message for the chat room.
				chatView.add("<div class=\"chat_message\">"+sanitize(data)+"</div>");
		}
		else if (command=='e')
		{
				// Received a notification that a new user has arrived.
				chatView.add("<div class=\"chat_message\">" + data + " has entered.</div>");
				userList.add(data);
		}
		else if (command=='l')
		{
				// Received a notification that a user has left.
				chatView.add("<div class=\"chat_message\">" + data + " has left.</div>");
				userList.remove(data);
		}
		else if (command == 's')
		{
				// Received the current state of the chat room.
				// Currently all this has is a list of the particpants.
				var names = data.split(',')
				for (var i=0; i < names.length; i++)
				{
						userList.add(names[i])
				}
		}
		else if (command == 'n')
		{
				// Received the name that has been assigned to us by the server.
        userName = data;
        updateServerStatus();
		}
}

function updateServerStatus()
{
    var chat = document.getElementById("chat");
    var serverStatus = document.getElementById("server_status");
    chat.className = connected ? "connected" : "not_connected";
		if (connected)
    {
        if (userName)
        {
            serverStatus.innerHTML = "Logged in as <b>"+userName+".</b>";
        }
        else
        {
            serverStatus.innerHTML = "Connected.";
        }
    }
    else
    {
        serverStatus.innerHTML = "Not connected.";
    }
}

function status(new_connected, str)
{
		if (new_connected != connected)
		{
				connected = new_connected;
				updateServerStatus();
    }
		chatView.add("<div class=\"status_message\">"+str+"</div>");
}

userList = {};
userList.docObj = document.getElementById("chat_user_list");
userList.names = [];
userList.elementFor = function(name)
{
    return document.getElementById('user_list_item_'+name);
}
userList.add = function(name)
{
    // Create the element.
    var new_element = document.createElement('div');
		new_element.setAttribute('id', "user_list_item_"+name)
    new_element.className = 'user_list_item';
    new_element.appendChild(document.createTextNode(name)); 

    // Insert it in the correct place in the userList.names
    // list and in the DOM. 
		var i;
    for(i = 0; i < this.names.length; i++)
    {
				if (this.names[i] > name)
        {
						var b = this.elementFor(this.names[i]);
						this.docObj.insertBefore(new_element, b);
            this.names.splice(i,0,name);
						return;
        }
		}

		this.names.push(name);
    this.docObj.appendChild(new_element);
}
userList.remove = function(name)
{
		var uli = this.elementFor(name);
    if (uli)
		{
				userList.docObj.removeChild(uli);
		}

    var i;
    for (i = 0; i < this.names.length; i++)
    {
				if (this.names[i] == name)
        {
            this.names.splice(i,1);
        }
    }
}
		
var chatView = document.getElementById("chat_view");
chatView.add = function(str)
{
    var scrollIsAtBottom = (this.scrollTop >= this.scrollHeight - this.clientHeight - 10);
		this.innerHTML += str;
		
		if (scrollIsAtBottom)
    {
        this.scrollToBottom();
		}
}
chatView.scrollToBottom = function()
{
    this.scrollTop = this.scrollHeight - this.clientHeight;
}

function sendChat()
{
		var chat_input = document.getElementById('chat_input');
		var val = chat_input.value;
		if (val!='')
		{
				ws.send('c'+val);
				chat_input.value = '';
        chatView.scrollToBottom();
		}
}

function getUrlParameter(name)
{
		var regexS = "[\\?&]"+name+"=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.href);
		return results == null ? "" : results[1];
}

function sanitize(str)
{
		return str.replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
