/**
 * Created by AstafyevaLA on 29.04.2014.
 */

var repetitionPeriods =
    [ "repetition_interval_everyweek$WEEKLY",
      "repetition_interval_everyday$DIALY",
      "repetition_interval_everymonth$MONTHLY",
      "repetition_interval_everyyear$YEARLY"];

var repetitionPeriodsLocale;
var reminderPeriodsLocale;

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

// сообщение о загрузке
var MSG_LOADING;

// сообщение об ошибке
var MSG_ERROR;

// сообщение об успехе (при добавлении мероприятия или задачи)
var MSG_SUCCESS;

// available window states
var ST_START = 0; // popup was just opened
var ST_CONNECTED = 1; // having token already
var ST_CONNECTING = 2; // authorizing or revoking is in process
var ST_DISCONNECTED = 3; // no connection
var ST_ERROR = 4; // some error occured
var ST_SUCCESS = 5; // the action was completed successfully

// current window state
var currentState;

// showing when no one is signed in
var unknownUserName = "???";

// background page
var backGround;

// current user`s task lists
var taskLists = null;

var calendarLists = null;

window.addEventListener('load', init, false);

function init() {
    backGround = chrome.extension.getBackgroundPage();
    backGround.LogMsg('!!! Popup init started');
    changeState(ST_START);
    AddEventHandlers();
    LocalizePage();

    // setting the current state
    if (backGround.oauthMine.token == null) {
        changeState(ST_DISCONNECTED);
    }
    else {
        if (backGround.oauthMine.isTokenOk()) {
            changeState(ST_CONNECTED);

            if (backGround.taskLists != null && backGround.userName != null) {
                backGround.LogMsg('Popup: taking old vals');
                GetGoogleInfoFromBackGround();
            }
            else {
                backGround.LogMsg('Popup: reloading vals');
                GetGoogleInfo(false);
            }
        }
        else {
            changeState(ST_CONNECTING);
            backGround.LogMsg('Popup: loading vals');
            GetGoogleInfo(false);
        }
    }

    //fill combos
    FillCombo($('erepeatintervalenter'), repetitionPeriodsLocale);
    for (var i=1; i<=5; i++) {
        var combo = $('erem' + i.toString() + 'combo');
        FillCombo(combo, reminderPeriodsLocale);
    }

    RestoreTaskInProcess();
    RestoreEventInProcess();

    OnRepeatCheckChanged ();

    SetButtonAddTaskState();
    SetButtonAddEventState();
};

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

function GetGoogleInfoFromBackGround() {
    GetTaskLists(true);
    GetUserName(true);
    GetCalendarList(true);
}

/* if error occured while adding task, this task is saved in the taskInProcess variable */
function RestoreTaskInProcess() {
    if (backGround.taskInProcess != null) {
        $('tasknameenter').value = backGround.taskInProcess.name;
        $('taskdateenter').value = backGround.taskInProcess.date;
        $('taskcommententer').value = backGround.taskInProcess.notes;
    }
}

function RestoreEventInProcess() {
    if (backGround.eventInProcess != null) {
        $('enameenter').value = backGround.eventInProcess.name;
        $('edatestartenter').value = backGround.eventInProcess.dateStart;
        $('edateendenter').value= backGround.eventInProcess.dateEnd;
        $('ecommententer').value = backGround.eventInProcess.description;
        $('eallday').checked = backGround.eventInProcess.allDay;
        $('eplaceenter').value = backGround.eventInProcess.place;
        $('erepeatcheck').checked =  backGround.eventInProcess.recurrenceTypeValue != null;

        // restoring repetition period
        if (backGround.eventInProcess.recurrenceTypeValue != null) {
            for (var i = 0; i < repetitionPeriods.length; i++) {
                if (repetitionPeriods[i] == backGround.eventInProcess.recurrenceTypeValue) {
                    break;
                }
            }

            $('erepeatintervalenter').selectedIndex = i;
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

                $('erem' + (j+1).toString() + 'combo').selectedIndex = i;
            }
        }
    }
}

