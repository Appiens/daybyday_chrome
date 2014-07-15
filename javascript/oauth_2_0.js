
function OAuth2(redirect_uri, client_id, scope) {
    this.redirect_uri = redirect_uri;
    // the client id(Google developer console)
    this.client_id = client_id;
    // API we want to use in our app
    this.scope = scope;
    // authorizing is in process
    this.isAutorizing = false;
    // saved request to proceed after authorize
    this.savedRequest = null;
    // the body of saved request
    this.savedRequestBody = null;
    // true means that authorization was cancelled by user
    this.userCancelledAuthorize = false;

    // token for getting data
    var token = null;
    // token expiration time (in seconds)
    var tokenExpiresIn = 0;
    // the time we got last token
    var tokenGetTime = 0;

    // state for auth request (unique for each starting plugin)
    this.state = getRandomString(15);

    // authorization request to get token
    this.authRequest = "https://accounts.google.com/o/oauth2/auth?redirect_uri=" + this.redirect_uri  + "&response_type=token&client_id=" + this.client_id + "&scope=" + this.scope + "&state=" + this.state + "&access_type=online";

    // для обращения к переменным класса из обработчиков событий
    var parent = this;

    // authorization request with multiple accounts
    this.authRequestWithSelectAccount = parent.authRequest + "&prompt=select_account";

    /*
        make OAuth request
        boolean force - force authorization even if token is ok,
        boolean blindMode - if we need interaction with a user, authorization fails = do noe show windows
        boolean useSelectAccount - check account
    */
    this.authorize = function(force, blindMode, useSelectAccount) {
       // parent.authorizeNew(force, blindMode, useSelectAccount);

        parent.isAutorizing = true;
        chrome.identity.getAuthToken({'interactive': !blindMode},
            function (access_token) {
                parent.token = null;
                parent.tokenExpiresIn = 0;
                parent.tokenGetTime = 0;

                if (chrome.runtime.lastError) {
                    LogMsg(chrome.runtime.lastError);
                    parent.isAutorizing = false;
                    window.dispatchEvent(parent.authorizeEvent);
                    throw new Error(chrome.runtime.lastError);
                }

                parent.token = access_token;
                parent.tokenExpiresIn = 3600;
                parent.tokenGetTime = getCurrentTime();
                parent.isAutorizing = false;
                window.dispatchEvent(parent.authorizeEvent);
            });
    }

    /*
        make token bad
        callback - the callback function
     */
    this.revoke = function(callback){
        if (parent.token == null) {
            LogMsg('Revoke: token is bad or exprired');
            return;
        }

        chrome.identity.removeCachedAuthToken({ token:  parent.token},
            function() {
                if (chrome.runtime.lastError) {
                    LogMsg("revokeError " + chrome.runtime.lastError.message);
                    callback();
                    return;
                }

                 parent.token = null;
                 parent.tokenExpiresIn = 0;
                 parent.tokenGetTime = 0;

                LogMsg("revoke ok");
                callback();
            });
    }


    /*
        make token bad and revoke rights that user gave to app
     */
    this.revokeAuth = function() {
        if (parent.token == null)  {
            LogMsg('RevokeAuth: token is bad or exprired');
            return;
        }

        var tokenSv = parent.token;
        parent.revoke(function() {});

        var xhr = new XMLHttpRequest();

        try {
            xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                tokenSv);
            xhr.send();
        }
        catch (e) {
            LogMsg('ex: ' + e);
            throw e;
        }
    }

    /*callback function for an authorizeEvent event, sends savedRequest*/
    this.onAutorized = function() {
        if (parent.savedRequest != null)
        {
            // sending saved request
            parent.savedRequest.setRequestHeader('Authorization', 'Bearer ' + parent.token );
            parent.savedRequest.send(parent.savedRequestBody);
            parent.resetRequest();
        }
    }

    /* frees saved Request*/
    this.resetRequest = function () {
        parent.savedRequest = null;
        parent.savedRequestBody = null;
    }

    this.SignInChanged = function( account, signedIn) {
        LogMsg("Sign in changed " + account + ' ' + signedIn);
        if (signedIn) {
            parent.authorize(true, false, false);
        }
        else {
            parent.revoke(function() {});
        }
    }

    // fires when authorization is completed
    this.authorizeEvent = new CustomEvent("Authorize");
};

// inits oauth
OAuth2.prototype.init = function() {
    window.addEventListener('Authorize', this.onAutorized, false);
    chrome.identity.onSignInChanged.addListener(this.SignInChanged);
}


// returns true if token is ok (that means that connection is ok and we can make requests)
OAuth2.prototype.isTokenOk = function() {
    return this.token != null && ((getCurrentTime() - this.tokenGetTime) * 0.001 < this.tokenExpiresIn);
}

// returns true if no request is processing and we can set some request (with setSigned request)
// false if request is processing (for example, we are waiting for authorization)
OAuth2.prototype.allowRequest = function () {
    return this.savedRequest == null;
}
/*  sets request to proceed
    string request - HttpRequest
    string body - body of a query
    boolean blindMode - if true no authorization windows will be shown */
OAuth2.prototype.setSignedRequest = function(request, body, blindMode) {
    if (this.savedRequest != null)
    {
        return;
    }

    // saving request
    this.savedRequest = request;
    this.savedRequestBody = body;

    this.authorize(false, blindMode, false);
}

/*
 Special request with authorization (selecting Google account)
 string request - HttpRequest
 string body - body of a query
 boolean blindMode = false authorization window will be shown anyway
 */
OAuth2.prototype.setSignedRequestSpec = function(request, body) {

 /*   if (this.savedRequest != null)
    {
        return;
    }*/

    // saving request
    this.savedRequest = request;
    this.savedRequestBody = body;

    this.authorize(false, false, true);
}

/*
      Gives a part of the string between begStr and endStr
      string sourceStr - the source string,
      string begStr - the string before searching substring,
      string endStr - the string after searching string
      returns  substring between if begStr and endStr are found, null if begStr is not found, substring to end from begStr if begStr is found, endStr is not
 */
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

/*
 returns current time as integer (in ms)
*/
function getCurrentTime() {
    return (new Date()).getTime();
};



