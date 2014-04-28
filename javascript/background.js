var RED = [208, 0, 24, 255];  //Badge color of extension icon in RGB format.
var BLUE = [0, 24, 208, 255];

// запрос авторизации для календарей
var AUTH =
    'https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/calendar&state=%2Fprofile' +
    '&response_type=token' +
    '&redirect_uri=' + c_redirect_uri +
    '&client_id=' + c_client_id;

// запрос авторизации для списков задач
var AUTH_TASK =
    'https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/tasks&state=%2Fprofile' +
    '&response_type=token' +
    '&redirect_uri=' + c_redirect_uri +
    '&client_id=' + c_client_id;

// Time between server polls = 30 minutes.
var POLL_INTERVAL = 30 * 60 * 1000;

// Redraw interval is 1 min.
var DRAW_INTERVAL = 60 * 1000;

// The time when we last polled.
var lastPollTime_ = 0;

var token = null;

// token expiration time (in seconds)
var tokenExpiresIn = 0;

// the time we got last token
var tokenGetTime = 0;

// Storing calendars
var calendarsInfo = [];

// Storing tasks
var tasksInfo = [];

var pollUnderProgress = false;

//This is used to poll only once per second at most, and delay that if
//we keep hitting pages that would otherwise force a load.
var pendingLoadId_ = null;

var guest = new myGuest();

	function Func(request, sender, sendResponse) 
	{
		console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
		if (request.greeting == "giveMeData")
        {
            sendResponse({fullName : guest.getFullName(), emailAddr : guest.getEmailAddr() });
        }

		if (request.greeting == "changeData")
		{
            guest.setEmailAddr(request.emailAddr);
            guest.setFullName(request.fullName);
            sendResponse({fullName : guest.getFullName(), emailAddr : guest.getEmailAddr() });
		}
	}

/**
 * Fires once per minute to redraw extension icon.
 */
    function redraw()
    {
        if ((getCurrentTime() - tokenGetTime) * 0.001 >= tokenExpiresIn)
        {
            getToken();
        }

        // if 30 minutes have passed re-poll
        if (getCurrentTime() - lastPollTime_ >= POLL_INTERVAL)
        {
           pollServer();
        }
    };

    /**
    * Returns the current time in milliseconds.
    * @return {Number} Current time in milliseconds.
    */
    function getCurrentTime() {
        return (new Date()).getTime();
    };

    function getToken()
    {
        chrome.tabs.create({ url: AUTH_TASK});
    }

    function pollServer()
    {
       if (token == null)
       {
           console.log('pollServer cant load data token is null');
           drawFinal();
           return;
       }

       if (!pollUnderProgress)
       {
            pollUnderProgress = true;
            calendarsInfo = [];
             pendingLoadId_ = null;
            lastPollTime_ = getCurrentTime();
            var url;
            var xhr = new XMLHttpRequest();
            try
            {
                xhr.onreadystatechange = genResponseChangeFunc(xhr);
                xhr.onerror = function(error)
                {
                    console.log('error: ' + error);
                };

              //  url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
                url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
                xhr.open('GET', url);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                xhr.send(null);
        }
        catch (e)
        {
            console.log('ex: ' + e);
            drawFinal();
        }
    }
};

/**
 * Gathers the list of all calendars of a specific user for multiple calendar
 * support and event entries in single calendar.
 * @param {xmlHttpRequest} xhr xmlHttpRequest object containing server response.
 * @return {Object} anonymous function which returns to onReadyStateChange.
 */
function genResponseChangeFunc(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        console.log(xhr.response);

        var obj = JSON.parse(xhr.response);
        calendarsInfo = obj.items;

        for (var i = 0, cal; cal = calendarsInfo[i]; i++)
        {
           // console.log(cal.summary + ' ' + cal.description + ' ' + cal.accessRole + ' ' + cal.id);
            console.log(cal.title + ' ' + cal.id);
        }

        drawFinal();
    }
}

function drawFinal()
{
    if (calendarsInfo.length == 0) {
        this.showLoggedOut();
    }
    else
    {
        // drawing something
        // цвет текстовой области
        var bgColor =  BLUE;
        var currentBadge_ = "ok";

        chrome.browserAction.setBadgeBackgroundColor({color: bgColor});

        chrome.browserAction.setBadgeText({text: currentBadge_});

        var text = ''
        for (var i = 0, cal; cal = calendarsInfo[i]; i++)
        {
          //  text += cal.summary + '\n';
            text += cal.title + '\n'
        }
        chrome.browserAction.setTitle({'title' : text});
        chrome.browserAction.setIcon({path: '../images/icon-16.gif'});
    }

    pollUnderProgress = false;
}

/**
 * Shows the user logged out.
 */
function showLoggedOut() {
    currentBadge_ = '?';
    chrome.browserAction.setIcon({path: '../images/icon-16_bw.gif'});
    chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text: '?'});
    chrome.browserAction.setTitle({ 'title' : ''});
};

/**
 * Function runs on updating a tab having url of google applications.
 * @param {integer} tabId Id of the tab which is updated.
 * @param {String} changeInfo Gives the information of change in url.
 * @param {String} tab Gives the url of the tab updated.
 */
function onTabUpdated(tabId, changeInfo, tab) {
    var url = tab.url;
    if (!url) {
        return;
    }

    if (url.indexOf('https://www.example.com/oauth2callback') != -1) {
        // saving token and time we got it
        token = parseValue(url, 'access_token=', '&');
        tokenExpiresIn = parseValue(url, 'expires_in=', '&');
        tokenGetTime = getCurrentTime();
        console.log(token);
        console.log(tokenExpiresIn);
        console.log(tokenGetTime);
        chrome.tabs.remove(tab.id);
        pollServer();
        return;
    }

    if ((url.indexOf('www.google.com/calendar/') != -1) ||
        ((url.indexOf('www.google.com/a/') != -1) &&
            (url.lastIndexOf('/acs') == url.length - 4)) ||
        (url.indexOf('www.google.com/accounts/') != -1)) {

        // The login screen isn't helpful
        if (url.indexOf('https://www.google.com/accounts/ServiceLogin?') == 0) {
            return;
        }

        if (pendingLoadId_) {
            clearTimeout(pendingLoadId_);
            pendingLoadId_ = null;
        }

        // try to poll in 2 second [which makes the redirects settle down]
        pendingLoadId_ = setTimeout(pollServer, 2000);
    }
}

function parseValue(sourceStr, begStr, endStr)
{
    if (sourceStr.indexOf(begStr) == -1)
    {
        return null;
    }

    var temp = sourceStr.substring(sourceStr.indexOf(begStr) + begStr.length)

    if (temp.indexOf(endStr) != -1)
    {
        temp = temp.substring(0, temp.indexOf(endStr));
    }

    return temp;
}

   function init () {
       chrome.runtime.onMessage.addListener(Func);
       window.setInterval(redraw, DRAW_INTERVAL);
       chrome.tabs.onUpdated.addListener(onTabUpdated);
       getToken();
   }

   window.addEventListener('load', init, false);

   


