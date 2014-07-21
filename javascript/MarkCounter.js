/**
 * Created by astafyevala on 18.07.2014.
 */

function MarkCounter(maxNumber) {
    this.MaxNumber = maxNumber;

    var cookieName = chrome.runtime.id + '_asked';
    var cookieUrl = "https://github.com/Appiens/daybyday_chrome/tralyalya"; //"http://developer.chrome.com/extensions/cookies.html";

    var offset = 10;
    var self = this;
    self.isReadOk = false;
    self.currentNumber = 0;
    self.cookieNumber = 0;

    this.readValueFromCookie = function(callback) {
        self.currentNumber = 0;
        self.cookieNumber = 0;

        chrome.cookies.get({
            "name": cookieName,
            "url": cookieUrl
        }, function (cookie) {
            if (chrome.extension.lastError || chrome.runtime.lastError) {
                LogMsg(chrome.extension.lastError.message);
                LogMsg(chrome.runtime.lastError.message);
                self.isReadOk = false;
                return;
            }

            LogMsg(JSON.stringify(cookie));

            try {
                self.currentNumber = parseInt(cookie.value);
                self.cookieNumber = self.currentNumber;
                self.isReadOk = true;
                callback();
            }
            catch(e) {
                self.isReadOk = false;
            }
        });
    }

    this.writeValueToCookie = function() {
        if (self.cookieNumber >=  this.MaxNumber + offset) {
            return;
        }

        chrome.cookies.set({
            "name": cookieName,
            "url": cookieUrl,
            "value": self.currentNumber.toString()
        }, function (cookie) {
            if (chrome.extension.lastError || chrome.runtime.lastError) {
                LogMsg(chrome.extension.lastError.message);
                LogMsg(chrome.runtime.lastError.message);
                return;
            }

            LogMsg(JSON.stringify(cookie));
        });
    }

    this.checkReadOk = function() {
        return self.isReadOk;
    }

    this.CurrentNumber = function() {
        return self.currentNumber;
    }

    this.addToCurr = function(value) {
        if (self.currentNumber <  this.MaxNumber + offset) {
             self.currentNumber += value;
        }
    }

    this.checkMaximum = function() {
        return self.currentNumber > this.MaxNumber && self.currentNumber < this.MaxNumber + offset;
    }

    this.stop = function() {
        self.currentNumber = this.MaxNumber + offset;
    }
}
