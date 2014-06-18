/**
 * Created by AstafyevaLA on 29.04.2014.
 */

// rem div prefix
var remDivName = "div-event-remind-";

// repetititon periods array
var repetitionPeriods =
    [ "repetition_interval_everyday$DIALY",
      "repetition_interval_everyweek$WEEKLY",
      "repetition_interval_everymonth$MONTHLY",
      "repetition_interval_everyyear$YEARLY"];

// repetition periods local array
var repetitionPeriodsLocale;

// reminder periods local array
var reminderPeriodsLocale;

// reminder periods local array
var reminderPeriods =
    [
        "reminder_1_minute$1",
        "reminder_at_the_moment$0",
        "reminder_5_minutes$5",
        "reminder_10_minutes$10",
        "reminder_15_minutes$15",
        "reminder_20_minutes$20",
        "reminder_25_minutes$25",
        "reminder_30_minutes$30",
        "reminder_45_minutes$45",
        "reminder_1_hour$60",
        "reminder_1_hour_30_minutes$90",
        "reminder_2_hours$120",
        "reminder_3_hours$180",
        "reminder_4_hours$240",
        "reminder_5_hours$300",
        "reminder_6_hours$360",
        "reminder_7_hours$420",
        "reminder_8_hours$480",
        "reminder_9_hours$540",
        "reminder_10_hours$600",
        "reminder_11_hours$660",
        "reminder_12_hours$720",
        "reminder_18_hours$1080",
        "reminder_24_hours$1440",
        "reminder_2_days$2880",
        "reminder_3_days$4320",
        "reminder_4_days$5760",
        "reminder_5_days$7200",
        "reminder_6_days$8640",
        "reminder_1_week$10080",
        "reminder_2_weeks$20160",
        "reminder_3_weeks$30240",
        "reminder_4_weeks$40320"
    ];

// loading message
var MSG_LOADING;

// error message
var MSG_ERROR;

// success message (after adding task or event)
var MSG_SUCCESS;

// no authorization message
var MSG_UNAUTHORIZED;

// available window states
var ST_START = 0; // popup was just opened
var ST_CONNECTED = 1; // having token already
var ST_CONNECTING = 2; // authorizing or revoking is in process
var ST_DISCONNECTED = 3; // no connection
var ST_ERROR = 4; // some error occured
var ST_SUCCESS = 5; // the action was completed successfully

// current popup window state
var currentState;

// available pages opened (for saving last opened page)
var WIN_AUTH = 0;
var WIN_TASK = 1;
var WIN_EVENT = 2;

// background page
var backGround;

// current user`s task lists
var taskLists = null;

// current user`s calendar lists
var calendarLists = null;

// last entered event date From (to correct date To after it changes)
var previousDateFrom = null;

// last entered event time From (to correct time To after it changes)
var previousTimeFrom = null;

window.addEventListener('load', init, false);

// initialization
function init() {
    backGround = chrome.extension.getBackgroundPage();
    //backGround.trackPageView();
    backGround.LogMsg('!!! Popup init started');
    changeState(ST_START);
    AddEventHandlers();
    LocalizePage();

    // setting the current state
    if (backGround.oauthMine.token == null) {
        changeState(ST_DISCONNECTED);
    }
    else {
        changeState(ST_CONNECTING);
        if (backGround.oauthMine.isTokenOk()) {
            if (backGround.taskLists != [] && backGround.userName != null && backGround.calendarLists != []) {
                backGround.LogMsg('Popup: taking old vals');
                GetGoogleInfoFromBackGround();
            }
            else {
                backGround.LogMsg('Popup: reloading vals');
                GetGoogleInfo(false);
            }
        }
        else {

            backGround.LogMsg('Popup: loading vals');
            GetGoogleInfo(false);
        }
    }

    //fill combos
    FillCombo($('combo-repetition-interval'), repetitionPeriodsLocale);
    for (var i=1; i<=5; i++) {
        var combo = $(GetRemindComboName(i));
        FillCombo(combo, reminderPeriodsLocale);
    }

    RestoreTaskInProcess();
    RestoreEventInProcess();

    OnRepeatCheckChanged ();

    SetButtonAddTaskState();
    SetButtonAddEventState();
}

