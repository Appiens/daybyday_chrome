/**
 * Created by AstafyevaLA on 28.05.2014.
 */

//adding listener when body is loaded to call init function.
window.addEventListener('load', init, false);

var backGround;


/**
 * Sets the value of multiple calendar checkbox based on value from
 * local storage, and sets up the `save` event handler.
 */
function init() {
    backGround = chrome.extension.getBackgroundPage();
    $('optionsTitle').innerHTML = chrome.i18n.getMessage('optionsTitle');

    $('buttonRevoke').value = chrome.i18n.getMessage('revoke_action_title');
    $('buttonRevokeText').innerHTML= chrome.i18n.getMessage('revoke_rights_action_title');
    $('extensionName').innerHTML = chrome.i18n.getMessage('name');
    document.querySelector('#buttonRevoke').addEventListener('click', revokeIt);
    chrome.runtime.onMessage.addListener(OnGotMessage);
    updateView();
};

function revokeIt() {
    backGround.loader2.requestProcessor.Revoke(updateView);
};

function OnGotMessage(request, sender, sendResponse) {
    if (request.greeting && request.greeting == "token") {
        updateView();
    }
}

function updateView() {
    if (backGround.loader2.IsRevoked() || !backGround.loader2.TokenNotNull()) {
        disableButton($('buttonRevoke'));
    }
    else {
        enableButton($('buttonRevoke'));
    }
}