function AddEventHandlers() {
    // adding event handlers to tasks
    $('addTask').addEventListener('click', GotoTaskTab);
    $('addEvent').addEventListener('click', GotoEventTab);
    $('auth').addEventListener('click', GotoAuthTab);
    $('buttonaddtask').addEventListener('click', DoAddTask);
    $('buttonauth').addEventListener('click', DoAuthorize);
    $('buttonrevoke').addEventListener('click', DoLogOut);
    $('buttonaddevent').addEventListener('click', DoAddEvent);
    $('erepeatcheck').addEventListener('change', OnRepeatCheckChanged);

    // hrefs
    $('linkToCal').addEventListener('click', OpenCalTab);
    $('addRem').addEventListener('click', AddReminderDiv);

    var list=document.getElementsByTagName("a");
    for (var i = 0; i < list.length; i++) {
        if (list[i].id.substr(0, 4) != "erem") {
            continue;
        }

        list[i].addEventListener('click', CloseReminderDiv);
    }

    // input to task fields
    $('tasknameenter').addEventListener('input', SetButtonAddTaskState);
    $('tasklistenter').addEventListener('input', SetButtonAddTaskState);
    $('taskdateenter').addEventListener('input', SetButtonAddTaskState);

       // input to event fields
    $('enameenter').addEventListener('input', SetButtonAddEventState);
    $('ecalendarenter').addEventListener('input', SetButtonAddEventState);
    $('edatestartenter').addEventListener('input', SetButtonAddEventState);
    $('edateendenter').addEventListener('input', SetButtonAddEventState);

    chrome.runtime.onMessage.addListener(OnGotMessage);
}

function UpdateCurrentState() {
    switch (currentState) {
        case ST_START:
            enableButton($('buttonauth'));
            disableButton( $('buttonrevoke'));
            break;
        case ST_CONNECTED:
            SetAllElemsVisibility('visible');
            $('taskloading').style.display='none';
            if ($('auth').className = 'SelectedTab') {
                GotoTaskTab();
            }
            $('addTask').style.visibility = 'visible';
            $('addEvent').style.visibility = 'visible';
            $('auth').style.visibility = 'visible';
            disableButton($('buttonauth'));
            enableButton( $('buttonrevoke'));
            break;
        case ST_CONNECTING:
            GotoAuthTab();
            SetAllElemsVisibility('hidden');
            $('taskloading').style.display='';
            $('taskloading').innerHTML = MSG_LOADING;
            $('addTask').style.visibility = 'hidden';
            $('addEvent').style.visibility = 'hidden';
            $('auth').style.visibility = 'hidden';
            break;
        case ST_DISCONNECTED:
            GotoAuthTab();
            SetAllElemsVisibility('visible');
            $('taskloading').style.display='none';
            $('addTask').style.visibility = 'hidden';
            $('addEvent').style.visibility = 'hidden';
            $('auth').style.visibility = 'visible';
            enableButton($('buttonauth'));
            disableButton( $('buttonrevoke'));
            $('labelName').innerHTML = unknownUserName;
            break;
        case ST_ERROR:
            SetAllElemsVisibility('hidden');
            $('taskloading').style.display='';
            $('taskloading').innerHTML = MSG_ERROR;
            $('addTask').style.visibility = 'hidden';
            $('addEvent').style.visibility = 'hidden';
            $('auth').style.visibility = 'hidden';
            setTimeout(function() { window.close(); }, 1500);
            break;
        case ST_SUCCESS:
            SetAllElemsVisibility('hidden');
            $('taskloading').style.display='';
            $('taskloading').innerHTML = MSG_SUCCESS;
            $('addTask').style.visibility = 'hidden';
            $('addEvent').style.visibility = 'hidden';
            $('auth').style.visibility = 'hidden';
            setTimeout(function() { window.close(); }, 1500);
            break;
    }
}

function GotoTaskTab() {
    $('addTask').className = 'SelectedTab';
    $('addEvent').className = 'Tab';
    $('auth').className = 'Tab';
    $('One').style.display = 'block';
    $('Two').style.display = 'none';
    $('Three').style.display = 'none';
}

