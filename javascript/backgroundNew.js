/**
 * Created by AstafyevaLA on 24.04.2014.
 */

// authorization module
var oauthMine = new OAuth2(c_redirect_uri, c_client_id, c_scope);

// popup win settings
var popupSettings = new PopupSettings(-1, -1);

// task lists of a current user
var taskLists = [];

// calendar lists of a current user
var calendarLists = [];

// curent user`s name
var userName = null;

// current token ok
var currTokenOk = false;

// google analytics
var _gaq;

/* updating icon and popup page */
function updateView() {
    var isTokenOk = oauthMine.token != null; //oauthMine.isTokenOk();

    if (currTokenOk != isTokenOk) {
        if (isTokenOk) {
            chrome.browserAction.setIcon({ 'path' : '../images/daybyday16.png'});
            chrome.browserAction.setPopup({popup : "views/Popup.html"});
        }
        else {
            chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
            chrome.browserAction.setPopup({popup : ""});
            taskLists = [];
            calendarLists = [];
            userName = null;
        }
    }

    if (oauthMine.isTokenOk() && oauthMine.allowRequest()) {
        if (taskLists.length == 0) {
            AskForTaskLists(true);
        }

        if (calendarLists.length == 0) {
            AskForCalendars(true);
        }

        if (!userName) {
            AskForName(true);
        }
    }


    currTokenOk = isTokenOk;
};

/* Callback function for AskForTaskLists*/
/* xhr - request*/
function onGotTaskLists(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        var isOk;
        var exception = null;

        LogMsg('On Got TaskLists ' + xhr.readyState + ' ' + xhr.status);

        try {
            var text = xhr.response;
            isOk = xhr.status == ST_REQUEST_OK;
            var obj = JSON.parse(text);
            taskLists= obj.items;
        }
        catch (e) {
            LogMsg('onGotTaskLists ex: ' + e);
            taskLists = [];
            isOk = false;
            throw e;
        }
        finally {
            // sending a message to popup window
            chrome.runtime.sendMessage({greeting: "taskListReady", isOk: isOk});
            updateView();
        }
    }
}
/* Callback function for AskForCalendars*/
/* xhr - request*/
function onGotCalendars(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        var isOk;

        try {
            var text = xhr.response;
            isOk = xhr.status == ST_REQUEST_OK;
            var obj = JSON.parse(text);
            calendarLists= obj.items;
        }
        catch (e) {
            LogMsg('onGotCalendars ex: ' + e);
            calendarLists = [];
            isOk = false;
            throw e;
        }
        finally {
            // sending a message to popup window
            chrome.runtime.sendMessage({greeting: "calendarListReady", isOk: isOk});
            updateView();
        }
    }
}

/* Callback function for AskForName*/
/* xhr - request*/
function onGotName(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        var isOk;
        // LogMsg('On Got Name ' + xhr.readyState + ' ' + xhr.status);

        try {
            var text = xhr.response;
            isOk = xhr.status == ST_REQUEST_OK;
            var obj = JSON.parse(text);
            userName = obj.name;
        }
        catch (e) {
            LogMsg('ex: ' + e);
            userName = null;
            isOk = false;
            throw e;
        }
        finally {
            // sending a message to popup window
            chrome.runtime.sendMessage({greeting: "userNameReady", isOk: isOk});
            updateView();
        }
    }
}

/* Callback function for AddTask */
/*xhr - request*/
function onAddTask(xhr)
{
    return function()
    {
        if (xhr.readyState != 4) {
            return;
        }

        if (xhr.status != ST_REQUEST_OK) {
            try {
                var text = xhr.response;
                var obj = JSON.parse(text);
                var error = xhr.statusText + ' ' + xhr.status + '\n' + obj.error.code + ' ' + obj.error.message;
                chrome.runtime.sendMessage({greeting: "AddedError", error: error});
                throw new Error(error);
            }
            catch (e) {
                LogMsg('ex: ' + e);
                throw e;
            }
        }
        else {
          //  taskInProcess = null;
            chrome.runtime.sendMessage({greeting: "AddedOk", type: "task"});
        }
    };
}

/* Callback function for AddEvent */
/* xhr - request*/
function onAddEvent(xhr)
{
    return function()
    {
        if (xhr.readyState != 4) {
            return;
        }

        if (xhr.status != ST_REQUEST_OK) {
            try {
                var text = xhr.response;
                var obj = JSON.parse(text);
                var error = xhr.statusText + ' ' + xhr.status + '\n' + obj.error.code + ' ' + obj.error.message;
                chrome.runtime.sendMessage({greeting: "AddedError", error: error});
                throw new Error(error);
            }
            catch (e) {
                LogMsg('ex: ' + e);
                throw e;
            }
        }
        else {
            // eventInProcess = null;
            chrome.runtime.sendMessage({greeting: "AddedOk", type: "event"});
        }
    };
}

