/**
 * Created by AstafyevaLA on 29.04.2014.
 */

var backGround;

var getTasksTimer;

var taskLists = null;

//adding listener when body is loaded to call init function.
window.addEventListener('load', init, false);

/**
 * Sets the value of multiple calendar checkbox based on value from
 * local storage, and sets up the `save` event handler.
 */
function init() {
    $('buttonaddtask').addEventListener('click', DoAddTask);
    chrome.runtime.onMessage.addListener(OnGotMessage);
    LocalizePage();
    SetAllElemsVisibility('hidden');
    $('taskloading').style.display='';
    backGround = chrome.extension.getBackgroundPage();
    getTasksTimer = setInterval(function(){getTasks()},1000);
    getTasks();

    if (backGround.taskInProcess != null)
    {
        $('tasknameenter').value = backGround.taskInProcess.name;
        $('taskdateenter').value = backGround.taskInProcess.date;
        $('taskcommententer').value = backGround.taskInProcess.notes;
    }
};

function getTasks()
{
    if (backGround.oauthMine.allowRequest())
    {
        backGround.AskForTasks();
        clearInterval(getTasksTimer);
    }
}

function OnGotMessage(request, sender, sendResponse)
{
    var index = -1;

    if (request.greeting == "taskListReady")
    {
        var x = $('tasklistenter');
        //Call Function
        taskLists = backGround.taskLists;

        for (var i = 0, cal; cal = taskLists[i]; i++)
        {
            var option = document.createElement("option");
            option.text = cal.title;
            x.add(option,x[0]);

            if (backGround.taskInProcess != null && backGround.taskInProcess.listId == cal.id) {
                index = i;
            }
        }

        if (backGround.taskInProcess != null) {
            if (index != -1) {
                $('tasklistenter').value = backGround.taskInProcess.listName;
            }
            else {
                $('tasklistenter').value = "???";
            }
        }

        SetAllElemsVisibility('visible');
        $('taskloading').style.display='none';
    }
}

function DoAddTask()
{
    var name = $('tasknameenter').value;
    var listName = $('tasklistenter').value;
    var date = $('taskdateenter').value;
    var notes =  $('taskcommententer').value;

    backGround.AddTask(name, listName, date, notes);
}


// visibility = 'visible' || 'hidden'
function SetAllElemsVisibility(visibility)
{
    $('taskname').style.visibility= visibility;
    $('taskdate').style.visibility= visibility;
    $('taskcomment').style.visibility= visibility;
    $('tasklist').style.visibility= visibility;
    $('tasknameenter').style.visibility= visibility;
    $('taskdateenter').style.visibility= visibility;
    $('taskcommententer').style.visibility= visibility;
    $('tasklistenter').style.visibility= visibility;
    $('buttonaddtask').style.visibility= visibility;
}

function LocalizePage()
{
    $('taskname').innerHTML =
        chrome.i18n.getMessage('taskname');
    $('tasklist').innerHTML =
        chrome.i18n.getMessage('tasklist');
    $('addTask').innerHTML =
        chrome.i18n.getMessage('addTask');
    $('addEvent').innerHTML =
        chrome.i18n.getMessage('addEvent');
    $('taskdate').innerHTML =
        chrome.i18n.getMessage('taskdate');
    $('taskcomment').innerHTML =
        chrome.i18n.getMessage('taskcomment');
    $('taskloading').innerHTML =
        chrome.i18n.getMessage('taskloading');
    $('buttonaddtask').value =
        chrome.i18n.getMessage('addtaskprompt');

}
