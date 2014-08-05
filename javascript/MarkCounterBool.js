/*
    This module keeps   self.currentNumber and self.isAsked variables
    It can:
    Save and restore this variables from cookies
    Check if currentNumber > MaxNumber -> in this case we should ask for a mark
*/

function MarkCounterBool(maxNumber, daysToKeep) {
    this.MaxNumber = maxNumber; // the limit for self.currentNumber to increase


    var cookieDomain = "github.com";  // the cookie domain
    var cookiePath = "/Appiens/daybyday_chrome"; // the cookie path
    var cookieUrl = "https://"+ cookieDomain + cookiePath + "/trololo"; // the cookie url

    var self = this;
    self.isReadOk = false; // values was restored from cookies without error
    self.cookieArray = []; // the cookie array for cookieDomain, cookiePath
    self.currentNumber = 0; // the current number, that is seeking to maxNumber
    self.isAsked = 0; // if 1 we have asked for mark already and we don`t need doing it again
    self.counterName = chrome.runtime.id; // cookie name for currentNamber
    self.isAskedName = self.counterName + "_asked"; // cookie name for isAsked
    self.daysToKeep = daysToKeep; // the number of days to keep cookie

    /*Reads currentNumber and isAsked from cookies
    * callback - the callback function*/
    this.Read = function(callback) {
        self.currentNumber = 0;
        self.isAsked = 0;
        self.isReadOk = false;

        chrome.cookies.getAll({
            "domain": cookieDomain,
            "path": cookiePath
        }, function (cookies) {
                if (chrome.extension.lastError || chrome.runtime.lastError) {
                    LogMsg(chrome.extension.lastError.message);
                    LogMsg(chrome.runtime.lastError.message);
                    self.isReadOk = false;
                    callback();
                    return;
                }

                LogMsg(JSON.stringify(cookies));
                self.cookieArray = cookies;

                try {
                    self.isAsked = parseInt(searchEl(self.isAskedName));
                    self.currentNumber = parseInt(searchEl(self.counterName));
                    LogMsg("isAsked = " + self.isAsked + ", currentNumber = " + self.currentNumber);
                    self.isReadOk = true;
                    callback();
                }
                catch (e) {
                    LogMsg(e);
                    self.isReadOk = false;
                    callback();
                }
            }

            );
    }

    /* Saves isAsked if isAsked = 1, or currentNumber if isAsked = 0*/
    this.Save = function() {
        if (self.isAsked > 0) {
            writeValueToCookie(self.isAskedName, self.isAsked.toString());
        }
        else {
            writeValueToCookie(self.counterName, self.currentNumber.toString());
        }
    }

    /*returns true if cookies was read sucessfully*/
    this.checkReadOk = function() {
        return self.isReadOk;
    }

    /*returns currentNumber value*/
    this.CurrentNumber = function() {
        return self.currentNumber;
    }

    /*Adds value to currentNumber
    * int value - value to add*/
    this.addToCurr = function(value) {
        self.currentNumber += value;
    }

    /*returns True, if we should ask for a mark*/
    this.checkMaximum = function() {
        return self.currentNumber > this.MaxNumber && self.isAsked == 0;
    }

    /*Sets isAsked = 1. We have asked for a mark*/
    this.stop = function() {
        self.isAsked = 1;
    }

    this.resetCounter = function() {
        self.currentNumber = 0;
        self.isAsked = 0;
    }

    /*Writes value to cookie
    * string cookieName - the cookie name,
    * string cookieValue - the cookie value*/
    var writeValueToCookie = function(cookieName, cookieValue) {
        var date = new Date();
        var expiresSec = Math.ceil(date.getTime()/1000 + (self.daysToKeep * 24 * 60 * 60));

        chrome.cookies.set({
            "name": cookieName,
            "url": cookieUrl,
            "value": cookieValue,
            "expirationDate": expiresSec
        }, function (cookie) {
            if (chrome.extension.lastError || chrome.runtime.lastError) {
                LogMsg(chrome.extension.lastError.message);
                LogMsg(chrome.runtime.lastError.message);
                return;
            }

            LogMsg(JSON.stringify(cookie));
        });
    }

    /* Searches element with name in cookies Array
    string name - the name to search for
    */
    var searchEl = function(name) {
        for (var i=0; i < self.cookieArray.length; i++) {
            if (self.cookieArray[i].name == name) {
                return self.cookieArray[i].value;
            }
        }

        return 0;
    }
}
