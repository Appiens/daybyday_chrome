/**
 * Created by AstafyevaLA on 28.05.2014.
 */

//adding listener when body is loaded to call init function.
window.addEventListener('load', init, false);

var backGround;

var currTokenOk = false;

/**
 * Sets the value of multiple calendar checkbox based on value from
 * local storage, and sets up the `save` event handler.
 */
function init() {
    backGround = chrome.extension.getBackgroundPage();
    $('optionsTitle').innerHTML = chrome.i18n.getMessage('optionsTitle');

    $('buttonRevoke').value = chrome.i18n.getMessage('revoke_action_title');
    $('buttonRevokeText').innerHTML= chrome.i18n.getMessage('revoke_rights_action_title');
    $('extensionName').innerHTML = chrome.i18n.getMessage('title');
    document.querySelector('#buttonRevoke').addEventListener('click', revokeIt);

    window.setInterval(updateView, 3000);
};

function revokeIt() {
    backGround.oauthMine.revokeAuth();
};

function updateView() {
    var tokenOk = backGround.oauthMine.isTokenOk();

    if (tokenOk && !currTokenOk) {
        enableButton($('buttonRevoke'));
        currTokenOk = true;
    }
    else {
        if (!tokenOk && currTokenOk) {
            disableButton($('buttonRevoke'));
            currTokenOk = false;
        }
    }

}



