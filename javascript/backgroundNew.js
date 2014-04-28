/**
 * Created by AstafyevaLA on 24.04.2014.
 */

var oauthMine = new OAuth2(c_redirect_uri, c_client_id, c_client_secret, c_scope);

var taskLists = [];

function setIcon() {
  //  if (oauth.hasToken()) {
        chrome.browserAction.setIcon({ 'path' : '../images/icon-16.gif'});
 /*   } else {
        chrome.browserAction.setIcon({ 'path' : '../images/icon-16_bw.gif'});
    }*/
};

function genResponseChangeFunc(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        taskLists = [];
        var text = xhr.response;
        var obj = JSON.parse(text);
        taskLists= obj.items;

        for (var i = 0, cal; cal = taskLists[i]; i++)
        {
            console.log(cal.title + ' ' + cal.id);
        }

        chrome.runtime.sendMessage({greeting: "giveMeData"});
    }
}

function logout() {
  //  oauth.clearTokens();
    setIcon();
};

function AskForTasks() {

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = genResponseChangeFunc(xhr);
        xhr.onerror = function(error)
        {
            console.log('error: ' + error);
        };

        url  = 'https://www.googleapis.com/tasks/v1/users/@me/lists';
        xhr.open('GET', url);
        oauthMine.setSignedRequest(xhr, null);
    }
    catch (e)
    {
        console.log('ex: ' + e);
    }

  //  oauthMine.get_Token();
}

function init () {
    setIcon();
    oauthMine.initBackgroundPage();
 //   window.addEventListener('Authorize', func, false)
   // chrome.browserAction.setPopup({popup : AUTH_});
    chrome.browserAction.setPopup({popup : "views/Main.html"});
 //   chrome.browserAction.onClicked.addListener(AskForTasks);
}

window.addEventListener('load', init, false);