// ask tasks lists and calendars from APIs
function GetGoogleInfo(withAuth) {
    if (withAuth) {
       authAndGetTasks();
    }
    else {
        getTasks();
    }

    getName();
    getCalendars();
}

// taking task lists and calendars from background
function GetGoogleInfoFromBackGround() {
    GetTaskLists(true);
    GetUserName(true);
    GetCalendarList(true);
}

/* if error occured while adding task, this task is saved in the taskInProcess variable */
/* this function restores this task in edit boxes*/
/* if we don`t have task to restore, function sets input-task-date to current date + 1 hour */
function RestoreTaskInProcess() {
    if (backGround.taskInProcess != null) {
        $('input-task-name').value = backGround.taskInProcess.name;
        $('input-task-date').value = backGround.taskInProcess.date != null ? backGround.taskInProcess.date : CurrDateStr(new Date());
        $('input-task-comment').value = backGround.taskInProcess.notes;
        $('checkbox-no-date').checked = backGround.taskInProcess.date != null;
    }
    else {
        $('input-task-date').value = CurrDateStrOffset(new Date());
    }
}

/* if error occured while adding event, this event is saved in the eventInProcess variable */
/* this function restores this event in edit boxes*/
/* if we don`t have event to restore, function sets input-event-from, input-event-from-time, input-event-to, input-event-to-time to current date + 1 hour */
function RestoreEventInProcess() {
    if (backGround.eventInProcess != null) {
        $('input-event-name').value = backGround.eventInProcess.name;
        $('input-event-from').value = backGround.eventInProcess.dateStart;
        $('input-event-to').value= backGround.eventInProcess.dateEnd;
        $('input-event-from-time').value = backGround.eventInProcess.timeStart;
        $('input-event-to-time').value= backGround.eventInProcess.timeEnd;
        $('input-event-comment').value = backGround.eventInProcess.description;
        $('checkbox-all-day').checked = backGround.eventInProcess.allDay;
        $('input-event-place').value = backGround.eventInProcess.place;
        $('checkbox-repetition').checked =  backGround.eventInProcess.recurrenceTypeValue != null;

        // restoring repetition period
        if (backGround.eventInProcess.recurrenceTypeValue != null) {
            for (var i = 0; i < repetitionPeriods.length; i++) {
                if (repetitionPeriods[i] == backGround.eventInProcess.recurrenceTypeValue) {
                    break;
                }
            }

            $('combo-repetition-interval').selectedIndex = i;
        }

        // restoring reminders
        if (backGround.eventInProcess.reminderTimeArray.length > 0) {
            for (var j=0; j< backGround.eventInProcess.reminderTimeArray.length; j++) {
                AddReminderDiv();
                var selectedTime = backGround.eventInProcess.reminderTimeArray[j];

                for (var i = 0; i < backGround.eventInProcess.reminderTimeArray.length; i++) {
                    if (reminderPeriods[i] == selectedTime) {
                        break;
                    }
                }

                $(GetRemindComboName(j+1)).selectedIndex = i;
            }
        }
    }
    else {
        // default value
        var today = new Date();
        var todayHourLater = addHours(today, 1);
        // default values current date next hour - current date next hour + one hour
        $('input-event-from').value = CurrDateStrOffset(today);
        $('input-event-from-time').value = CurrTimeStrOffset(today);
        $('input-event-to').value = CurrDateStrOffset(todayHourLater);
        $('input-event-to-time').value = CurrTimeStrOffset(todayHourLater);
    }

    previousDateFrom = $('input-event-from').value;
    previousTimeFrom =  $('input-event-from-time').value;
}

/* restoring last selected tab that was saved in backGround.popupSettings.lastTab*/
function RestoreLastSelectedTab(gotoDefault) {

    if (backGround.popupSettings.lastTab == -1) {
        gotoDefault();
        return;
    }

    switch (backGround.popupSettings.lastTab) {
        case WIN_AUTH:
            GotoAuthTab();
            break;
        case WIN_EVENT:
            GotoEventTab();
            break;
        case WIN_TASK:
            GotoTaskTab();
            break;
    }
}

