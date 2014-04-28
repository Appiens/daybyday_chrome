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

function onTasks(text, xhr) {
    taskLists = [];

    console.log(text);

    var obj = JSON.parse(text);
    taskLists= obj.items;

    for (var i = 0, cal; cal = taskLists[i]; i++)
    {
        // console.log(cal.summary + ' ' + cal.description + ' ' + cal.accessRole + ' ' + cal.id);
        console.log(cal.title + ' ' + cal.id);
    }

    // chrome.tabs.create({ 'url' : 'contacts.html'});
};

function getTasks() {
  /*  if (_tabId_To_Look_For == 0 && _autorizedCode == null)
    {
        chrome.windows.create({'url': AUTH_, 'type': 'popup'},
            function(window)
            {
                // Trace tab id which is created with this query
                // запоминаем идентификатор вкладки с авторизацией, чтобы получить ответ от неё
                _tabId_To_Look_For = window.tabs[0].id

            });
    }*/
    oauthMine.authorize();
};


function genResponseChangeFunc(xhr) {
    return function () {
        if (xhr.readyState != 4) {
            return;
        }

        console.log(xhr.response);
    }
}

function logout() {
  //  oauth.clearTokens();
    setIcon();
};

/*function parseValue(sourceStr, begStr, endStr)
{
    if (sourceStr.indexOf(begStr) == -1)
    {
        return null;
    }

    var temp = sourceStr.substring(sourceStr.indexOf(begStr) + begStr.length)

    if (temp.indexOf(endStr) != -1)
    {
        temp = temp.substring(0, temp.indexOf(endStr));
    }

    return temp;
}*/

function func() {
    if (oauthMine.token != null) {
        alert(oauthMine.token)
    }
    else {
        alert('authorization cancelled');
    }

  //  oauthMine.get_Token();
}

function init () {
    setIcon();
    oauthMine.initBackgroundPage();
    window.addEventListener('Authorize', func, false)
   // chrome.browserAction.setPopup({popup : AUTH_});
    chrome.browserAction.onClicked.addListener(getTasks);

    // Add an event Listener for new tab created
 /*   chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        // Inject script into chosen tab after it is loaded completely
        // здесь мы анализируем пришедший url из окна с авторизацией
        if (tabId == _tabId_To_Look_For && changeInfo.status == "complete") {
            // Inject Jquery and in current tab
           var url = tab.url;

           if (url.indexOf('https://www.example.com/oauth2callback?') != -1)
           {
               chrome.tabs.remove(tab.id);
               _tabId_To_Look_For = 0;
               _autorizedCode = parseValue(url, 'code=', '&');
               console.log(_autorizedCode)
           }
        }
    });*/
}

window.addEventListener('load', init, false);