/**
 * Created by AstafyevaLA on 25.04.2014.
 */

// var AUTH_ = "https://accounts.google.com/o/oauth2/auth?redirect_uri=https%3A%2F%2Fwww.example.com%2Foauth2callback&response_type=code&client_id=492637198173-9isjidn1cm3cmt92n5rkmp8kfll8dgk4.apps.googleusercontent.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Ftasks&approval_prompt=force&access_type=offline";


function OAuth(redirect_uri, client_id, client_secret, scope) {
    this.redirect_uri = redirect_uri;
    // идентификатор клиента (Google developer console)
    this.client_id = client_id;
    this.client_secret = client_secret;
    // API на которые запрашиваются права
    this.scope = scope;
    // идентификатор вкладки с авторизацией
    this.tabIdAutorizeWin = 0;
    // код авторизации возвращается после нажатия "Принять" в окне авторизации
    this.autorizeCode = null;
    // авторизация в процессе
    this.isAutorizing = false;
    // получение токена в процессе
    this.isGettingToken = false;
    // token for getting data
    var token = null;
    // token expiration time (in seconds)
    var tokenExpiresIn = 0;
    // the time we got last token
    var tokenGetTime = 0;
    // запрос авторизации для получения кода
    //this.authRequest = "https://accounts.google.com/o/oauth2/auth?redirect_uri=" + this.redirect_uri + "&response_type=code&client_id=" + this.client_id + "&scope=" + this.scope + /*"&approval_prompt=force + */"&access_type=offline";
    this.authRequest = "https://accounts.google.com/o/oauth2/auth?redirect_uri=" + this.redirect_uri + "&response_type=token&client_id=" + this.client_id + "&scope=" + this.scope /*+ "&approval_prompt=force&access_type=offline"*/;

    // для обращения к переменным класса из обработчиков событий
    var parent = this;

    this.onWinAuthCreated = function (window) {
        // Trace tab id which is created with this query
        // запоминаем идентификатор вкладки с авторизацией, чтобы получить ответ от неё
        parent.tabIdAutorizeWin = window.tabs[0].id;
        parent.isAutorizing = true;
    };

    this.onTabUpdate = function (tabId, changeInfo, tab) {
        // Inject script into chosen tab after it is loaded completely
        // здесь мы анализируем пришедший url из окна с авторизацией
        if (tabId == parent.tabIdAutorizeWin && changeInfo.status == "complete") {
            // Inject Jquery and in current tab
            var url = tab.url;
           // if (url.indexOf(parent.redirect_uri + '?') != -1) {
            if (url.indexOf(parent.redirect_uri + '#') != -1) {
                chrome.tabs.remove(tab.id);
                parent.tabIdAutorizeWin = 0;
                console.log(url)
                parent.autorizeCode = parseValue(url, 'code=', '&');
                parent.token = null;
                parent.tokenExpiresIn = 0;
                parent.tokenGetTime = 0;
                parent.isAutorizing = false;
                window.dispatchEvent(parent.authorizeEvent);
            }
        }
    }

    this.onTabRemoved = function (tabId) {
        if (tabId == parent.tabIdAutorizeWin)
        {
            // cancelling authorirztion
            parent.isAutorizing = false;
        }
    }

    this.genResponseChangeFunc = function(xhr) {
        return function () {
            if (xhr.readyState != 4) {
                return;
            }

            console.log(xhr.response);
            var obj = JSON.parse(xhr.response);

            try {
               parent.token = obj.access_token;
               parent.tokenExpiresIn = obj.expires_in;
               parent.tokenGetTime = getCurrentTime();
               console.log(parent.token);
               console.log(parent.tokenExpiresIn);
               console.log(parent.tokenGetTime);
            }
            catch (e)
            {
                console.log('ex: ' + e);
            }

            this.isGettingToken = false;
        }
    }

    this.authorizeEvent = new CustomEvent("Authorize");
};

OAuth.prototype.initBackgroundPage = function() {

    var callback =  this.onTabUpdate;
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
       callback(tabId, changeInfo, tab);
    });

    var callback2 = this.onTabRemoved;
    chrome.tabs.onRemoved.addListener(function (tabId) {
        callback2(tabId);
    });
}

OAuth.prototype.authorize = function() {
    if (this.isAutorizing){
        return;
    }
    chrome.windows.create({'url': this.authRequest, 'type': 'panel', 'focused' : true, 'width' : 450, 'height' : 550}, this.onWinAuthCreated
        );
};

OAuth.prototype.isTokenOk = function() {
    return this.token != null && ((getCurrentTime() - this.tokenGetTime) * 0.001 < this.tokenExpiresIn);
}

OAuth.prototype.get_Token = function() {
    if (this.isGettingToken)
    {
        console.log('Getting token is in process already');
        return;
    }

    if (this.autorizeCode == null ){
        throw "Authorization code could not be null while requesting token"
    }
    if (this.isTokenOk()) {
        return; // token is good we do not need to get another
    }

    this.token = null;
    this.tokenExpiresIn = 0;
    this.tokenGetTime = 0;
    this.isGettingToken = true;

    var request = "https://accounts.google.com/o/oauth2/token";

    var xhr = new XMLHttpRequest();
    try
    {
        xhr.onreadystatechange = this.genResponseChangeFunc(xhr);
        xhr.onerror = function(error)
        {
            console.log('error: ' + error);
            this.isGettingToken = false;
        };
        xhr.open('POST', request);
        xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
        xhr.send("grant_type=authorization_code&code=" + this.autorizeCode + "&redirect_uri=" + this.redirect_uri + "&client_id="+ this.client_id + "&scope=&client_secret=" + this.client_secret);
    }
    catch (e)
    {
        console.log('ex: ' + e);
        this.isGettingToken = false;
    }
}

function parseValue(sourceStr, begStr, endStr)
{
    if (sourceStr.indexOf(begStr) == -1){
        return null;
    }

    var temp = sourceStr.substring(sourceStr.indexOf(begStr) + begStr.length);
    if (temp.indexOf(endStr) != -1){
        temp = temp.substring(0, temp.indexOf(endStr));
    }
    return temp;
}

function getCurrentTime() {
    return (new Date()).getTime();
};