/* adding event listeners to inputs*/
function AddEventHandlers() {
    // adding event handlers to tasks
    $('tab-add-task').addEventListener('click', GotoTaskTab);
    $('tab-add-event').addEventListener('click', GotoEventTab);
    $('tab-sign-in').addEventListener('click', GotoAuthTab);
    $('button-add-task').addEventListener('click', DoAddTask);
    $('button-sign-in').addEventListener('click', DoAuthorize);

    $('button-add-event').addEventListener('click', DoAddEvent);
    $('checkbox-repetition').addEventListener('change', OnRepeatCheckChanged);
    $('checkbox-no-date').addEventListener('change', OnNoDateCheckChanged);
    $('checkbox-all-day').addEventListener('change', OnAllDayCheckChanged);

    // OnNoDateCheckChanged
    // hrefs
    $('href-google-cal').addEventListener('click', OpenCalTab);
    $('href-day-by-day').addEventListener('click', OpenDayByDayTab);
    $('href-add-remind').addEventListener('click', AddReminderDiv);

    var list=document.getElementsByTagName("a");
    for (var i = 0; i < list.length; i++) {
        if (list[i].id.substr(0, 16) != "div-event-remind") {
            continue;
        }

        list[i].addEventListener('click', CloseReminderDiv);
    }

    // input to task fields
    $('input-task-name').addEventListener('input', SetButtonAddTaskState);
    $('combo-task-list').addEventListener('input', SetButtonAddTaskState);
    $('input-task-date').addEventListener('input', SetButtonAddTaskState);

       // input to event fields
    $('input-event-name').addEventListener('input', SetButtonAddEventState);
    $('combo-event-calendar').addEventListener('input', SetButtonAddEventState);
    $('input-event-from').addEventListener('input', SetButtonAddEventState);
    $('input-event-to').addEventListener('input', SetButtonAddEventState);
    $('input-event-from-time').addEventListener('input', SetButtonAddEventState);
    $('input-event-to-time').addEventListener('input', SetButtonAddEventState);

    $('input-event-from').addEventListener('input', OnDateFromChanged);
    $('input-event-from-time').addEventListener('input', OnTimeFromChanged);

    chrome.runtime.onMessage.addListener(OnGotMessage);
}

/* updating current window state*/
function UpdateCurrentState() {
    switch (currentState) {
        case ST_START:
            break;
        case ST_CONNECTED:
            disableButton($('button-sign-in'));
            SetAllElemsVisibility('visible');
            $('label-user-message').style.display='none';
            RestoreLastSelectedTab(GotoEventTab);
            setTabsVisibility(false, true, true);
            break;
        case ST_CONNECTING:
            GotoAuthTab();
            SetAllElemsVisibility('hidden');
            ShowMessageToUser(MSG_LOADING);
            setTabsVisibility(false, false, false);
            break;
        case ST_DISCONNECTED:
            GotoAuthTab();
            enableButton($('button-sign-in'));
            SetAllElemsVisibility('visible');
            $('label-user-message').style.display='none';
            setTabsVisibility(true, false, false);
            $('label-account-name').innerHTML = MSG_UNAUTHORIZED; // unknownUserName;
            break;
        case ST_ERROR:
            SetAllElemsVisibility('hidden');
            ShowMessageToUser(MSG_ERROR);
            setTabsVisibility(false, false, false);
            DoLogOut();
            setTimeout(function() { window.close(); }, 1500);
            break;
        case ST_SUCCESS:
            SetAllElemsVisibility('hidden');
            ShowMessageToUser(MSG_SUCCESS);
            setTabsVisibility(false, false, false);
            setTimeout(function() { window.close(); }, 1500);
            break;
    }
}

/* set Tabs visibility
    bool authVisibility - show Authorization page if true, hide page otherwise,
    bool addTaskVisibility - show Add task page if true, hide page otherwise
    bool addEventVisibility - show Add event page if true, hide page otherwise
*/
function setTabsVisibility(authVisibility, addTaskVisibility, addEventVisibility) {
    $('tab-add-task').style.display = addTaskVisibility? '': 'none';
    $('tab-add-event').style.display = addEventVisibility? '': 'none';
    $('tab-sign-in').style.display = authVisibility? '': 'none';
}