/* Adds task to a task list */
/* string name - name of a task,
   string listId - id of task list to add task,
   string date - date of task (as a value of input date),
   string notes - comment to task
 */
function AddTask(name, listId, date, notes) {

    if (!oauthMine.allowRequest())
    {
        LogMsg('AddTask: another request is processing');
        throw new Error('AddTask: another request is processing');
    }

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onAddTask(xhr);
        xhr.onerror = function(error)
        {
            LogMsg('AddTask: error: ' + error);
            throw new Error(error);
        };

        if (date) {
            date = date + 'T00:00:00Z';
        }

        notes = filterSpecialChar(notes);
        name = filterSpecialChar(name);

        url  = 'https://www.googleapis.com/tasks/v1/lists/' + listId + '/tasks';

        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        var params = date == null ? '{"title":"' + name + '","notes":"'+ notes + '"}' : '{"title":"' + name + '","due":"' + date + '","notes":"'+ notes + '"}';
        oauthMine.setSignedRequest(xhr, params, true);
    }
    catch (e)
    {
        LogMsg('AddTask ex: ' + e);
        throw e;
    }

}

/* Adds event to a calendar */
/* string name - name of an event,
   string listId - id of calendar to add an event,
   string timeZone - timeZone of the calendar
   string dateStart - start date of an event (as a value of input datetime-local),
   string dateEnd - end date of an event (as a value of input datetime-local),
   string description - the description of an event,
   boolean allDay - is this an all day event,
   string place - place of an event,
   string recurrenceTypeValue - elem of repetitionPeriods, null if don`t need repetition
   array of string reminderTimeArray - subArray of remindersPeriods, [] if don`t need reminders
   array of string reminderMethodArray - subArray of remindersMethods, [] if don`t need reminders
 */
function AddEvent(name, listId, timeZone, dateStart, dateEnd, timeStart, timeEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray, reminderMethodArray) {
    if (!oauthMine.allowRequest())
    {
        LogMsg('AddEvent: another request is processing');
        throw new Error('AddEvent: another request is processing');
    }

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onAddEvent(xhr);
        xhr.onerror = function(error)
        {
            LogMsg('AddEvent: error: ' + error);
            throw new Error(error);
        };

        var timeStartLong = timeStart;

        // time should be in a long format HH:MM:SS
        if (timeStartLong.length == 5) {
            timeStartLong += ':00';
        }

        var timeEndLong = timeEnd;

        // time should be in a long format HH:MM:SS
        if (timeEndLong.length == 5) {
            timeEndLong += ':00';
        }

        var start = allDay? dateStart : dateStart + 'T' + timeStartLong  + GetTimeZoneOffsetStr(); //dateStart + ':00' + GetTimeZoneOffsetStr();
        var end = allDay?  CurrDateStr(addDays(dateEnd, 1)): dateEnd + 'T' + timeEndLong  + GetTimeZoneOffsetStr(); // dateEnd + ':00' + GetTimeZoneOffsetStr();

        LogMsg(start);
        LogMsg(end);

        description = filterSpecialChar(description);
        name = filterSpecialChar(name);
        place = filterSpecialChar(place);
        var recurrenceRule = BuildRecurrenceRule(recurrenceTypeValue);
        var reminderTimeArrayMins = BuildReminderTimeArrayMins(reminderTimeArray);
        var reminderMethodArrayTypes = BuildReminderTimeArrayMins(reminderMethodArray);

        url  = 'https://www.googleapis.com/calendar/v3/calendars/' + listId + '/events';

        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        var params = CreateEventParams(start, end, allDay, description, name, place, recurrenceRule, timeZone, recurrenceRule != null , reminderTimeArrayMins, reminderMethodArrayTypes);
        oauthMine.setSignedRequest(xhr, params, true);
    }
    catch (e)
    {
        LogMsg('AddEvent ex: ' + e);
        throw e;
    }
}

/* Creates params for an event*/
/*
 string start - start date of an event (in correct format 2014-06-04T00:00:00+04),
 string end - end date of an event (in correct format 2014-06-04T00:00:00+04),
 boolean allDay - is this an all day event,
 string description - the description of an event,
 string name - the name of an event,
 string place - place of an event,
 string recurrenceRule - recurrenceRule in correct format RRULE:FREQ=WEEKLY,
 string timeZone - time zone (used if all day event (Goodle requires) or addTimeZone flag is set)
 boolean addTimeZone - true if we want to add time zone to start and end dates
 array of string reminderTimeArrayMin - [5, 10, 60] remind before (in minutes), [] if don`t need reminders
 array of string reminderMethodArrayTypes - [popup, sms, email] remind method, [] if don`t need reminders
 */
