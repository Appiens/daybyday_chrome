/**
 * Created by AstafyevaLA on 09.07.2014.
 */

/* Messages for a user*/
function Messages() {
    this.MSG_LOADING = chrome.i18n.getMessage('loading_message'); // loading message
    this.MSG_ERROR = chrome.i18n.getMessage('error_message'); // // error message
    this.MSG_SUCCESS = chrome.i18n.getMessage('success_message'); // success message (after adding task or event)
    this.MSG_UNAUTHORIZED = chrome.i18n.getMessage('unauthorized_message'); // no authorization message
}

function PopupStates() {
    this.ST_START = 0; // popup was just opened
    this.ST_CONNECTED = 1; // having token already
    this.ST_CONNECTING = 2; // authorizing or revoking is in process
    this.ST_DISCONNECTED = 3; // no connection
    this.ST_ERROR = 4; // some error occured
    this.ST_SUCCESS = 5; // the action was completed successfully

    var state = this.ST_START;

    this.SetCurrentState = function(st) {
        if (st < this.ST_START || st > this.ST_SUCCESS) {
            throw new Error("Wrong popup state " + st + "!");
        }

        state = st;
    }

    this.GetCurrentState = function() {
        return state;
    }
}

function WindowTabs() {
    this.TAB_AUTH = 0;
    this.TAB_TASK = 1;
    this.TAB_EVENT = 2;
}

function Spr() {
    this.reminderTimesList = new ReminderTimeList();
    this.reminderMethodsList = new ReminderMethodList();
    this.repetitionPeriodList = new RepetitionPeriodList();
    this.userMessages = new Messages();
}

function PopupData() {
    this.windowStates = new PopupStates();
    this.taskLists = [];
    this.calendarLists = [];
    this.windowTabs = new WindowTabs();
    this.previousDateFrom = null;
    this.previousTimeFrom = null;
    this.addingTaskInProcess = false;
    this.addingEventInProcess = false;

    /* Gets calendar time zone by calendar name */
    /* string calendarName - calendar summary (name)*/
    /* returns int calendar id, -1 if not found*/
    this.getTimeZoneByName = function(calendarName) {
        for (var i = 0, cal; cal = this.calendarLists[i]; i++)
        {
            if (cal.summary == calendarName) {
                return cal.timeZone;
            }
        }

        return -1;
    }

    /*
     Returns index in taskLists array by task list id
     string id - task list id
     */
    this.SearchTaskListIndexById = function(id) {
        for (var i = 0, cal; cal = this.taskLists[i]; i++)
        {
            if ( id  == cal.id) {
                return i;
            }
        }

        return -1;
    }

    /*
     Returns index in calendarLists array by calendar id
     string id - calendar id
     */
    this.SearchCalendarIndexById = function(id) {
        for (var i = 0, cal; cal = this.calendarLists[i]; i++)
        {
            if ( id  == cal.id) {
                return i;
            }
        }

        return -1;
    }

    /* Gets task list id by task list name */
    /* string listName - task list title (name)*/
    /* int returns task list id, -1 if not found*/
    this.getTaskIdByName = function(taskListName) {
        for (var i = 0, cal; cal = this.taskLists[i]; i++)
        {
            if (cal.title == taskListName) {
                return cal.id;
            }
        }

        return -1;
    }

    /* Gets calendar id by calendar name */
    /* string calendarName - calendar summary (name)*/
    /* int returns calendar id, -1 if not found*/
    this.getCalendarIdByName = function(calendarName) {
        for (var i = 0, cal; cal = this.calendarLists[i]; i++)
        {
            if (cal.summary == calendarName) {
                return cal.id;
            }
        }

        return -1;
    }
}

