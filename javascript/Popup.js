/**
 * Created by AstafyevaLA on 29.04.2014.
 */

// rem div prefix
var remDivName = "div-event-remind-";

// repetititon periods array
var repetitionPeriods =
    [ "repetition_interval_everyday$DAILY",
      "repetition_interval_everyweek$WEEKLY",
      "repetition_interval_everymonth$MONTHLY",
      "repetition_interval_everyyear$YEARLY"];

// repetition periods local array
var repetitionPeriodsLocale;

// reminder periods local array
var reminderPeriodsLocale;

// reminder periods  array
var reminderPeriods =
    [
        "reminder_minutes$1",
        "reminder_hours$60",
        "reminder_days$1440",
        "reminder_weeks$10080"
    ];

// reminder methods array local
var reminderMethodsLocale;

// reminder methods array
var reminderMethods =
    [
        "reminder_popup$popup",
        "reminder_sms$sms",
        "reminder_email$email"
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
var taskLists = [];

// current user`s calendar lists
var calendarLists = [];

// last entered event date From (to correct date To after it changes)
var previousDateFrom = null;

// last entered event time From (to correct time To after it changes)
var previousTimeFrom = null;

// maximum reminders number
var REMINDER_MAX = 5;

var REMINDER_DEFAULT_VALUE = 10;

var addingTaskInProcess = false;

var addingEventInProcess = false;

window.addEventListener('load', init, false);


// initialization
function init() {
    backGround = chrome.extension.getBackgroundPage();
    //backGround.trackPageView();
    backGround.LogMsg('!!! Popup init started');
    changeState(ST_START);

    LocalizePage();

    // clearing saved task and event if keeping time is over
    if (backGround.popupSettings.CheckKeepingTimeOver()) {
        backGround.LogMsg('Keeping time is over');
        backGround.popupSettings.ClearSavedEvent();
        backGround.popupSettings.ClearSavedTask();
    }

    // setting the current state
    if (backGround.oauthMine.token == null) {
        changeState(ST_DISCONNECTED);
    }
    else {
        changeState(ST_CONNECTING);
     //   if (backGround.oauthMine.isTokenOk()) {
            if (backGround.taskLists != [] && backGround.userName != null && backGround.calendarLists != []) {
                backGround.LogMsg('Popup: taking old vals');
                GetGoogleInfoFromBackGround();

                // but asking for new ones for the next time
                GetGoogleInfo(false);
            }
            else {
                backGround.LogMsg('Popup: reloading vals');
                GetGoogleInfo(false);
            }
      /*  }
        else {

            backGround.LogMsg('Popup: loading vals');
            GetGoogleInfo(false);
        }*/
    }

    //fill combos
    FillCombo($('combo-repetition-interval'), repetitionPeriodsLocale);
    for (var i=1; i<= REMINDER_MAX; i++) {
        var combo = $(GetRemindComboName(i));
        FillCombo(combo, reminderPeriodsLocale);
        var comboMethods = $(GetRemindMethodComboName(i));
        FillCombo(comboMethods, reminderMethodsLocale);
    }

    RestoreTaskInProcess();
    RestoreEventInProcess();

    OnRepeatCheckChanged();

    SetButtonAddTaskState();
    SetButtonAddEventState();

    AddEventHandlers();
}

// this event fires when popup closes
window.onunload = function() {
    backGround.LogMsg("closed!");

    if (backGround.popupSettings.SavedTaskExists()) {
          var taskInProcess = backGround.popupSettings.GetSavedTask();
          taskInProcess.name = $('input-task-name').value;
          taskInProcess.listName = $('combo-task-list').value;
          taskInProcess.listId = getTaskIdByName(taskInProcess.listName);
          taskInProcess.date =  $('checkbox-with-date').checked ? $('input-task-date').value : null;
          taskInProcess.notes = $('input-task-comment').value;
          taskInProcess.notesRows = $('input-task-comment').style.height;
    }

    if (backGround.popupSettings.SavedEventExists()) {
         var eventInProcess = backGround.popupSettings.GetSavedEvent();
         eventInProcess.name = $('input-event-name').value;
         eventInProcess.listName = $('combo-event-calendar').value;
         eventInProcess.listId = getCalendarIdByName(eventInProcess.listName);
         eventInProcess.dateStart = $('input-event-from').value;
         eventInProcess.dateEnd = $('input-event-to').value;
         eventInProcess.timeStart = $('input-event-from-time').value;
         eventInProcess.timeEnd = $('input-event-to-time').value;
         eventInProcess.description = $('input-event-comment').value;
         eventInProcess.allDay = $('checkbox-all-day').checked;
         eventInProcess.place = $('input-event-place').value;
         var recurrenceTypeIndex = $('checkbox-repetition').checked? $('combo-repetition-interval').selectedIndex : -1;
         eventInProcess.recurrenceTypeValue = recurrenceTypeIndex  > -1 ? repetitionPeriods[recurrenceTypeIndex] : null;
         eventInProcess.reminderTimeArray = MakeReminderTimeArray();
         eventInProcess.reminderMethodArray = MakeReminderMethodArray();
    }

    backGround.popupSettings.lastSelectedTaskList = getTaskIdByName($('combo-task-list').value);
    backGround.popupSettings.lastSelectedCalendar = getCalendarIdByName($('combo-event-calendar').value);

    backGround.popupSettings.SetStartKeepingTime();
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

/* when popup closes edited task is saved in the taskInProcess variable */
/* this function restores this task in edit boxes*/
/* if we don`t have task to restore, function sets default values to task fields*/
function RestoreTaskInProcess() {
    if (backGround.popupSettings.SavedTaskExists()) {
        var taskInProcess = backGround.popupSettings.GetSavedTask();
        $('input-task-name').value = taskInProcess.name;
        $('input-task-date').value = taskInProcess.date != null ? taskInProcess.date : CurrDateStrOffset(new Date());
        $('input-task-comment').value = taskInProcess.notes;
        $('checkbox-with-date').checked = taskInProcess.date != null;
        $('input-task-date').style.display = taskInProcess.date != null ? '': 'none';

        // #8
        /*if (taskInProcess.notesRows) {
          //   $('input-task-comment').style.height = taskInProcess.notesRows;
        }*/
    }
    else {
        $('input-task-name').value = '';
        $('input-task-date').value = CurrDateStrOffset(new Date());
        $('input-task-comment').value = '';
        $('checkbox-with-date').checked = true;
        $('input-task-date').style.display = '';
    }
}

/* when popup closes edited event is saved in the eventInProcess variable */
/* this function restores this event in edit boxes*/
/* if we don`t have event to restore, function sets default values to event fields */
function RestoreEventInProcess() {
    if (backGround.popupSettings.SavedEventExists()) {
        var eventInProcess = backGround.popupSettings.GetSavedEvent();
        $('input-event-name').value = eventInProcess.name;
        $('input-event-from').value = eventInProcess.dateStart;
        $('input-event-to').value= eventInProcess.dateEnd;
        $('input-event-from-time').value = eventInProcess.timeStart;
        $('input-event-to-time').value= eventInProcess.timeEnd;
        $('input-event-comment').value = eventInProcess.description;
        $('checkbox-all-day').checked = eventInProcess.allDay;
        $('input-event-place').value = eventInProcess.place;
        $('checkbox-repetition').checked =  eventInProcess.recurrenceTypeValue != null;
        $('combo-repetition-interval').style.display = eventInProcess.recurrenceTypeValue != null ? '' : 'none';

        // restoring repetition period
        if (eventInProcess.recurrenceTypeValue != null) {
            for (var i = 0; i < repetitionPeriods.length; i++) {
                if (repetitionPeriods[i] == eventInProcess.recurrenceTypeValue) {
                    break;
                }
            }

            $('combo-repetition-interval').selectedIndex = i;
        }

        RestoreReminders(eventInProcess.reminderTimeArray, eventInProcess.reminderMethodArray);
    }
    else {
        // default value
        var today = new Date();
        var todayHourLater = addHours(today, 1);
        // default values current date next hour - current date next hour + one hour
        $('input-event-name').value = '';
        $('input-event-from').value = CurrDateStrOffset(today);
        $('input-event-from-time').value = CurrTimeStrOffset(today);
        $('input-event-to').value = CurrDateStrOffset(todayHourLater);
        $('input-event-to-time').value = CurrTimeStrOffset(todayHourLater);
        $('input-event-from-time').style.display = '';
        $('input-event-to-time').style.display = '';
        $('input-event-comment').value = '';
        $('checkbox-all-day').checked = false;
        $('input-event-place').value = '';
        $('checkbox-repetition').checked = false;
        $('combo-repetition-interval').style.display = 'none';
        $('href-add-remind').style.display = '';

        $('label-event-remind').style.display = 'none';

        OnCalendarChanged(true);
    }

    previousDateFrom = $('input-event-from').value;
    previousTimeFrom =  $('input-event-from-time').value;
}

function RestoreReminders(reminderTimeArray, reminderMethodArray) {
    for (var j=0; j< REMINDER_MAX; j++) {
        $(GetRemindDivName(j + 1)).style.display = 'none';
    }

    if (reminderTimeArray.length > 0) {
        for (var j=0; j< reminderTimeArray.length; j++) {
            AddReminderDiv();

            // restoring reminder times
            var selectedTime = parseInt(reminderTimeArray[j]);
            var result = selectedTime;
            var resultIndex = 0;

            if (selectedTime > 0) {
                for (var i = 0; i < reminderPeriods.length; i++) {
                    var k = parseInt(GetGoogleNameByValue(reminderPeriods[i]));

                    var resultTmp = selectedTime / k;

                    if (parseInt(resultTmp) == resultTmp ) {
                        result = resultTmp;
                        resultIndex = i;
                    }
                }
            }

            $(GetRemindComboName(j+1)).selectedIndex = resultIndex;
            $(GetRemindInputName(j + 1)).value = result;

            var selectedMethod = TEXT_VALUE_SPLITTER + reminderMethodArray[j];

            // restoring reminder methods
            for (var i = 0; i < reminderMethods.length; i++) {
                if (reminderMethods[i].indexOf(selectedMethod) != -1) {
                    break;
                }
            }

            $(GetRemindMethodComboName(j+1)).selectedIndex = i;
        }
    }
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
    $('button-clear-task').addEventListener('click', DoClearTask);

    $('button-sign-in').addEventListener('click', DoAuthorize);

    $('button-add-event').addEventListener('click', DoAddEvent);
    $('button-clear-event').addEventListener('click', DoClearEvent);

    $('checkbox-repetition').addEventListener('change', OnRepeatCheckChanged);

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
    $('input-task-name').addEventListener('input', OnTaskFieldChanged);
    $('combo-task-list').addEventListener('change', OnTaskFieldChanged);
    $('input-task-date').addEventListener('input', OnTaskFieldChanged);
    $('checkbox-with-date').addEventListener('change', OnNoDateCheckChanged);
    $('input-task-comment').addEventListener('input', OnTaskFieldChanged);

    $('input-task-name').addEventListener("keypress", onKeypressTask, false);
    $('input-task-date').addEventListener("keypress", onKeypressTask, false);

       // input to event fields
    $('input-event-name').addEventListener('input', OnEventFieldChanged);
    $('combo-event-calendar').addEventListener('change', OnEventFieldChanged);
    $('combo-event-calendar').addEventListener('change', OnCalendarChangedCallback);
    $('input-event-from').addEventListener('input', OnEventFieldChanged);
    $('input-event-to').addEventListener('input', OnEventFieldChanged);
    $('input-event-from-time').addEventListener('input', OnEventFieldChanged);
    $('input-event-to-time').addEventListener('input', OnEventFieldChanged);

    $('input-event-comment').addEventListener('input', OnEventFieldChanged);
    $('checkbox-all-day').addEventListener('change', OnEventFieldChanged);
    $('input-event-place').addEventListener('input', OnEventFieldChanged);
    $('checkbox-repetition').addEventListener('change', OnEventFieldChanged);
    $('combo-event-calendar').addEventListener('change', OnEventFieldChanged);
    $('href-add-remind').addEventListener('click', OnEventFieldChanged);


    $('input-event-from').addEventListener('input', OnDateFromChanged);
    $('input-event-from-time').addEventListener('input', OnTimeFromChanged);

    $('input-event-name').addEventListener("keypress", onKeypressEvent, false);
    $('input-event-from').addEventListener("keypress", onKeypressEvent, false);
    $('input-event-to').addEventListener("keypress", onKeypressEvent, false);
    $('input-event-from-time').addEventListener("keypress", onKeypressEvent, false);
    $('input-event-to-time').addEventListener("keypress", onKeypressEvent, false);
    $('input-event-place').addEventListener("keypress", onKeypressEvent, false);

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

    for (var i=1; i<= REMINDER_MAX; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == '') {
            var value =  parseInt($(GetRemindInputName(i)).value) * parseInt(GetGoogleNameByValue(reminderPeriods[$(GetRemindComboName(i)).selectedIndex]));

            reminderTimeArray.push(value);
        }
    }

    return reminderTimeArray;
}

/*
*/

function MakeReminderMethodArray() {
    var reminderMethodArray = [];

    var remName = remDivName;

    for (var i=1; i<= REMINDER_MAX; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == '') {
            reminderMethodArray.push(GetGoogleNameByValue(reminderMethods[$(GetRemindMethodComboName(i)).selectedIndex]));
        }
    }

    return reminderMethodArray;
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

    for (var i=1; i<= REMINDER_MAX; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == 'none') {
           cnt++;
        }
    }

    if (cnt == REMINDER_MAX) {
        $('label-event-remind').style.display = 'none';
    }
}