/*
    Showing message to a user with label-user-message
    string message - message to show
*/
function ShowMessageToUser(message) {
    $('label-user-message').style.display='';
    $('label-user-message').innerHTML = message;
}

/*
    Activates Add Task tab page
*/
function GotoTaskTab() {
    $('tab-add-task').className = 'SelectedTab';
    $('tab-add-event').className = 'Tab';
    $('tab-sign-in').className = 'Tab';
    $('page-add-task').style.display = 'block';
    $('page-add-event').style.display = 'none';
    $('page-sign-in').style.display = 'none';
    backGround.popupSettings.lastTab = WIN_TASK;
}

/*
 Activates Add event tab page
 */
function GotoEventTab() {
    $('tab-add-task').className = 'Tab';
    $('tab-add-event').className = 'SelectedTab';
    $('tab-sign-in').className = 'Tab';
    $('page-add-task').style.display = 'none';
    $('page-add-event').style.display = 'block';
    $('page-sign-in').style.display = 'none';
    backGround.popupSettings.lastTab = WIN_EVENT;
}

/*
 Activates Authorization tab page
 */
function GotoAuthTab() {
    $('tab-add-task').className = 'Tab';
    $('tab-add-event').className = 'Tab';
    $('tab-sign-in').className = 'SelectedTab';
    $('page-add-task').style.display = 'none';
    $('page-add-event').style.display = 'none';
    $('page-sign-in').style.display = 'block';
}

/*
 Opens Google Calendar url
*/
function OpenCalTab() {
   backGround.trackEvent('Google calendar link', 'clicked');
   OpenTab("https://www.google.com/calendar/render");
}

/*
  Opens Day by Day free url
 */
function OpenDayByDayTab() {
    backGround.trackEvent('Day by day link', 'clicked');
    OpenTab("https://play.google.com/store/apps/details?id=ru.infteh.organizer.trial");
}

/*
    Opens url in chrome, if it wasn`t opened, activate if it was opened
    string url - url to open
*/
function OpenTab(url) {
    chrome.tabs.query({url: url}, function(tabs) {
        if (tabs == null || tabs[0] == null) {
            chrome.tabs.create({url:url});
            return;
        }

        chrome.tabs.update(tabs[0].id, {active: true});
    });
}

/*
    Creates an array with reminder Periods selected in combos
    returns array[string] of reminderPeriods
*/
function MakeReminderTimeArray() {
    var reminderTimeArray = [];
    var remName = remDivName;

    for (var i=1; i<=5; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == '') {
            reminderTimeArray.push(reminderPeriods[$(GetRemindComboName(i)).selectedIndex]);
        }
    }

    return reminderTimeArray;
}

/*
    Closing reminder section when X is clicked
*/
function CloseReminderDiv(e) {
    var remName = remDivName;
    var cnt = 0;
    var targ;

    if (!e) var e = window.event;
    if (e.target) targ = e.target;
    else if (e.srcElement) targ = e.srcElement;

    while (targ.parentNode && !targ.parentNode.getAttribute('id')) {
        targ = targ.parentNode;
    }

    var divId = targ.parentNode.getAttribute('id');

    if (divId) {
        targ.parentNode.style.display = 'none';
        $('href-add-remind').style.display = '';
    }

    for (var i=1; i<=5; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == 'none') {
           cnt++;
        }
    }

    if (cnt == 5) {
        $('label-event-remind').style.display = 'none';
    }

}

/*
    Adding reminder section when link "Add a reminder" clicked
 */
function AddReminderDiv() {
    var remName = remDivName; //"Rem";
    var cnt = 0;

    for (var i=1; i<=5; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == 'none') {
            div.style.display = '';
            $('label-event-remind').style.display = '';
            cnt++;
            break;
        }
        else {
            cnt++;
        }
    }

    if (cnt == 5) {
        $('href-add-remind').style.display = 'none';
    }
}

