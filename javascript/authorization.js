
/*Does authorization and sends requests*/
function RequestProcessor() {
    var self = this;
    self.requestQueue = [];     // the request queue (as an array)
    self.token = null;          // current token
    self.tokenExpiresIn = 0;    // the timespan during which token is actual
    self.tokenGetTime = 0;      // the time we got token
    self.isRevoked = false;     // sets to true when user revokes rights from this app
    self.onChangeConnectionState = null;
    var currTokenOk = false;    // the current state of token (we are going to compare old and ne states)

    /*Adds request to request queue
    * string request - the request,
    * string body - the request`s body
    * blindMode - if true authorization window won`t be shown*/
    self.Add = function(request, body, blindMode) {
        self.requestQueue.push({"request": request, "body": body, "blindMode": blindMode});
    }

    /*Adds request to request queue and sends all requests in queue
     * string request - the request,
     * string body - the request`s body
     * blindMode - if true authorization window won`t be shown*/
    self.AddAndDo = function(request, body, blindMode) {
        self.Add(request, body, blindMode);
        self.ProcessAll();
    }

    /*Sends all requests in queue*/
    self.ProcessAll = function() {
        while (self.requestQueue.length > 0) {
            var requestToProcess = self.requestQueue.shift();
            self.Process(requestToProcess);
        }
    }

    /* Sends Request
    * object requestToProcess {"request": request, "body": body, "blindMode": blindMode}
    * if requestToProcess = null this function only gets auth token
    * */
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

    /* The event handler of onSignInChanged in Chrome
      string account - new account that logged in in Chrome
      bool signedIn - if true user logged in
     */
    self.SignInChanged = function( account, signedIn) {
        LogMsg("Sign in changed " + account + ' ' + signedIn);
        if (signedIn) {
            self.Authorize();
        }
        else {
            self.ClearToken();
        }
    }

    /*  Gets the token
     */
    self.Authorize = function() {
        var requestToProcess = {"request": null, "body": null, "blindMode": true};
        self.Process(requestToProcess);
    }

    /*
     clears token (sets it to null)
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

    /*
    revokes rights from the app (we are not able to get tokens after that)
    callback - the callback function
     */
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

    /*  Revoke status changed event handler
      xhr - the processed request
      callback - the callback function
     */
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

    /*
       Initializes object Must be called after creation
     */
    self.Init = function() {
        chrome.identity.onSignInChanged.addListener(self.SignInChanged);
        window.setInterval(ConnectionAnalyzer, 1000);
    }

    /*
         Is called every 1000 ms to analyze connection
         Sends a message to all {greeting: "token", state: isTokenOk} when connection state changes
     */
    var ConnectionAnalyzer = function() {
        var isTokenOk = self.token != null;

        if (currTokenOk != isTokenOk) {
            if (self.onChangeConnectionState != null)
            {
                self.onChangeConnectionState();
            }
        }

        currTokenOk = isTokenOk;
    }
}

