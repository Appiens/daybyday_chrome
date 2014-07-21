/**
 * Created by astafyevala on 21.07.2014.
 */

function MarkCounterBool(maxNumber) {
    this.MaxNumber = maxNumber;

    var cookieDomain = "github.com";
    var cookiePath = "/Appiens/daybyday_chrome";
    var cookieUrl = "https://"+ cookieDomain + cookiePath + "/trololo"; //"http://developer.chrome.com/extensions/cookies.html";

    var self = this;
    self.isReadOk = false;
    self.cookieArray = [];
    self.currentNumber = 0;
    self.isAsked = 0;
    self.counterName = chrome.runtime.id;
    self.isAskedName = self.counterName + "_asked";

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

    this.Save = function() {
        if (self.isAsked > 0) {
            writeValueToCookie(self.isAskedName, self.isAsked.toString());
        }
        else {
            writeValueToCookie(self.counterName, self.currentNumber.toString());
        }
    }

    this.checkReadOk = function() {
        return self.isReadOk;
    }

    this.CurrentNumber = function() {
        return self.currentNumber;
    }

    this.addToCurr = function(value) {
        self.currentNumber += value;
    }

    this.checkMaximum = function() {
        return self.currentNumber > this.MaxNumber && self.isAsked == 0;
    }

    this.stop = function() {
        self.isAsked = 1;
    }

    var writeValueToCookie = function(cookieName, cookieValue) {

        chrome.cookies.set({
            "name": cookieName,
            "url": cookieUrl,
            "value": cookieValue
        }, function (cookie) {
            if (chrome.extension.lastError || chrome.runtime.lastError) {
                LogMsg(chrome.extension.lastError.message);
                LogMsg(chrome.runtime.lastError.message);
                return;
            }

            LogMsg(JSON.stringify(cookie));
        });
    }

    var searchEl = function(name) {
        for (var i=0; i < self.cookieArray.length; i++) {
            if (self.cookieArray[i].name == name) {
                return self.cookieArray[i].value;
            }
        }

        return 0;
    }
}