/* asking for tasks lists of an authorized user */
function getTasks() {
    if (backGround.oauthMine.allowRequest()) {
        backGround.LogMsg('Popup: getTasks');
        backGround.AskForTaskLists(true);
    }
    else {
        setTimeout(getTasks, 1000);
    }
}

/* asking for task lists with authorization (can select account) */
function authAndGetTasks() {
    if (/*backGround.oauthMine.allowRequest()*/ true == true) {
        backGround.LogMsg('Popup: authAndGetTasks');
        backGround.AuthAndAskForTaskLists();
    }
    else {
        setTimeout(authAndGetTasks, 1000);
    }
}

/* asking for users name of an authorized user*/
function getName() {
    if (backGround.oauthMine.allowRequest()) {
            backGround.LogMsg('Popup: getName');
            backGround.AskForName(true);

    }
    else {
            setTimeout(getName, 1000);
    }
}

/*asking for calendars of an authorized user*/
function getCalendars() {
    if (backGround.oauthMine.allowRequest()) {
        backGround.LogMsg('Popup: getCalendars');
        backGround.AskForCalendars(true);
    }
    else {
        setTimeout(getCalendars, 1000);
    }
}

/* Function that is called when we get message*/
function OnGotMessage(request, sender, sendResponse) {
    if (!request.greeting) {
        return;
    }

    backGround.LogMsg('Popup OnGotMessage ' + request.greeting);

    if (request.greeting == "taskListReady") {

        backGround.LogMsg("taskListReady");

    /*    if (request.authCancelled) {
            changeState(ST_DISCONNECTED);
            return;
        }*/

         GetTaskLists(request.isOk);

        return;
    }

    if (request.greeting == "calendarListReady") {
        backGround.LogMsg("calendarListReady");

        if (currentState == ST_DISCONNECTED) {
            return;
        }

      /*  if (request.authCancelled) {
            changeState(ST_DISCONNECTED);
            return;
        }*/

        GetCalendarList(request.isOk);
        return;
    }

    if (request.greeting == "userNameReady") {
        backGround.LogMsg("userNameReady");

        if (currentState == ST_DISCONNECTED) {
            return;
        }

   /*     if (request.authCancelled) {
            changeState(ST_DISCONNECTED);
            return;
        }*/

        GetUserName(request.isOk);
        return;
    }

    if (request.greeting == "AddedOk") {
        changeState(ST_SUCCESS);
        return;
    }

    if (request.greeting == "AddedError") {
        alert(MSG_ERROR + '\n' + request.error);
        return;
    }

}

/*Gets calendars from background page, fill combo, select calendar "in process"*/
function GetCalendarList(requestIsOk) {
    var index = -1;
    var x = $('combo-event-calendar');

    // clears options
    x.options.length = 0;

    calendarLists = backGround.calendarLists;

    backGround.LogMsg('Popup: GotCalendarLists!');

    if (!requestIsOk || calendarLists.length == 0) {
        changeState(ST_ERROR);
        return;
    }

    for (var i = 0, cal; cal = calendarLists[i]; i++)
    {
        if (cal.accessRole == "owner") {
            var option = document.createElement("option");
            option.text = cal.summary;
            x.add(option,x[0]);
        }
    }

    // restoring task in process
    if (backGround.eventInProcess != null) {
        index = SearchCalendarIndexById(backGround.eventInProcess.listId );
        if (index != -1) {
            $('combo-event-calendar').value = backGround.eventInProcess.listName;
        }
        else {
            $('combo-event-calendar').value = "???";
        }
    }

    if (currentState != ST_CONNECTED) {
        changeState(ST_CONNECTED);
    }

}