/* Loades task lists and calendars
* Adds events and tasks
* All requests to Google Calendar API, Google Task API are here*/
function Loader() {
    var parent = this;
    parent.taskLists = []; // the tasks lists array (loaded with askForTaskLists)
    parent.calendarLists = []; // the calendar lists array (loaded with askForCalendars)
    parent.userName = null; // the user name (loaded with askForName)
    parent.requestProcessor = new RequestProcessor(); // the request processor
    parent.isLoadingTasks = false; // is true tasksLists loading is in process (don`t use taskLists)
    parent.isLoadingName = false; // is true name loading is in process (don`t use userName)
    parent.isLoadingCalendars = false; // is true calendarLists loading is in process (don`t use calendarLists)

    parent.requestProcessor.Init();

    /* returns true if connection is ok, false otherwise*/
    parent.TokenNotNull = function() {
        return parent.requestProcessor.token != null;
    }

    /*returns true if rights has been revoked from app (from options page)*/
    parent.IsRevoked = function() {
        return parent.requestProcessor.isRevoked;
    }

    /*Loads taskLists, calendars and user Name*/
    /*bool withAuth - if true we should show authorization windows*/
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

    /*Clears taskLists, calendarLists and userName*/
    parent.Clear = function () {
        parent.taskLists = [];
        parent.calendarLists = [];
        parent.userName = null;
    }

    /*returns true if loading is in process (use it after calling Load function to wait when load ends)*/
    parent.isLoading = function () {
        return parent.isLoadingCalendars || parent.isLoadingName || parent.isLoadingTasks;
    }

    /*returns true if all entities - taskLists, calendarLists and userName has been successfully loaded*/
    parent.isLoadedOk = function () {
        return !parent.isLoading() && parent.taskLists.length > 0 && parent.calendarLists.length > 0 && parent.userName != null;
    }

    /*creates ask for task lists request and Adds it to requestProcessor`s request queue
    * bool blindMode - if true we shouldn`t show authorization windows while processing request*/
    parent.askForTaskLists = function (blindMode) {

        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingTasks = true;
            parent.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingTasks = false;
                LogMsg('Loader AskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingTasks = false;
            LogMsg('Loader AskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    /*creates ask for calendars request and Adds it to requestProcessor`s request queue
    *bool blindMode - if true we shouldn`t show authorization windows while processing request*/
    parent.askForCalendars = function (blindMode) {
        var xhr = new XMLHttpRequest();
        try {
            parent.isLoadingCalendars = true;
            parent.calendarLists = [];
            xhr.onreadystatechange = onGotCalendars(xhr);
            xhr.onerror = function (error) {
                parent.isLoadingCalendars = false;
                LogMsg('Loader AskForCalendars: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(accessRole%2CbackgroundColor%2CdefaultReminders%2Cdescription%2Cid%2Clocation%2Csummary%2CtimeZone)';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingCalendars = false;
            LogMsg('Loader AskForCalendars: ex: ' + e);
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
                LogMsg('Loader AuthAndAskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, false);
        }
        catch (e) {
            parent.isLoadingTasks = false;
            LogMsg('Loader AuthAndAskForTaskLists: ex: ' + e);
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
                LogMsg('Loader AskForName: error: ' + error);
                parent.isLoadingName = false;
                throw new Error(error);
            };

            url = 'https://www.googleapis.com/oauth2/v1/userinfo';

            xhr.open('GET', url);
            parent.requestProcessor.Add(xhr, null, blindMode);
        }
        catch (e) {
            parent.isLoadingName = false;
            LogMsg('Loader AskForName: ex: ' + e);
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

            LogMsg('Loader On Got TaskLists ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;
                var obj = JSON.parse(text);

                if (obj.items) {
                    parent.taskLists = obj.items;
                  //  LogMsg(JSON.stringify(obj.items));
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader onGotTaskLists ex: ' + e);
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
            LogMsg('Loader On Got Calendars ' + xhr.readyState + ' ' + xhr.status);

            try {
                var text = xhr.response;
                isOk = xhr.status == ST_REQUEST_OK;
                var obj = JSON.parse(text);

                if (obj.items) {
                    parent.calendarLists = obj.items;
                 //   LogMsg(JSON.stringify(obj.items));
                }
                else {
                    isOk = false;
                }
            }
            catch (e) {
                LogMsg('Loader onGotCalendars ex: ' + e);
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
            LogMsg('Loader On Got Name ' + xhr.readyState + ' ' + xhr.status);

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
                LogMsg('Loader onGotName ex: ' + e);
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
    /*  object task {name: name, listId: listId, date: date, notes: notes} */
    /* string name - name of a task,
     string listId - id of task list to add task,
     string date - date of task (as a value of input date),
     string notes - comment to task
     */
    parent.addTask = function(task) {
        var name = task.name || "";
        var listId = task.listId || null;
        var date = task.date || null;
        var notes = task.notes || "";

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
                 date = date.toJSON();
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
    /*object myEvent*/
    /* {"name": name, "listId": listId, "timeZone": timeZone, "dateStart": dateStart, "dateEnd": dateEnd,
        "timeStart": timeStart, "timeEnd": timeEnd, "description": description, "allDay": allDay,
        "place": place, "recurrenceTypeValue": recurrenceTypeValue, "reminderTimeArray": reminderTimeArray,
        "reminderMethodArray": reminderMethodArray}*/
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
    parent.addEvent = function(myEvent) {
        var name = myEvent.name || "";
        var listId = myEvent.listId || null;
        var timeZone  = myEvent.timeZone || null;
        var dateStart = myEvent.dateStart || null;
        var dateEnd = myEvent.dateEnd || null;
        var timeStart =  myEvent.timeStart || null;
        var timeEnd = myEvent.timeEnd || null;
        var description = myEvent.description || "";
        var allDay =  myEvent.allDay || false;
        var place = myEvent.place || "";
        var recurrenceTypeValue = myEvent.recurrenceTypeValue || null;
        var reminderTimeArray = myEvent.reminderTimeArray || [];
        var reminderMethodArray = myEvent.reminderMethodArray || [];

        var xhr = new XMLHttpRequest();
        try
        {
            xhr.onreadystatechange = onAddEvent(xhr);
            xhr.onerror = function(error)
            {
                LogMsg('Loader AddEvent: error: ' + error);
                throw new Error(error);
            };

            var start = allDay? dateStart.toInputValue() : dateStart.toInputValue() + timeStart.toTimeWithTimeZone();
            if (allDay) {
                dateEnd.addDate(0, 0, 1);
            }
            var end = allDay? dateEnd.toInputValue(): dateEnd.toInputValue() + timeEnd.toTimeWithTimeZone();

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

    return parent;
}
