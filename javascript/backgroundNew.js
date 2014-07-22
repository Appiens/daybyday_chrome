/**
 * Created by AstafyevaLA on 24.04.2014.
 */

var loader2 = new Loader2();

// keeps the number of successfully added tasks and events to ask for mark
var markCounter = new MarkCounterBool(5);

// sprs
var spr = new Spr();

// popup win settings
var popupSettings = new PopupSettings();

// google analytics
var _gaq;

/* updating icon and popup page */
function updateView() {
    var isTokenOk = loader2.TokenNotNull();

    if (isTokenOk) {
        chrome.browserAction.setIcon({ 'path' : '../images/daybyday16.png'});
        chrome.browserAction.setPopup({popup : "views/Popup.html"});
        loader2.Load(false);
    }
    else {
        chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
        chrome.browserAction.setPopup({popup : ""});
        loader2.Clear();
    }
};

/* Ask for task lists with select Google account*/
/* the result is put to calendar lists*/
function AuthAndAskForTaskLists() {
   // loader.Load(true);
    loader2.Load(true);
}

/* Logs msg*/
function LogMsg(message) {
    console.log(GetDateTimeStr() + ' ' + message);
}

function OnGotMessage(request, sender, sendResponse) {
    if (request.greeting && request.greeting == "token") {
       updateView();
    }
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
    chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
    chrome.browserAction.onClicked.addListener(AuthAndAskForTaskLists);
    chrome.runtime.onMessage.addListener(OnGotMessage);
    loader2.requestProcessor.Init();
    loader2.requestProcessor.Authorize();
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



