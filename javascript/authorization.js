/**
 * Created by astafyevala on 21.07.2014.
 */

function RequestProcessor() {
    var self = this;
    self.requestQueue = [];
    self.requestQueueIsProcessing = false;
    self.sheduledProcessRequired = false;
    self.token = null;
    self.tokenExpiresIn = 0;
    self.tokenGetTime = 0;
    self.isRevoked = false;
    var currTokenOk = false;

    self.Add = function(request, body, blindMode) {
        self.requestQueue.push({"request": request, "body": body, "blindMode": blindMode});
    }

    self.AddAndDo = function(request, body, blindMode) {
        self.Add(request, body, blindMode);
        self.ProcessAll();
    }

    self.ProcessAll = function() {
        while (self.requestQueue.length > 0) {
            var requestToProcess = self.requestQueue.shift();
            self.Process(requestToProcess);
        }
    }

    self.Process = function(requestToProcess) {
        chrome.identity.getAuthToken({'interactive': !requestToProcess.blindMode},
            function (access_token) {
                try {
                    if (chrome.runtime.lastError) {
                        self.token = null;
                        self.tokenExpiresIn = 0;
                        self.tokenGetTime = 0;
                        LogMsg(chrome.runtime.lastError);
                        throw new Error(chrome.runtime.lastError);
                    }

                    self.token = access_token;
                    self.tokenExpiresIn = 3600;
                    self.tokenGetTime = getCurrentTime();
                    self.isRevoked = false;

                }
                finally {
                    if (requestToProcess.request != null) {
                        requestToProcess.request.setRequestHeader('Authorization', 'Bearer ' + self.token );
                        requestToProcess.request.send(requestToProcess.body);
                    }

                }

            });
    }

    self.SignInChanged = function( account, signedIn) {
        LogMsg("Sign in changed " + account + ' ' + signedIn);
        if (signedIn) {
            self.Authorize();
        }
        else {
            self.ClearToken();
        }
    }

    self.Authorize = function() {
        var requestToProcess = {"request": null, "body": null, "blindMode": true};
        self.Process(requestToProcess);
    }

    /*
     make token bad
     callback - the callback function
     */
    self.ClearToken = function(callback){
        if (self.token == null) {
            LogMsg('ClearToken: token is bad or exprired');
            return;
        }

        chrome.identity.removeCachedAuthToken({ token:  self.token},
            function() {
                if (chrome.runtime.lastError) {
                    LogMsg("revokeError " + chrome.runtime.lastError.message);
                    return;
                }

                self.token = null;
                self.tokenExpiresIn = 0;
                self.tokenGetTime = 0;

                LogMsg("revoke ok");
            });
    }

    self.Revoke = function(callback) {
        if (self.token == null)  {
            LogMsg('Revoke: token is bad or exprired');
            return;
        }

        var tokenSv = self.token;
        self.ClearToken();

        var xhr = new XMLHttpRequest();

        try {
            xhr.onreadystatechange = OnRevokeStatusChanged(xhr, callback);
            xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                tokenSv);
            xhr.send();
        }
        catch (e) {
            LogMsg('ex: ' + e);
            throw e;
        }
    }

    var OnRevokeStatusChanged = function(xhr, callback) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            LogMsg('Revoke ' + xhr.readyState + ' ' + xhr.status + ' ' + xhr.response);
            self.isRevoked = xhr.status == ST_REQUEST_OK;
            callback();
        }
    }

    self.Init = function() {
        chrome.identity.onSignInChanged.addListener(self.SignInChanged);
        window.setInterval(ConnectionAnalyzer, 1000);
    }

    var ConnectionAnalyzer = function() {
        var isTokenOk = self.token != null;

        if (currTokenOk != isTokenOk) {
            chrome.runtime.sendMessage({greeting: "token", state: isTokenOk});
        }

        currTokenOk = isTokenOk;
    }
}

