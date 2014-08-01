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

/*Popup window states*/
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

/*Popup window tab*/
function WindowTabs() {
    this.TAB_AUTH = 0; // authorization tab
    this.TAB_TASK = 1; // add task tab
    this.TAB_EVENT = 2; // add event tab
}

/* Dictionaries*/
function Spr() {
    this.reminderTimesList = new ReminderTimeList(); // the reminder times dictionary
    this.reminderMethodsList = new ReminderMethodList(); // the reminder methods dictionary
    this.repetitionPeriodList = new RepetitionPeriodList(); // the repetition periods dictionary
    this.userMessages = new Messages(); // user messages
}

/* The model*/
function PopupData() {
    this.windowStates = new PopupStates(); // keeps current popup window state
    this.taskLists = []; // keeps task lists
    this.calendarLists = []; // keeps calendar lists
    this.windowTabs = new WindowTabs(); // keeps window tabs indexes
    this.previousDateFrom = null; // keeps the last value of dateFrom (dateTo should change when dateFrom changes)
    this.previousTimeFrom = null; // keeps the last value of timeFrom (dateFrom should change when timeFrom changes)
    this.addingTaskInProcess = false; // if true, we are inside add Task function
    this.addingEventInProcess = false; // if true, we are inside add Event function

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

    /*Get default reminders for a calendar (Google Calndr API)*/
    /*string calendarName - the calendar name,
    * array of int reminderTimeArray - empty array to push reminder times in minutes,
    * array of string reminderTimeMethod - empty array to push reminder methods*/
    /*returns nothing, the result is in reminderTimeArray, reminderTimeMethod*/
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

/*Class to keep time*/
/* object Date src - the initial time */
function MyTime(src) {
    var parent = this;
    var staticDate = "7/Nov/2012 "; // the static date of every time we keep
    var tmp = src == null ? new Date() : src ;
    parent.date = new Date(staticDate + tmp.toTimeString().substr(0, 5)); // current time if src is undefined,
    // time from scr if src is defined

    // returns time as a string we can put in html input time value
    parent.toInputValue = function() {
        return parent.date.toTimeString().substr(0, 5);
    }

    // sets current time from html input time value
    // returns nothing
    parent.setFromInputValue = function(inputValue) {
        try {
            parent.date = new Date(staticDate + inputValue);
        }
        catch (e) {
            console.log(e.message);
        }
    }

    // adds some time to the current time
    // int hours - hours to add,
    // int minutes - minutes to add,
    // int seconds - seconds to add
    parent.addTime = function(hours, minutes, seconds) {
        hours = hours || 0;
        minutes = minutes || 0;
        seconds = seconds || 0;
        parent.date.setHours(parent.date.getHours() + hours);
        parent.date.setMinutes(parent.date.getMinutes() + minutes);
        parent.date.setSeconds(parent.date.getSeconds() + seconds);
    }

    // returns (int) the difference in minutes between current time and html input time value
    // string inputValue - the input value to sub from current time
    parent.subTime = function(inputValue) {
        var date2 = new Date(staticDate + inputValue);
        return (parent.date.getHours() - date2.getHours())*60 + (parent.date.getMinutes() - date2.getMinutes());
    }

    // returns the time part of DateToJSON including T example: T09:00:00Z
    parent.toJSON = function() {
        var s = parent.date.toJSON().replace('.000', '');
        return s.substr(s.indexOf('T'));
    }

    // returns the time part including 'T' with timeZone example T09:00:00+04
    parent.toTimeWithTimeZone = function() {
        return 'T' + FormatTime(parent.date) + GetTimeZoneOffsetStr();
    }

    /*Sets time to the begining of the next hour*/
    /*returns nothing*/
    parent.setStartNextHour = function() {
        var tmp = parent.date;
        tmp.setMinutes(0);
        tmp.setSeconds(0);
        tmp.setHours(tmp.getHours() + 1);
        parent.date = new Date(staticDate + tmp.toTimeString().substr(0, 5));
    }

    /*returns time zone offset as a string*/
    var GetTimeZoneOffsetStr = function() {
        var d = new Date();
        var offset = d.getTimezoneOffset();
        var durationInMinutes = ('0' + Math.abs(offset/60)).slice(-2) + ":" + ('0' + Math.abs(offset%60)).slice(-2);
        var sign = offset > 0?"-":"+";
        return sign + durationInMinutes;
    }

    /*formating time to string example '01:00:02'*/
    /* object Date time - the time to format*/
    var FormatTime = function(time) {
        return ('0' + time.getHours()).slice(-2) + ":" + ('0' + time.getMinutes()).slice(-2) + ":" + ('0' + time.getSeconds()).slice(-2);
    }

    return parent;
}

/*Class to keep date*/
/* object Date src - the initial date */
function MyDate(src) {
    var parent = this;
    var staticTime = " 00:00"; // the static time of every date we keep
    var tmp = src == null ? new Date() : src;
    parent.date = new Date(tmp.toDateString() + staticTime);  // current date if src is undefined,
    // date from scr if src is defined

    // returns date as a string we can put in html input date value
    parent.toInputValue = function() {
        var s = FormatDate(parent.date);

        return s;
    }

    // sets current date from html input date value
    // returns nothing
    parent.setFromInputValue = function(inputValue) {
        parent.date = new Date(inputValue + staticTime);
    }

    // returns current dte in JSON format 2014-07-12T00:00:00Z
    parent.toJSON = function() {
        return FormatDate(parent.date) + "T00:00:00Z";
    }

    // returns the difference in days between currentDate and a html date input value
    // string inputValue - the input value to sub from current date
    parent.subDate = function(inputValue) {
        var tmp = new Date(inputValue + staticTime);
        return (parent.date - tmp)/(1000*60*60*24);
    }

    // adds some date to the current date
    // int years - years to add
    // int months - months to add
    // int days - days to add
    parent.addDate = function(years, months, days) {
        years = years || 0;
        months = months || 0;
        days = days || 0;
        parent.date.setFullYear(parent.date.getFullYear() + years);
        parent.date.setMonth(parent.date.getMonth() + months);
        parent.date.setDate(parent.date.getDate() + days);
    }

    // sets the date to date that will be an hour later
    // current Date will be today or tomorrow
    // returns nothing
    parent.setStartNextHour = function() {
        var tmp = new Date();
        tmp.setMinutes(0);
        tmp.setSeconds(0);
        tmp.setHours(tmp.getHours() + 1);
        parent.date = new Date(tmp.toDateString() + staticTime);
    }

    /*formating date to string example '2014-07-20'*/
    /* object Date date - the date to format*/
    var FormatDate = function(date) {
        return ('000' + date.getFullYear()).slice(-4) + "-" + ('0' + (1+date.getMonth())).slice(-2) + "-" + ('0' + date.getDate()).slice(-2);
    }

    return parent;
}



