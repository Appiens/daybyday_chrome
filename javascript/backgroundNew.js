/**
 * Created by AstafyevaLA on 24.04.2014.
 */

// loads taskLists, calendarLists, userName
var loader = new Loader();

// keeps the number of successfully added tasks and events to ask for mark
var markCounter = new MarkCounterBool(3, 365);

// dictionaries module
var spr = new Spr();

// popup win settings? that should be saved between popup win launches
var popupSettings = new PopupSettings();

// google analytics (for logging)
var _gaq;

/* updating icon and popup page */
function updateView() {
    var isTokenOk = loader.TokenNotNull();

    if (isTokenOk) {
        chrome.browserAction.setIcon({ 'path' : '../images/daybyday16.png'});
        chrome.browserAction.setPopup({popup : "views/Popup.html"});
        loader.Load(false);
    }
    else {
        chrome.browserAction.setIcon({ 'path' : '../images/daybyday16gray.png'});
        chrome.browserAction.setPopup({popup : ""});
        loader.Clear();
    }
};

/* Ask for taskLists, calendarLists, userName with select Google account*/
function AuthAndAskForTaskLists() {
    loader.Load(true);
}

/* Logs msg to console with current date and time*/
function LogMsg(message) {
    console.log(GetDateTimeStr() + ' ' + message);
}

/* On Got Message event handler
   When connection appears/disappears we should update view
*/
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
    loader.requestProcessor.Authorize();
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