function Loader2() {
    var parent = this;
    parent.taskLists = [];
    parent.calendarLists = [];
    parent.userName = null;
    parent.requestProcessor = new RequestProcessor();
    parent.isLoadingTasks = false;
    parent.isLoadingName = false;
    parent.isLoadingCalendars = false;

    parent.TokenNotNull = function() {
        return parent.requestProcessor.token != null;
    }

    parent.IsRevoked = function() {
        return parent.requestProcessor.isRevoked;
    }

    parent.Load = function (withAuth) {
        if (withAuth) {
            parent.authAndAskForTaskLists();
        }
        else {
            parent.askForTaskLists(true);
        }

        parent.askForName(true);
        parent.askForCalendars(true);
        parent.requestProcessor.ProcessAll();
    }

    parent.Clear = function () {
        parent.taskLists = [];
        parent.calendarLists = [];
        parent.userName = null;
    }

    parent.isLoading = function () {
        return parent.isLoadingCalendars || parent.isLoadingName || parent.isLoadingTasks;
    }

    parent.isLoadedOk = function () {
        return !parent.isLoading() && parent.taskLists.length > 0 && parent.calendarLists.length > 0 && parent.userName != null;
    }

    parent.askForTaskLists = function (blindMode) {

        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingTasks = true;
            parent.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingTasks = false;
                LogMsg('Loader2 AskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingTasks = false;
            LogMsg('Loader2 AskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    parent.askForCalendars = function (blindMode) {
        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingCalendars = true;
            parent.calendarLists = [];
            xhr.onreadystatechange = onGotCalendars(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingCalendars = false;
                LogMsg('Loader2 AskForCalendars: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(accessRole%2CbackgroundColor%2CdefaultReminders%2Cdescription%2Cid%2Clocation%2Csummary%2CtimeZone)';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingCalendars = false;
            LogMsg('Loader2 AskForCalendars: ex: ' + e);
            throw e;
        }
    }

    /* Ask for task lists with select Google account*/
    /* the result is put to calendar lists*/
    parent.authAndAskForTaskLists = function () {
        trackEvent('Extention button', 'clicked');
        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingTasks = true;
            parent.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingTasks = false;
                LogMsg('Loader2 AuthAndAskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, false);
        }
        catch (e) {
            parent.isLoadingTasks = false;
            LogMsg('Loader2 AuthAndAskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    /* Ask for user`s name*/
    /* The result is put to userName*/
    /*boolean blindMode - if true no authorization windows will be shown during request*/
    parent.askForName = function (blindMode) {
        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingName = true;
            parent.userName = null;
            xhr.onreadystatechange = onGotName(xhr);
            xhr.onerror = function (error) {
                LogMsg('Loader2 AskForName: error: ' + error);
                parent.isLoadingName = false;
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/oauth2/v1/userinfo';

            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingName = false;
            LogMsg('Loader2 AskForName: ex: ' + e);
            throw e;
        }
    }

    /* Callback function for AskForTaskLists*/
    /* xhr - request*/
    var onGotTaskLists = function (xhr) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            var isOk;
            var exception = null;

            LogMsg('Loader2 On Got TaskLists ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;
                var obj = JSON.parse(text);

                if (obj.items) {
                    parent.taskLists = obj.items;
                    LogMsg(JSON.stringify(obj.items));
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader2 onGotTaskLists ex: ' + e);
                parent.taskLists = [];
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                chrome.runtime.sendMessage({greeting: "taskListReady", isOk: isOk});
                parent.isLoadingTasks = false;
            }
        }
    }
    /* Callback function for AskForCalendars*/
    /* xhr - request*/
    var onGotCalendars = function (xhr) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            var isOk;
            LogMsg('Loader2 On Got Calendars ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;
                var obj = JSON.parse(text);

                if (obj.items) {
                    parent.calendarLists = obj.items;
                    LogMsg(JSON.stringify(obj.items));
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader2 onGotCalendars ex: ' + e);
                parent.calendarLists = [];
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                chrome.runtime.sendMessage({greeting: "calendarListReady", isOk: isOk});
                parent.isLoadingCalendars = false;
            }
        }
    }

    /* Callback function for AskForName*/
    /* xhr - request*/
    var onGotName = function (xhr) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            var isOk;
            LogMsg('Loader2 On Got Name ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;
                var obj = JSON.parse(text);

                if (obj.name) {
                    parent.userName = obj.name;
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader2 onGotName ex: ' + e);
                parent.userName = null;
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                chrome.runtime.sendMessage({greeting: "userNameReady", isOk: isOk});
                parent.isLoadingName = false;
            }
        }
    }

    /* Adds task to a task list */
    /* string name - name of a task,
     string listId - id of task list to add task,
     string date - date of task (as a value of input date),
     string notes - comment to task
     */
    parent.addTask = function(name, listId, date, notes) {
        var xhr = new XMLHttpRequest();
        try
        {
            xhr.onreadystatechange = onAddTask(xhr);
            xhr.onerror = function(error)
            {
                LogMsg('Loader AddTask: error: ' + error);
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
            parent.requestProcessor.AddAndDo(xhr, params, true);
        }
        catch (e)
        {
            LogMsg('Loader AddTask ex: ' + e);
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
    parent.addEvent = function(name, listId, timeZone, dateStart, dateEnd, timeStart, timeEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray, reminderMethodArray) {
        var xhr = new XMLHttpRequest();
        try
        {
            xhr.onreadystatechange = onAddEvent(xhr);
            xhr.onerror = function(error)
            {
                LogMsg('Loader AddEvent: error: ' + error);
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

            description = filterSpecialChar(description);
            name = filterSpecialChar(name);
            place = filterSpecialChar(place);
            var recurrenceRule = BuildRecurrenceRule(recurrenceTypeValue);
            var reminderTimeArrayMins = reminderTimeArray;
            var reminderMethodArrayTypes = reminderMethodArray;

            url  = 'https://www.googleapis.com/calendar/v3/calendars/' + listId + '/events';

            xhr.open('POST', url);
            xhr.setRequestHeader('Content-Type', 'application/json');
            var params = CreateEventParams(start, end, allDay, description, name, place, recurrenceRule, timeZone, recurrenceRule != null , reminderTimeArrayMins, reminderMethodArrayTypes);
            parent.requestProcessor.AddAndDo(xhr, params, true);
        }
        catch (e)
        {
            LogMsg('Loader AddEvent ex: ' + e);
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
    var CreateEventParams = function(start, end, allDay, description, name, place, recurrenceRule, timeZone, addTimeZone, reminderTimeArrayMins, reminderMethodArrayTypes) {
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
        else {
            params += ',"reminders": { "useDefault": false }';
        }

        params += '}';

        return params;
    }

    /* Callback function for AddTask */
    /*xhr - request*/
    var onAddTask = function(xhr)
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
                    chrome.runtime.sendMessage({greeting: "AddedError", error: error, type: "task"});
                    throw new Error(error);
                }
                catch (e) {
                    LogMsg('ex: ' + e);
                    throw e;
                }
            }
            else {
                chrome.runtime.sendMessage({greeting: "AddedOk", type: "task"});
            }
        };
    }

    /* Callback function for AddEvent */
    /* xhr - request*/
    var onAddEvent = function(xhr)
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
                    chrome.runtime.sendMessage({greeting: "AddedError", error: error, type: "event"});
                    throw new Error(error);
                }
                catch (e) {
                    LogMsg('ex: ' + e);
                    throw e;
                }
            }
            else {
                chrome.runtime.sendMessage({greeting: "AddedOk", type: "event"});
            }
        };
    }
}