/*Gets task lists from background page, fill combo, select task list "in process"*/
function GetTaskLists(requestIsOk) {
    var index = -1;
    var x = $('combo-task-list');

    // clears options
    x.options.length = 0;

    //Call Function
    taskLists = backGround.taskLists;

    backGround.LogMsg('Popup: GotTaskLists!');

    if (!requestIsOk || taskLists.length == 0) {
        changeState(ST_ERROR);
        return;
    }

    for (var i = 0, cal; cal = taskLists[i]; i++)
    {
        var option = document.createElement("option");
        option.text = cal.title;
        x.add(option,x[0]);
    }

    // restoring task in process
    if (backGround.taskInProcess != null) {
        index = SearchTaskListIndexById(backGround.taskInProcess.listId );
        if (index != -1) {
            $('combo-task-list').value = backGround.taskInProcess.listName;
        }
        else {
            $('combo-task-list').value = "???";
        }
    }

  /*  if (currentState != ST_CONNECTED) {
        changeState(ST_CONNECTED);
    }*/
}

/*Gets user name from background page, fill label-account-name with it*/
function GetUserName(requestIsOk) {
    backGround.LogMsg('Popup: GotUserName!');

    if (!requestIsOk) {
        changeState(ST_ERROR);
        return;
    }

    if (backGround.userName != null) {
        $('label-account-name').innerHTML = backGround.userName;
    }
    else {
        $('label-account-name').innerHTML = MSG_UNAUTHORIZED;//unknownUserName;
    }
}

/*
    Add task action
*/
function DoAddTask() {

    backGround.LogMsg('Popup: Add Task Called');
    backGround.trackEvent('Add a task', 'clicked');

    if (!AreAllTaskfieldsValid()) {
        return;
    }

    var name = $('input-task-name').value;
    var listName = $('combo-task-list').value;
    var date = $('checkbox-no-date').checked ?  $('input-task-date').value : null;
    var notes = $('input-task-comment').value;

    backGround.AddTask(name, listName, date,  notes);
}

/*
    Add event action
 */
function DoAddEvent() {
    backGround.LogMsg('Popup: Add Event Called');
    backGround.trackEvent('Add an event', 'clicked');

    if (!AreAllEventFieldsValid()) {
        return;
    }

    var name = $('input-event-name').value;
    var listName = $('combo-event-calendar').value;
    var dateStart = $('input-event-from').value;
    var dateEnd = $('input-event-to').value;
    var timeStart = $('input-event-from-time').value;
    var timeEnd = $('input-event-to-time').value;
    var description = $('input-event-comment').value;
    var allDay = $('checkbox-all-day').checked;
    var place = $('input-event-place').value;
    var recurrenceTypeIndex = $('checkbox-repetition').checked? $('combo-repetition-interval').selectedIndex : -1;
    var recurrenceTypeValue = recurrenceTypeIndex  > -1 ? repetitionPeriods[recurrenceTypeIndex] : null;

    var reminderTimeArray = MakeReminderTimeArray();

    backGround.AddEvent(name, listName, dateStart, dateEnd, timeStart, timeEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray);
}

/*
    Authorization action
*/
function DoAuthorize() {
    backGround.LogMsg('Popup: Authorize called');
    changeState(ST_CONNECTING);
    GetGoogleInfo(true);
}

/*
    Logout action
*/
function DoLogOut() {
    backGround.LogMsg('Popup: Revoke called');
 //   changeState(ST_CONNECTING);
    backGround.oauthMine.revoke(OnLoggedout);
}

/*
    Logout callback
 */
function OnLoggedout() {
    if (backGround.oauthMine.token == null) {
        changeState(ST_DISCONNECTED);
    }
    else {
        changeState(ST_ERROR);
    }
}

// Hides or shows all page elements
// string visibility = 'visible' || 'hidden'
function SetAllElemsVisibility(visibility) {
    $('page-add-task').style.visibility = visibility;
    $('page-add-event').style.visibility = visibility;
    $('page-sign-in').style.visibility = visibility;
    $('href-google-cal').style.visibility = visibility;
    $('href-day-by-day').style.visibility = visibility;
}

/* cuts off from arr[i] all text after TEXT_VALUE_SPLITTER and saves result to arr[i]*/
function LocalizeComboOption(item, i, arr) {
    var temp = arr[i].substring(0, arr[i].indexOf(TEXT_VALUE_SPLITTER));
    arr[i] = chrome.i18n.getMessage(temp);
}