function GotoEventTab() {
    $('addTask').className = 'Tab';
    $('addEvent').className = 'SelectedTab';
    $('auth').className = 'Tab';
    $('One').style.display = 'none';
    $('Two').style.display = 'block';
    $('Three').style.display = 'none';
}

function GotoAuthTab() {
    $('addTask').className = 'Tab';
    $('addEvent').className = 'Tab';
    $('auth').className = 'SelectedTab';
    $('One').style.display = 'none';
    $('Two').style.display = 'none';
    $('Three').style.display = 'block';
}

function OpenCalTab() {
    chrome.tabs.query({url: "https://www.google.com/calendar/*"}, function(tabs) {
        if (tabs == null || tabs[0] == null) {
            chrome.tabs.create({url:"https://www.google.com/calendar/render"});
            return;
        }

        chrome.tabs.update(tabs[0].id, {active: true});
    });
}

function MakeReminderTimeArray() {
    var reminderTimeArray = [];
    var remName = "Rem";

    for (var i=1; i<=5; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == '') {
            reminderTimeArray.push(reminderPeriods[$('erem' + i.toString() + 'combo').selectedIndex]);
        }
    }

    return reminderTimeArray;
}

function CloseReminderDiv(e) {
    var remName = "Rem";
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
        $('addRem').style.display = '';
    }

    for (var i=1; i<=5; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == 'none') {
           cnt++;
        }
    }

    if (cnt == 5) {
        $('eremind').style.display = 'none';
    }

}

function AddReminderDiv() {
    var remName = "Rem";
    var cnt = 0;

    for (var i=1; i<=5; i++) {
        var div = $(remName + i.toString());
        if (div.style.display == 'none') {
            div.style.display = '';
            $('eremind').style.display = '';
            cnt++;
            break;
        }
        else {
            cnt++;
        }
    }

    if (cnt == 5) {
        $('addRem').style.display = 'none';
    }
}

/* asking for tasks lists of an authorized user */
function getTasks() {
    if (backGround.oauthMine.allowRequest()) {
        backGround.LogMsg('Popup: getTasks');
        backGround.AskForTaskLists(false);
    }
    else {
        setTimeout(getTasks, 1000);
    }
}

