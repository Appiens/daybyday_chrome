/**
 * Created by AstafyevaLA on 24.04.2014.
 */

// authorization module
var oauthMine = new OAuth2(c_redirect_uri, c_client_id, c_scope);

var loader = new Loader(oauthMine);

// sprs
var spr = new Spr();

// popup win settings
var popupSettings = new PopupSettings(-1, -1);

// current token ok
var currTokenOk = false;

// google analytics
var _gaq;

/* updating icon and popup page */
function updateView() {
    var isTokenOk = oauthMine.token != null; //oauthMine.isTokenOk();

    if (currTokenOk != isTokenOk) {
        if (isTokenOk) {
            chrome.browserAction.setIcon({ 'path' : '../images/daybyday16.png'});
            chrome.browserAction.setPopup({popup : "views/Popup.html"});
            loader.Load(false);
        }
        else {
            chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
            chrome.browserAction.setPopup({popup : ""});
//            taskLists = [];
//            calendarLists = [];
//            userName = null;
            loader.Clear();
        }
    }

    currTokenOk = isTokenOk;
};

/* Ask for task lists with select Google account*/
/* the result is put to calendar lists*/
function AuthAndAskForTaskLists() {
    loader.Load(true);
}

/* Logs msg*/
function LogMsg(message) {
    console.log(GetDateTimeStr() + ' ' + message);
}

/* Background page initialization*/
function init () {
    _gaq = _gaq || [];
    _gaq.push(['_setAccount', c_analytics_code]);


    (function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    })();

    updateView();
    oauthMine.init();
    window.setInterval(updateView, 1000);
    chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
    chrome.browserAction.onClicked.addListener(AuthAndAskForTaskLists);
    oauthMine.authorize(false, true, false);
}

window.addEventListener('load', init, false);

// all are sent to Google Analytics
window.onerror = function(message, file, line) {
    try {
        _gaq.push(['_trackEvent', "Global", "Exception", file + "(" + line + "): " + message])
    }
    catch (e) {
        LogMsg('gaq push exception error' + e)
    }

}

// send event to Google Analytics
// string name - event name
// string params - event params
function trackEvent(name, params) {
    try {
        _gaq.push(['_trackEvent', name, params]);
    }
    catch (e) {
        LogMsg('gaq push event error '+  e);
    }
}