/*localize page to current language*/
function LocalizePage() {
        // tabs
    $('href-sign-in').innerHTML =
        chrome.i18n.getMessage('authorize_tab_title');
    $('href-add-task').innerHTML =
        chrome.i18n.getMessage('add_task_tab_title');
    $('href-add-event').innerHTML =
        chrome.i18n.getMessage('add_event_tab_title');

    // hrefs
    $('href-google-cal').innerHTML =
        chrome.i18n.getMessage('calendar_link_title');
    $('href-day-by-day-big').innerHTML =
        chrome.i18n.getMessage('day_by_day_link_title_big');
    $('href-day-by-day-small').innerHTML =
        chrome.i18n.getMessage('day_by_day_link_title_small');
    
    // tasks
    $('input-task-name').placeholder =
        chrome.i18n.getMessage('task_name_title');
    $('label-task-list').innerHTML =
        chrome.i18n.getMessage('task_list_title');

    $('label-task-date').innerHTML =
        chrome.i18n.getMessage('task_date_title');
    $('input-task-comment').placeholder =
        chrome.i18n.getMessage('task_comment_title');
    $('button-add-task').value =
        chrome.i18n.getMessage('add_task_action_title');

    // localized combo lists
    repetitionPeriodsLocale = repetitionPeriods.slice(0);
    reminderPeriodsLocale = reminderPeriods.slice(0);
    repetitionPeriodsLocale.forEach(LocalizeComboOption);
    reminderPeriodsLocale.forEach(LocalizeComboOption);

    // authorization
    $('button-sign-in').value =
        chrome.i18n.getMessage('authorize_tab_title');

    // event

    $('input-event-name').placeholder =
        chrome.i18n.getMessage('event_name');
    $('label-event-from').innerHTML =
        chrome.i18n.getMessage('event_start_date_title');
    $('label-event-to').innerHTML =
        chrome.i18n.getMessage('event_end_date_title');
    $('label-repetition').innerHTML =
        chrome.i18n.getMessage('repetition_is_checked');
    $('label-all-day').innerHTML =
        chrome.i18n.getMessage('all_day_is_checked');
    $('label-repetition-interval').innerHTML =
        chrome.i18n.getMessage('repetition_interval_title');
    $('input-event-comment').placeholder =
        chrome.i18n.getMessage('event_description_title');
    $('input-event-place').placeholder =
        chrome.i18n.getMessage('event_place_title');
    $('label-event-calendar').innerHTML=
        chrome.i18n.getMessage('event_calendar_title');
    $('button-add-event').value =
        chrome.i18n.getMessage('add_event_action_title');

    $('label-event-remind').innerHTML =
        chrome.i18n.getMessage('reminder_title');
    $('href-add-remind').innerHTML =
        chrome.i18n.getMessage('reminder_add_action_title');

    for (var i=1; i<=5; i++) {
        var label = $(GetRemindLabelName(i));
        label.innerHTML =
            chrome.i18n.getMessage('reminder_type');
    }

    // messages
    MSG_LOADING = chrome.i18n.getMessage('loading_message');
    MSG_ERROR = chrome.i18n.getMessage('error_message');
    MSG_SUCCESS = chrome.i18n.getMessage('success_message');
    MSG_UNAUTHORIZED = chrome.i18n.getMessage('unauthorized_message');
}

/*
    Returns reminder label name with number i
    int i - reminder`s number
*/
function GetRemindLabelName(i) {
    return "label-event-remind-" + i.toString();
}

/*
    Returns reminder combo name with number i
    int i - reminder`s number
*/
function GetRemindComboName(i) {
    return "combo-event-remind-" + i.toString();
}

/*
    Changes popup window state
    int newState = ST_START || ST_CONNECTED || ST_CONNECTING || ST_DISCONNECTED || ST_ERROR || ST_SUCCESS
*/
function changeState(newState) {
    currentState = newState;
    backGround.LogMsg('Popup: Current state is ' + currentState);
    UpdateCurrentState();
}

