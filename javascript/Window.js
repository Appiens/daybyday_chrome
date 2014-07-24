/**
 * Created by AstafyevaLA on 09.07.2014.
 */

/* Messages for a user*/
function Messages() {
    this.MSG_LOADING = chrome.i18n.getMessage('loading_message'); // loading message
    this.MSG_ERROR = chrome.i18n.getMessage('error_message'); // // error message
    this.MSG_SUCCESS = chrome.i18n.getMessage('success_message'); // success message (after adding task or event)
    this.MSG_UNAUTHORIZED = chrome.i18n.getMessage('unauthorized_message'); // no authorization message
    this.MSG_ASKFORMARK = chrome.i18n.getMessage('askformark_message'); // ask for mark message
    this.MSG_MARKOK = chrome.i18n.getMessage('markok_action_title'); // ask for mark message
    this.MSG_MARKCANCEL = chrome.i18n.getMessage('markcancel_action_title'); // ask for mark message
}

function PopupStates() {
    this.ST_START = 0; // popup was just opened
    this.ST_CONNECTED = 1; // having token already
    this.ST_CONNECTING = 2; // authorizing or revoking is in process
    this.ST_DISCONNECTED = 3; // no connection
    this.ST_ERROR = 4; // some error occured
    this.ST_SUCCESS = 5; // the action was completed successfully
    this.ST_ASKFORMARK = 6;

    var state = this.ST_START;

    this.SetCurrentState = function(st) {
        if (st < this.ST_START || st > this.ST_ASKFORMARK) {
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

    this.getDefaultRemindersByName = function(calendarName, reminderTimeArray, reminderTimeMethod) {
        var j;
        for (j = 0; j < this.calendarLists.length; j++) {
            if (popupData.calendarLists[j].summary == calendarName) {
                break;
            }
        }

        if (j < this.calendarLists.length && this.calendarLists[j].defaultReminders) {
            for (var k = 0; k < this.calendarLists[j].defaultReminders.length; k++) {
                reminderTimeArray.push(this.calendarLists[j].defaultReminders[k].minutes);
                reminderTimeMethod.push(this.calendarLists[j].defaultReminders[k].method);
            }
        }

    }
}

// src parent.date
function MyTime(src) {
    var parent = this;
    var staticDate = "7/Nov/2012 ";
    var tmp = src == null ? new Date() : src ;
    parent.date = new Date(staticDate + tmp.toTimeString().substr(0, 5));

    parent.toInputValue = function() {
        return parent.date.toTimeString().substr(0, 5);
    }

    parent.setFromInputValue = function(inputValue) {
        try {
            parent.date = new Date(staticDate + inputValue);
        }
        catch (e) {
            console.log(e.message);
        }
    }

    parent.addTime = function(hours, minutes, seconds) {
        hours = hours || 0;
        minutes = minutes || 0;
        seconds = seconds || 0;
        parent.date.setHours(parent.date.getHours() + hours);
        parent.date.setMinutes(parent.date.getMinutes() + minutes);
        parent.date.setSeconds(parent.date.getSeconds() + seconds);
    }

    parent.subTime = function(inputValue) {
        var date2 = new Date(staticDate + inputValue);
        return (parent.date.getHours() - date2.getHours())*60 + (parent.date.getMinutes() - date2.getMinutes());
    }

    parent.toJSON = function() {
        var s = parent.date.toJSON().replace('.000', '');
        return s.substr(s.indexOf('T'));
    }

    parent.toTimeWithTimeZone = function() {
        return 'T' + FormatTime(parent.date) + GetTimeZoneOffsetStr();
    }

    parent.setStartNextHour = function() {
        var tmp = parent.date;
        tmp.setMinutes(0);
        tmp.setSeconds(0);
        tmp.setHours(tmp.getHours() + 1);
        parent.date = new Date(staticDate + tmp.toTimeString().substr(0, 5));
    }

    var GetTimeZoneOffsetStr = function() {
        var d = new Date();
        var offset = d.getTimezoneOffset();
        //var durationInMinutes = AddZero(parseInt(Math.abs(offset/60))) + ":" + AddZero(Math.abs(offset%60), 2);
        var durationInMinutes = ('0' + Math.abs(offset/60)).slice(-2) + ":" + ('0' + Math.abs(offset%60)).slice(-2);
        var sign = offset > 0?"-":"+";
        return sign + durationInMinutes;
    }

    var FormatTime = function(time) {
        return ('0' + time.getHours()).slice(-2) + ":" + ('0' + time.getMinutes()).slice(-2) + ":" + ('0' + time.getSeconds()).slice(-2);
    }

    return parent;
}

function MyDate(src) {
    var parent = this;
    var staticTime = " 00:00";
    var tmp = src == null ? new Date() : src;
    parent.date = new Date(tmp.toDateString() + staticTime);

    parent.toInputValue = function() {
        var s = FormatDate(parent.date);

        return s;
    }

    parent.setFromInputValue = function(inputValue) {
        parent.date = new Date(inputValue + staticTime);
    }

    parent.toJSON = function() {
        return FormatDate(parent.date) + "T00:00:00Z";
    }

    parent.subDate = function(inputValue) {
        var tmp = new Date(inputValue + staticTime);
        return (parent.date - tmp)/(1000*60*60*24);
    }

    parent.addDate = function(years, months, days) {
        years = years || 0;
        months = months || 0;
        days = days || 0;
        parent.date.setFullYear(parent.date.getFullYear() + years);
        parent.date.setMonth(parent.date.getMonth() + months);
        parent.date.setDate(parent.date.getDate() + days);
    }

    parent.setStartNextHour = function() {
        var tmp = new Date();
        tmp.setMinutes(0);
        tmp.setSeconds(0);
        tmp.setHours(tmp.getHours() + 1);
        parent.date = new Date(tmp.toDateString() + staticTime);
    }

    var FormatDate = function(date) {
        return ('000' + date.getFullYear()).slice(-4) + "-" + ('0' + (1+date.getMonth())).slice(-2) + "-" + ('0' + date.getDate()).slice(-2);
    }

    return parent;
}



