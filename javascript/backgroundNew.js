/**
 * Created by AstafyevaLA on 24.04.2014.
 */

var oauthMine = new OAuth2(c_redirect_uri, c_client_id, c_client_secret, c_scope);

// the task that now is processing, if we will have error it will be shown in popup
var taskInProcess = null;

var taskLists = [];

/*
  updating icon and popup page
*/
function updateView() {
    if (oauthMine.isTokenOk()) {
        chrome.browserAction.setIcon({ 'path' : '../images/icon-16.gif'});
        chrome.browserAction.setPopup({popup : "views/Popup.html"});
    } else {
        chrome.browserAction.setIcon({ 'path' : '../images/icon-16_bw.gif'});
        chrome.browserAction.setPopup({popup : ""});
    }
};

/*
  Callback function for AskForTasks
*/
function onGotTasks(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        try {
            var text = xhr.response;
            var obj = JSON.parse(text);
            taskLists= obj.items;
        }
        catch (e) {
            console.log('ex: ' + e);
            taskLists = [];
        }

        // sending a message to popup window
        chrome.runtime.sendMessage({greeting: "taskListReady"});
        updateView();
    }
}

function onAddTask(xhr)
{
    return function()
    {
        if (xhr.readyState != 4) {
            return;
        }

        if (xhr.status != 200) {
            try {
                var text = this.response;
                var obj = JSON.parse(text);

                alert(xhr.statusText + ' ' + xhr.status + '\n' + obj.error.code + ' ' + obj.error.message);
            }
            catch (e) {
                console.log('ex: ' + e);
            }
        }
        else {
            taskInProcess = null;
            alert(xhr.statusText + ' ' + xhr.status);
        }
    };
}

/*
  Gets task list id by task list name
*/
function getTaskIdByName(listName)
{
    for (var i = 0, cal; cal = taskLists[i]; i++)
    {
        if (cal.title == listName) {
            return cal.id;
        }
    }

    return -1;
}

function AddTask(name, listName, date, notes)
{
    if (!oauthMine.allowRequest())
    {
        Console.log('another request is processing');
        return;
    }

    var listId = getTaskIdByName(listName);

    taskInProcess = new Task(name, listId, date, notes, listName);

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onAddTask(xhr);
        xhr.onerror = function(error)
        {
            console.log('error: ' + error);
        };

        date = date + 'T00:00:00Z';

        url  = 'https://www.googleapis.com/tasks/v1/lists/' + listId + '/tasks';
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        var params = '{"title":"' + name + '","due":"' + date + '","notes":"'+ notes + '"}'
        oauthMine.setSignedRequest(xhr, params);
    }
    catch (e)
    {
        console.log('ex: ' + e);
    }

}

function AskForTasks() {

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = onGotTasks(xhr);
        xhr.onerror = function(error)
        {
            console.log('error: ' + error);
            updateView();
        };

        url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
        xhr.open('GET', url);
        oauthMine.setSignedRequest(xhr, null);
    }
    catch (e)
    {
        console.log('ex: ' + e);
        updateView();
    }
}

function init () {
    updateView();
    oauthMine.initBackgroundPage();
    window.setInterval(updateView, 10000);

    chrome.browserAction.onClicked.addListener(AskForTasks);
}

window.addEventListener('load', init, false);