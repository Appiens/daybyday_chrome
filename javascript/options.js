/**
 * Created by AstafyevaLA on 28.05.2014.
 */

//adding listener when body is loaded to call init function.
window.addEventListener('load', init, false);

// the backGround page
var backGround;

/*Initializes the page*/
function init() {
    backGround = chrome.extension.getBackgroundPage();
    LocalizePage();
    AddEventHandlers();
    updateView();
};

/*Revokes rigths to get token from app*/
function revokeIt() {
    backGround.loader.requestProcessor.Revoke(updateView);
};

/* On Got Message event handler
 When connection appears/disappears we should update view
 */
function OnGotMessage(request, sender, sendResponse) {
    if (request.greeting && request.greeting == "token") {
        updateView();
    }
}

/*Updates the Revoke button state*/
function updateView() {
    if (backGround.loader.IsRevoked() || !backGround.loader.TokenNotNull()) {
        disableButton($('buttonRevoke'));
    }
    else {
        enableButton($('buttonRevoke'));
    }
}

/*localize page to current language*/
function LocalizePage() {
    $('optionsTitle').innerHTML = chrome.i18n.getMessage('optionsTitle');
    $('buttonRevoke').value = chrome.i18n.getMessage('revoke_action_title');
    $('buttonRevokeText').innerHTML= chrome.i18n.getMessage('revoke_rights_action_title');
    $('extensionName').innerHTML = chrome.i18n.getMessage('name');
}

/*adds event handlers */
function AddEventHandlers() {
    document.querySelector('#buttonRevoke').addEventListener('click', revokeIt);
    chrome.runtime.onMessage.addListener(OnGotMessage);
}