/*
    Adding reminder section when link "Add a reminder" clicked
 */
function AddReminderDiv() {
    var remName = remDivName; //"Rem";
    var cnt = 0;

    for (var i=1; i<=REMINDER_MAX; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == 'none') {
            div.style.display = '';
            // default values
            $(GetRemindMethodComboName(i)).selectedIndex = 0;
            $(GetRemindComboName(i)).selectedIndex = 0;
            $(GetRemindInputName(i)).value = REMINDER_DEFAULT_VALUE;
            $(GetRemindInputName(i)).value = REMINDER_DEFAULT_VALUE;
          //  $(GetRemindInputName(i)).value = $(GetRemindInputName(i)).value + 1 - 1;

            $('label-event-remind').style.display = '';
            cnt++;
            break;
        }
        else
            cnt++;

    }

    if (cnt == REMINDER_MAX) {
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

        // we already have taskList from backGround and we don`t want to change it online
        // we will get it when popup will be opened the next time
        if (taskLists.length > 0) {
            return;
        }

        GetTaskLists(request.isOk);
        return;
    }

    if (request.greeting == "calendarListReady") {
        backGround.LogMsg("calendarListReady");

        if (currentState == ST_DISCONNECTED) {
            return;
        }

        // we already have calendarList from backGround and we don`t want to change it online
        // we will get it when popup will be opened the next time
        if (calendarLists.length > 0) {
            return;
        }

        GetCalendarList(request.isOk);
        return;
    }

    if (request.greeting == "userNameReady") {
        backGround.LogMsg("userNameReady");

        if (currentState == ST_DISCONNECTED) {
            return;
        }

        GetUserName(request.isOk);
        return;
    }

    if (request.greeting == "AddedOk") {
        if (request.type == "task") {
            backGround.popupSettings.ClearSavedTask();
            addingTaskInProcess = false;
            SetButtonAddTaskState();
        }

        if (request.type == "event") {
            backGround.popupSettings.ClearSavedEvent();
            addingEventInProcess = false;
            SetButtonAddEventState();
        }

        changeState(ST_SUCCESS);
        return;
    }

    if (request.greeting == "AddedError") {
        if (request.type == "task") {
            addingTaskInProcess = false;
            SetButtonAddTaskState();
        }

        if (request.type == "event") {
            addingEventInProcess = false;
            SetButtonAddEventState();
        }

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
            option.innerHTML = cal.summary;
            option.style.color = cal.backgroundColor;

            x.add(option,x[0]);
        }
    }

    // restoring task in process
    if (backGround.popupSettings.SavedEventExists()) {
        var eventInProcess = backGround.popupSettings.GetSavedEvent();
        index = SearchCalendarIndexById(eventInProcess.listId );
        if (index != -1) {
            $('combo-event-calendar').value = eventInProcess.listName;
            OnCalendarChanged(false);
        }
    }
    else if (backGround.popupSettings.lastSelectedCalendar) {
        index = SearchCalendarIndexById(backGround.popupSettings.lastSelectedCalendar);
        if (index != -1) {
            $('combo-event-calendar').value = calendarLists[index].summary;
            OnCalendarChanged(true);
        }
    }
    else {
        OnCalendarChanged(true);
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
    if (backGround.popupSettings.SavedTaskExists()) {
        var taskInProcess = backGround.popupSettings.GetSavedTask();
        index = SearchTaskListIndexById(taskInProcess.listId );
        if (index != -1) {
            $('combo-task-list').value = taskInProcess.listName;
        }
    }
    else if (backGround.popupSettings.lastSelectedTaskList) {
        index = SearchTaskListIndexById(backGround.popupSettings.lastSelectedTaskList);
        if (index != -1) {
            $('combo-task-list').value = taskLists[index].title;
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
    if (!AreAllTaskfieldsValid()) {
        return;
    }

    if (addingTaskInProcess) {
        return;
    }

    addingTaskInProcess = true;
    SetButtonAddTaskState();

    backGround.LogMsg('Popup: Add Task Called');
    backGround.trackEvent('Add a task', 'clicked');

    var name = $('input-task-name').value;
    var listName = $('combo-task-list').value;
    var listId = getTaskIdByName(listName);
    var date = $('checkbox-with-date').checked ?  $('input-task-date').value : null;
    var notes = $('input-task-comment').value;

    backGround.AddTask(name, listId, date,  notes);
}

/*
   Clear Task Fields action
 */
function DoClearTask() {
   backGround.popupSettings.ClearSavedTask();
   RestoreTaskInProcess();
   SetButtonAddTaskState();
}

/*
    Clear Event Fields action
 */
function DoClearEvent() {
    backGround.popupSettings.ClearSavedEvent();
    RestoreEventInProcess();
    SetButtonAddEventState();
}

/*
    Add event action
 */
function DoAddEvent() {
    if (!AreAllEventFieldsValid()) {
        return;
    }

    if (addingEventInProcess) {
        return;
    }

    addingEventInProcess = true;
    SetButtonAddEventState();

    backGround.LogMsg('Popup: Add Event Called');
    backGround.trackEvent('Add an event', 'clicked');

    var name = $('input-event-name').value;
    var listName = $('combo-event-calendar').value;
    var listId = getCalendarIdByName(listName);
    var timeZone = getTimeZoneByName(listName);
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
    var reminderMethodArray = MakeReminderMethodArray();

    backGround.AddEvent(name, listId, timeZone, dateStart, dateEnd, timeStart, timeEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray, reminderMethodArray);
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
    $('button-clear-task').value =
        chrome.i18n.getMessage('clear_task_action_title');

    // localized combo lists
    repetitionPeriodsLocale = repetitionPeriods.slice(0);
    reminderPeriodsLocale = reminderPeriods.slice(0);
    reminderMethodsLocale = reminderMethods.slice(0);
    repetitionPeriodsLocale.forEach(LocalizeComboOption);
    reminderPeriodsLocale.forEach(LocalizeComboOption);
    reminderMethodsLocale.forEach(LocalizeComboOption);

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
    $('button-clear-event').value =
        chrome.i18n.getMessage('clear_event_action_title');

    $('label-event-remind').innerHTML =
        chrome.i18n.getMessage('reminder_title');
    $('href-add-remind').innerHTML =
        chrome.i18n.getMessage('reminder_add_action_title');

//    for (var i=1; i<=REMINDER_MAX; i++) {
//        var label = $(GetRemindLabelName(i));
//        label.innerHTML =
//            chrome.i18n.getMessage('reminder_type');
//    }

    // messages
    MSG_LOADING = chrome.i18n.getMessage('loading_message');
    MSG_ERROR = chrome.i18n.getMessage('error_message');
    MSG_SUCCESS = chrome.i18n.getMessage('success_message');
    MSG_UNAUTHORIZED = chrome.i18n.getMessage('unauthorized_message');
}

/*
    Returns reminder div name with number i
    int i - reminder`s number
*/
function GetRemindDivName(i) {
    return "div-event-remind-" + i.toString();
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

function GetRemindInputName(i) {
    return "input-quantity-remind-" + i.toString();
}

function GetRemindMethodComboName(i) {
    return "combo-event-remind-method-" + i.toString();
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
    var taskDateIsValid = $('input-task-date').checkValidity() || !($('checkbox-with-date').checked);

    if  ($('input-task-name').checkValidity() && $('combo-task-list').checkValidity() && taskDateIsValid && !addingTaskInProcess) {
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
         $('input-event-to-time').checkValidity() &&
        ($(GetRemindDivName(1)).style.display == 'none' || $(GetRemindInputName(1)).checkValidity())  &&
        ($(GetRemindDivName(2)).style.display == 'none' || $(GetRemindInputName(2)).checkValidity()) &&
        ($(GetRemindDivName(3)).style.display == 'none' || $(GetRemindInputName(3)).checkValidity()) &&
        ($(GetRemindDivName(4)).style.display == 'none' || $(GetRemindInputName(4)).checkValidity()) &&
        ($(GetRemindDivName(5)).style.display == 'none' || $(GetRemindInputName(5)).checkValidity()) &&
        !addingEventInProcess) {
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
    $('input-task-date').style.display = $('checkbox-with-date').checked ? '' : 'none';
    var taskInProcess = backGround.popupSettings.GetSavedTask();
    taskInProcess.date = $('checkbox-with-date').checked ?  $('input-task-date').value : null;

    SetButtonAddTaskState();
}

function OnTaskFieldChanged(e) {
    backGround.popupSettings.GetSavedTask();
    SetButtonAddTaskState();
}

function OnEventFieldChanged(e) {
    backGround.popupSettings.GetSavedEvent();
    SetButtonAddEventState();
}

function OnCalendarChangedCallback() {
    OnCalendarChanged(false);
}

function OnCalendarChanged(restoreReminders) {
    var combo = $('combo-event-calendar');
    for (var i=0; i < combo.options.length; i++) {
        if (combo.value == combo.options[i].value) {
            $('td-color-calendar').style.backgroundColor = combo.options[i].style.color;

            if (restoreReminders) {
                var j;
                for (j = 0; j < calendarLists.length; j++) {
                    if (calendarLists[j].summary == combo.value) {
                        break;
                    }
                }

                var reminderTimeArray =  [];
                var reminderTimeMethod = [];

                if (j < calendarLists.length && calendarLists[j].defaultReminders) {
                    for (var k = 0; k < calendarLists[j].defaultReminders.length; k++) {
                        reminderTimeArray.push(calendarLists[j].defaultReminders[k].minutes);
                        reminderTimeMethod.push(calendarLists[j].defaultReminders[k].method);
                    }
                }

                RestoreReminders(reminderTimeArray, reminderTimeMethod);
            }

            break;
        }
    }
}

/* Gets task list id by task list name */
/* string listName - task list title (name)*/
/* int returns task list id, -1 if not found*/
function getTaskIdByName(taskListName) {
    for (var i = 0, cal; cal = taskLists[i]; i++)
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
function getCalendarIdByName(calendarName) {
    for (var i = 0, cal; cal = calendarLists[i]; i++)
    {
        if (cal.summary == calendarName) {
            return cal.id;
        }
    }

    return -1;
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

/* Gets calendar time zone by calendar name */
/* string calendarName - calendar summary (name)*/
/* returns int calendar id, -1 if not found*/
function getTimeZoneByName(calendarName) {
    for (var i = 0, cal; cal = calendarLists[i]; i++)
    {
        if (cal.summary == calendarName) {
            return cal.timeZone;
        }
    }

    return -1;
}

function onKeypressTask(event) {
    var keyCode = event.keyCode;

    if (keyCode == 13 && AreAllTaskfieldsValid()) {
        DoAddTask();
    }
}

function onKeypressEvent(event) {
    var keyCode = event.keyCode;

    if (keyCode == 13 && AreAllEventFieldsValid()) {
        DoAddEvent();
    }
}

window.onerror = function(message, file, line) {
    backGround._gaq.push(['_trackEvent', "Global", "Exception", file + "(" + line + "): " + message])
};