function Loader(oauth) {
    this.currentState = new PopupStates();
    this.taskLists = [];
    this.calendarLists = [];
    this.userName = null;
    this.oauthMine = oauth;
    this.isLoadingTasks = false;
    this.isLoadingName = false;
    this.isLoadingCalendars = false;

    var parent = this;

    this.Load = function(withAuth) {
        if (withAuth) {
            authAndGetTasks();
        }
        else {
             getTasks();
        }

        getName();
        getCalendars();
    }

    this.Clear = function() {
        this.taskLists = [];
        this.calendarLists = [];
        this.userName = null;
    }

    this.isLoading = function() {
        return this.isLoadingCalendars || this.isLoadingName || this.isLoadingTasks;
    }

    this.isLoadedOk = function() {
        return !this.isLoading() && this.taskLists.length > 0 && this.calendarLists.length > 0 && this.userName != null;
    }

    /* asking for tasks lists of an authorized user */
    var getTasks = function() {
        if (this.oauthMine.allowRequest()) {
            LogMsg('Loader: getTasks');
            askForTaskLists(true);
        }
        else {
            setTimeout(getTasks, 1000);
        }
    }

    /* asking for task lists with authorization (can select account) */
    var authAndGetTasks = function() {
        if ( true == true) {
            LogMsg('Loader: authAndGetTasks');
            authAndAskForTaskLists();
        }
        else {
            setTimeout(authAndGetTasks, 1000);
        }
    }

    /* asking for users name of an authorized user*/
    function getName() {
        if (this.oauthMine.allowRequest()) {
            LogMsg('Loader: getName');
            askForName(true);
        }
        else {
            setTimeout(getName, 1000);
        }
    }

    /*asking for calendars of an authorized user*/
    function getCalendars() {
        if (this.oauthMine.allowRequest()) {
            LogMsg('Loader: getCalendars');
            askForCalendars(true);
        }
        else {
            setTimeout(getCalendars, 1000);
        }
    }

    var askForTaskLists = function(blindMode) {

        var xhr = new XMLHttpRequest();
        try
        {
            this.isLoadingTasks = true;
            this.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function(error)
            {
                parent.isLoadingTasks = false;
                LogMsg('Loader AskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            this.oauthMine.setSignedRequest(xhr, null, blindMode);
        }
        catch (e)
        {
            this.isLoadingTasks = false;
            LogMsg('Loader AskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    var askForCalendars = function(blindMode) {
        var xhr = new XMLHttpRequest();
        try
        {
            this.isLoadingCalendars = true;
            this.calendarLists = [];
            xhr.onreadystatechange = onGotCalendars(xhr);
            xhr.onerror = function(error)
            {
                parent.isLoadingCalendars = false;
                LogMsg('Loader AskForCalendars: error: ' + error);
                throw new Error(error);
            };

            url  = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(accessRole%2CbackgroundColor%2CdefaultReminders%2Cdescription%2Cid%2Clocation%2Csummary%2CtimeZone)';
            xhr.open('GET', url);
            this.oauthMine.setSignedRequest(xhr, null, blindMode);
        }
        catch (e)
        {
            this.isLoadingCalendars = false;
            LogMsg('Loader AskForCalendars: ex: ' + e);
            throw e;
        }
    }

    /* Ask for task lists with select Google account*/
    /* the result is put to calendar lists*/
    var authAndAskForTaskLists = function() {
        trackEvent('Extention button', 'clicked');
        var xhr = new XMLHttpRequest();
        try
        {
            this.isLoadingTasks = true;
            this.taskLists = [];
            xhr.onreadystatechange = onGotTaskLists(xhr);
            xhr.onerror = function(error)
            {
                parent.isLoadingTasks = false;
                LogMsg('Loader AuthAndAskForTaskLists: error: ' + error);
                throw new Error(error);
            };

            url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
            xhr.open('GET', url);
            this.oauthMine.setSignedRequestSpec(xhr, null);
        }
        catch (e)
        {
            this.isLoadingTasks = false;
            LogMsg('Loader AuthAndAskForTaskLists: ex: ' + e);
            throw e;
        }
    }

    /* Ask for user`s name*/
    /* The result is put to userName*/
    /*boolean blindMode - if true no authorization windows will be shown during request*/
    var askForName = function(blindMode) {
        var xhr = new XMLHttpRequest();
        try
        {
            this.isLoadingName = true;
            this.userName = null;
            xhr.onreadystatechange = onGotName(xhr);
            xhr.onerror = function(error)
            {
                LogMsg('Loader AskForName: error: ' + error);
                parent.isLoadingName = false;
                throw new Error(error);
            };

            url  = 'https://www.googleapis.com/oauth2/v1/userinfo';

            xhr.open('GET', url);
            this.oauthMine.setSignedRequest(xhr, null, blindMode);
        }
        catch (e)
        {
            this.isLoadingName = false;
            LogMsg('Loader AskForName: ex: ' + e);
            throw e;
        }
    }

    /* Callback function for AskForTaskLists*/
    /* xhr - request*/
    var onGotTaskLists = function(xhr) {
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
                parent.taskLists= obj.items;
            }
            catch (e) {
                LogMsg('Loader onGotTaskLists ex: ' + e);
                parent.taskLists = [];
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                //chrome.runtime.sendMessage({greeting: "taskListReady", isOk: isOk});
                parent.isLoadingTasks = false;
            }
        }
    }
    /* Callback function for AskForCalendars*/
    /* xhr - request*/
    var onGotCalendars = function(xhr) {
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
                parent.calendarLists= obj.items;
            }
            catch (e) {
                LogMsg('Loader onGotCalendars ex: ' + e);
                this.calendarLists = [];
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                // chrome.runtime.sendMessage({greeting: "calendarListReady", isOk: isOk});
                parent.isLoadingCalendars = false;
            }
        }
    }

    /* Callback function for AskForName*/
    /* xhr - request*/
    var onGotName = function(xhr) {
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
                parent.userName = obj.name;
            }
            catch (e) {
                LogMsg('Loader onGotName ex: ' + e);
                this.userName = null;
                isOk = false;
                throw e;
            }
            finally {
                // sending a message to popup window
                //chrome.runtime.sendMessage({greeting: "userNameReady", isOk: isOk});
                parent.isLoadingName = false;
            }
        }
    }
}