function CreateEventParams(start, end, allDay, description, name, place, recurrenceRule, timeZone, addTimeZone, reminderTimeArrayMins, reminderMethodArrayTypes) {
    var params = '{';

    if (allDay) {
        params += '"start": {"date": "' + start + '", "timeZone": "' + timeZone + '"}, "end": {"date": "' + end +'", "timeZone": "' + timeZone + '"}';
    }
    else
    if (addTimeZone) {
        params += '"end": {"dateTime": "' + end +'", "timeZone": "' + timeZone + '"},"start": {"dateTime": "' + start + '", "timeZone": "' + timeZone + '"}';
    }
    else {
        params += '"end": {"dateTime": "' + end +'"},"start": {"dateTime": "' + start + '"}'
    }

    if (description) {
        params += ',"description": "'+ description +'"';
    }

    if (name) {
        params += ',"summary": "'+ name +'"';
    }

    if (place) {
        params += ',"location": "'+ place +'"';
    }

    if (recurrenceRule) {
        params += ',"recurrence": ["'+ recurrenceRule +'"]';
    }

    if (reminderTimeArrayMins.length > 0) {
        params += ',"reminders": { "useDefault": false, "overrides": [';

       for (var i = 0; i < reminderTimeArrayMins.length; i++) {
           params +=  '{"method": "'+ reminderMethodArrayTypes[i] + '", "minutes": ' + reminderTimeArrayMins[i] + '}'

           if (i < reminderTimeArrayMins.length - 1) {
               params += ','
           }
       }

       params += ']}';
    }

    params += '}';

    return params;
}

/* Ask for task lists*/
/*The result is put to taskLists
/*boolean blindMode - if true no authorization windows will be shown during request*/
function AskForTaskLists(blindMode) {

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onGotTaskLists(xhr);
        xhr.onerror = function(error)
        {
            LogMsg('AskForTaskLists: error: ' + error);
            updateView();
            throw new Error(error);
        };

        url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
        xhr.open('GET', url);
        oauthMine.setSignedRequest(xhr, null, blindMode);
    }
    catch (e)
    {
        LogMsg('AskForTaskLists: ex: ' + e);
        updateView();
        throw e;
    }
}

/* ask for calendar lists */
/*the result is put to calendar lists*/
/*boolean blindMode - if true no authorization windows will be shown during request*/
function AskForCalendars(blindMode) {
    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onGotCalendars(xhr);
        xhr.onerror = function(error)
        {
            LogMsg('AskForCalendars: error: ' + error);
            updateView();
            throw new Error(error);
        };

        url  = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
        xhr.open('GET', url);
        oauthMine.setSignedRequest(xhr, null, blindMode);
    }
    catch (e)
    {
        LogMsg('AskForCalendars: ex: ' + e);
        updateView();
        throw e;
    }
}

/* Ask for task lists with select Google account*/
/* the result is put to calendar lists*/
function AuthAndAskForTaskLists() {
    trackEvent('Extention button', 'clicked');
    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onGotTaskLists(xhr);
        xhr.onerror = function(error)
        {
            LogMsg('AuthAndAskForTaskLists: error: ' + error);
            updateView();
            throw new Error(error);
        };

        url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
        xhr.open('GET', url);
        oauthMine.setSignedRequestSpec(xhr, null);
    }
    catch (e)
    {
        LogMsg('AuthAndAskForTaskLists: ex: ' + e);
        updateView();
        throw e;
    }
}

/* Ask for user`s name*/
/* The result is put to userName*/
/*boolean blindMode - if true no authorization windows will be shown during request*/
function AskForName(blindMode) {
    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onGotName(xhr);
        xhr.onerror = function(error)
        {
            LogMsg('AskForName: error: ' + error);
            updateView();
            throw new Error(error);
        };

        url  = 'https://www.googleapis.com/oauth2/v1/userinfo';

        xhr.open('GET', url);
        oauthMine.setSignedRequest(xhr, null, blindMode);
    }
    catch (e)
    {
        LogMsg('AskForName: ex: ' + e);
        updateView();
        throw e;
    }
}

/* Logs msg*/
function LogMsg(message) {
    console.log(GetDateTimeStr() + ' ' + message);
}

/* Background page initialization*/
function init () {
    updateView();
    oauthMine.init();
    window.setInterval(updateView, 1000);
    chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
    chrome.browserAction.onClicked.addListener(/*AskForTasks*/ AuthAndAskForTaskLists);
    oauthMine.authorize(false, true, false);

    _gaq = _gaq || [];
    _gaq.push(['_setAccount', c_analytics_code]);


    (function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    })();
}

window.addEventListener('load', init, false);

// all are sent to Google Analytics
window.onerror = function(message, file, line) {
    try {
        _gaq.push(['_trackEvent', "Global", "Exception", file + "(" + line + "): " + message])
    }
    catch (e) {
        LogMsg('gaq push exception error' + e)
    }

}

// send event to Google Analytics
// string name - event name
// string params - event params
function trackEvent(name, params) {
    try {
        _gaq.push(['_trackEvent', name, params]);
    }
    catch (e) {
        LogMsg('gaq push event error '+  e);
    }
}