/* asking for task lists with authorization (can select account) */
function authAndGetTasks() {
    if (backGround.oauthMine.allowRequest()) {
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

function getCalendars() {
    if (backGround.oauthMine.allowRequest()) {
        backGround.LogMsg('Popup: getCalendars');
        backGround.AskForCalendars(true);
    }
    else {
        setTimeout(getCalendars, 1000);
    }
}

function OnGotMessage(request, sender, sendResponse) {
    if (!request.greeting) {
        return;
    }

    backGround.LogMsg('Popup OnGotMessage ' + request.greeting);

    if (request.greeting == "taskListReady") {

        backGround.LogMsg("taskListReady cancelled = " + request.authCancelled);

        if (request.authCancelled) {
            changeState(ST_DISCONNECTED);
            return;
        }

         GetTaskLists(request.isOk);

        return;
    }

    if (request.greeting == "calendarListReady") {
        backGround.LogMsg("calendarListReady cancelled = " + request.authCancelled);

        if (currentState == ST_DISCONNECTED) {
            return;
        }

        if (request.authCancelled) {
            changeState(ST_DISCONNECTED);
            return;
        }

        GetCalendarList(request.isOk);
        return;
    }

    if (request.greeting == "userNameReady") {
        backGround.LogMsg("userNameReady cancelled = " + request.authCancelled);

        if (currentState == ST_DISCONNECTED) {
            return;
        }

        if (request.authCancelled) {
            changeState(ST_DISCONNECTED);
            return;
        }

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

function GetCalendarList(requestIsOk) {
    var index = -1;
    var x = $('ecalendarenter');

    // clears options
    x.options.length = 0;

    calendarLists = backGround.calendarLists;

    backGround.LogMsg('Popup: GotCalendarLists!');

    if (!requestIsOk) {
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
            $('ecalendarenter').value = backGround.eventInProcess.listName;
        }
        else {
            $('ecalendarenter').value = "???";
        }
    }

    if (currentState != ST_CONNECTED) {
        changeState(ST_CONNECTED);
    }
}

function GetTaskLists(requestIsOk) {
    var index = -1;
    var x = $('tasklistenter');

    // clears options
    x.options.length = 0;

    //Call Function
    taskLists = backGround.taskLists;

    backGround.LogMsg('Popup: GotTaskLists!');

    if (!requestIsOk) {
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
            $('tasklistenter').value = backGround.taskInProcess.listName;
        }
        else {
            $('tasklistenter').value = "???";
        }
    }

    if (currentState != ST_CONNECTED) {
        changeState(ST_CONNECTED);
    }
}


function GetUserName(requestIsOk) {
    backGround.LogMsg('Popup: GotUserName!');

    if (!requestIsOk) {
        changeState(ST_ERROR);
        return;
    }

    if (backGround.userName != null) {
        $('labelName').innerHTML = backGround.userName;
    }
    else {
        $('labelName').innerHTML = unknownUserName;
    }
}

function DoAddTask() {

    backGround.LogMsg('Popup: Add Task Called');

    if (!AreAllTaskfieldsValid()) {
        return;
    }

    var name = $('tasknameenter').value;
    var listName = $('tasklistenter').value;
    var date = $('taskdateenter').value;
    var notes = $('taskcommententer').value;

    backGround.AddTask(name, listName, date,  notes);
}

function DoAddEvent() {
    backGround.LogMsg('Popup: Add Event Called');

    if (!AreAllEventFieldsValid()) {
        return;
    }

    var name = $('enameenter').value;
    var listName = $('ecalendarenter').value;
    var dateStart = $('edatestartenter').value;
    var dateEnd = $('edateendenter').value;
    var description = $('ecommententer').value;
    var allDay = $('eallday').checked;
    var place = $('eplaceenter').value;
    var recurrenceTypeIndex = $('erepeatcheck').checked? $('erepeatintervalenter').selectedIndex : -1;
    var recurrenceTypeValue = recurrenceTypeIndex  > -1 ? repetitionPeriods[recurrenceTypeIndex] : null;

    var reminderTimeArray = MakeReminderTimeArray();

    backGround.AddEvent(name, listName, dateStart, dateEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray);
}

function DoAuthorize() {
    backGround.LogMsg('Popup: Authorize called');
    changeState(ST_CONNECTING);
    GetGoogleInfo(true);
}

function DoLogOut() {
    backGround.LogMsg('Popup: Revoke called');
    changeState(ST_CONNECTING);
    backGround.oauthMine.revoke(OnLoggedout);
}

function OnLoggedout() {
    if (backGround.oauthMine.token == null) {
        changeState(ST_DISCONNECTED);
    }
    else {
        changeState(ST_ERROR);
    }
}

// visibility = 'visible' || 'hidden'
function SetAllElemsVisibility(visibility) {
    $('One').style.visibility = visibility;
    $('Two').style.visibility = visibility;
    $('Three').style.visibility = visibility;
}

function LocalizeComboOption(item, i, arr) {
    var temp = arr[i].substring(0, arr[i].indexOf(TEXT_VALUE_SPLITTER));
    arr[i] = chrome.i18n.getMessage(temp);
}

function LocalizePage() {
    // tasks
    $('taskname').innerHTML =
        chrome.i18n.getMessage('task_name_title');
    $('tasklist').innerHTML =
        chrome.i18n.getMessage('task_list_title');
    $('at').innerHTML =
        chrome.i18n.getMessage('authorize_tab_title');
    $('att').innerHTML =
     chrome.i18n.getMessage('add_task_tab_title');
    $('aet').innerHTML =
     chrome.i18n.getMessage('add_event_action_title');
    $('taskdate').innerHTML =
        chrome.i18n.getMessage('task_date_title');
    $('taskcomment').innerHTML =
        chrome.i18n.getMessage('task_comment_title');
    $('buttonaddtask').value =
        chrome.i18n.getMessage('add_task_action_title');

    // localized combo lists
    repetitionPeriodsLocale = repetitionPeriods.slice(0);
    reminderPeriodsLocale = reminderPeriods.slice(0);
    repetitionPeriodsLocale.forEach(LocalizeComboOption);
    reminderPeriodsLocale.forEach(LocalizeComboOption);

    $('ename').innerHTML =
        chrome.i18n.getMessage('event_name');
    $('edatestart').innerHTML =
        chrome.i18n.getMessage('event_start_date_title');
    $('edateend').innerHTML =
        chrome.i18n.getMessage('event_end_date_title');
    $('erpt').innerHTML =
        chrome.i18n.getMessage('repetition_is_checked');
    $('ealldaytext').innerHTML =
        chrome.i18n.getMessage('all_day_is_checked');
    $('erepeatinterval').innerHTML =
        chrome.i18n.getMessage('repetition_interval_title');
    $('ecomment').innerHTML =
        chrome.i18n.getMessage('event_description_title');
    $('eplace').innerHTML =
        chrome.i18n.getMessage('event_place_title');
    $('ecalendar').innerHTML=
        chrome.i18n.getMessage('event_calendar_title');
    $('buttonaddevent').value =
        chrome.i18n.getMessage('add_event_action_title');
    $('buttonauth').value =
        chrome.i18n.getMessage('authorize_tab_title');
    $('buttonrevoke').value =
        chrome.i18n.getMessage('logout_action_title');

    $('eremind').innerHTML =
        chrome.i18n.getMessage('reminder_title');
    $('addRem').innerHTML =
        chrome.i18n.getMessage('reminder_add_action_title');

    for (var i=1; i<=5; i++) {
        var label = $('erem' + i.toString() + 'label');
        label.innerHTML =
            chrome.i18n.getMessage('reminder_type');
    }

    // messages
    MSG_LOADING = chrome.i18n.getMessage('loading_message');
    MSG_ERROR = chrome.i18n.getMessage('error_message');
    MSG_SUCCESS = chrome.i18n.getMessage('success_message');
}

function changeState(newState) {
    currentState = newState;
    backGround.LogMsg('Popup: Current state is ' + currentState);
    UpdateCurrentState();
}

function SearchTaskListIndexById(id) {
    for (var i = 0, cal; cal = taskLists[i]; i++)
    {
        if ( id  == cal.id) {
            return i;
        }
    }

    return -1;
}

function SearchCalendarIndexById(id) {
    for (var i = 0, cal; cal = calendarLists[i]; i++)
    {
        if ( id  == cal.id) {
            return i;
        }
    }

    return -1;
}

function SetButtonAddTaskState() {
    if (AreAllTaskfieldsValid()) {
        enableButton($('buttonaddtask'));
    }
    else {
        disableButton($('buttonaddtask'));
    }
}

function SetButtonAddEventState() {
    if (AreAllEventFieldsValid()) {
        enableButton($('buttonaddevent'));
    }
    else {
        disableButton($('buttonaddevent'));
    }
}

function AreAllTaskfieldsValid() {
    if  ($('tasknameenter').checkValidity() && $('tasklistenter').checkValidity() && $('taskdateenter').checkValidity()) {
        return true;
    }
    else {
        return false;
    }
}

function AreAllEventFieldsValid() {
    if  ($('enameenter').checkValidity() && $('edatestartenter').checkValidity() && $('edateendenter').checkValidity() && $('ecalendarenter').checkValidity()) {
        return true;
    }
    else {
        return false;
    }
}

function OnRepeatCheckChanged () {
    if ($('erepeatcheck').checked) {
        $('erepeatinterval').style.display = '';
        $('erepeatintervalenter').style.display = '';
    }
    else {
        $('erepeatinterval').style.display = 'none';
        $('erepeatintervalenter').style.display = 'none';
    }
}