/*
    Returns index in taskLists array by task list id
    string id - task list id
*/
function SearchTaskListIndexById(id) {
    for (var i = 0, cal; cal = taskLists[i]; i++)
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
function SearchCalendarIndexById(id) {
    for (var i = 0, cal; cal = calendarLists[i]; i++)
    {
        if ( id  == cal.id) {
            return i;
        }
    }

    return -1;
}

/*
    Enables button button-add-task if task fields are valid
 */
function SetButtonAddTaskState() {
    if (AreAllTaskfieldsValid()) {
        enableButton($('button-add-task'));
    }
    else {
        disableButton($('button-add-task'));
    }
}

/*
    Enables button button-add-event if event fields are valid
 */
function SetButtonAddEventState() {
    if (AreAllEventFieldsValid()) {
        enableButton($('button-add-event'));
    }
    else {
        disableButton($('button-add-event'));
    }
}

/*
    DateFrom change event handler
    When Date From is changed, date To should change to the same distance
    Example: Date From 16.06.2014 Date To 18.06.2014
    DateFrom Changes to 20.06.2014
    Date To should be 22.06.2014
*/
function OnDateFromChanged() {
    if (!previousDateFrom) {
        return;
    }

    if ($('input-event-from').checkValidity()) {
        var days = daydiff(previousDateFrom, $('input-event-from').value);
        $('input-event-to').value = CurrDateStr(addDays($('input-event-to').value, days));
        previousDateFrom = $('input-event-from').value;
    }
}

/*
    TimeFrom change event handler
    When time from is changed time Time To should change to the same distance
*/
function OnTimeFromChanged() {
    if (!previousTimeFrom) {
        return;
    }

    if ($('input-event-from-time').checkValidity()) {
        var minutes = timeDiff(previousTimeFrom, $('input-event-from-time').value);
        $('input-event-to-time').value = CurrTimeStr(addMinutes($('input-event-to').value + ' ' + $('input-event-to-time').value + ":00", minutes));
        previousTimeFrom = $('input-event-from-time').value;
    }
}

/*
    Returns true if all task fields are valid, false otherwise
*/
function AreAllTaskfieldsValid() {
    var taskDateIsValid = $('input-task-date').checkValidity() || !($('checkbox-no-date').checked);

    if  ($('input-task-name').checkValidity() && $('combo-task-list').checkValidity() && taskDateIsValid) {
        return true;
    }
    else {
        return false;
    }
}

/*
    Returns true if all event fields are valid, false otherwise
 */
function AreAllEventFieldsValid() {
    if  ($('input-event-name').checkValidity() &&
         $('input-event-from').checkValidity() &&
         $('input-event-to').checkValidity() &&
         $('combo-event-calendar').checkValidity() &&
         $('input-event-from-time').checkValidity() &&
         $('input-event-to-time').checkValidity()) {
        return true;
    }
    else {
        return false;
    }
}

/*
    Repeat checkbox event handler
    Shows combo-repetition-interval if checkbox is checked, hides otherwise
 */
function OnRepeatCheckChanged () {
    if ($('checkbox-repetition').checked) {
     //   $('erepeatinterval').style.display = '';
        $('combo-repetition-interval').style.display = '';
    }
    else {
     //   $('erepeatinterval').style.display = 'none';
        $('combo-repetition-interval').style.display = 'none';
    }
}

/*
    No date checkbox event handler
    Hides input-task-date if checkbox not checked, shows otherwise
*/
function OnNoDateCheckChanged() {
    if ($('checkbox-no-date').checked) {
        $('input-task-date').style.display = '';
    }
    else {
        $('input-task-date').style.display = 'none';
    }

    SetButtonAddTaskState();
}

/*
    All Day checkbox event handler
    Hides time inputs if checked, shows otherwise
 */
function OnAllDayCheckChanged() {
   if ($('checkbox-all-day').checked) {
       $('input-event-from-time').style.display = 'none';
       $('input-event-to-time').style.display = 'none';
   }
   else {
       $('input-event-from-time').style.display = '';
       $('input-event-to-time').style.display = '';
   }
}

window.onerror = function(message, file, line) {
    backGround._gaq.push(['_trackEvent', "Global", "Exception", file + "(" + line + "): " + message])
}



