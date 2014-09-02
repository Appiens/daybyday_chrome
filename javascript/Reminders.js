/**
 * Created by AstafyevaLA on 09.07.2014.
 */

// a set of function to get names of divs, inputs etc for reminders
var RemindersLib = (function() {
    return {
        getRemindDivName: function(i) { return "div-event-remind-" + i.toString(); },
        getRemindLabelName: function(i) { return "label-event-remind-" + i.toString(); },
        getRemindComboName: function(i) { return "combo-event-remind-" + i.toString(); },
        getRemindInputName: function(i) { return "input-quantity-remind-" + i.toString();},
        getRemindMethodComboName: function(i) { return "combo-event-remind-method-" + i.toString();},
        getRemindHrefName: function(i) { return this.getRemindDivName(i) + "-close"; },
        REMINDER_MAX : 5, // maximum reminders for 1 event
        REMINDER_DEFAULT_VALUE : 10 // a value that is set to input when new reminder is added
    };})();

// keeps variants for reminder time combo
function ReminderTimeList() {
    var list = [ // k is used to make time in minutes: value * k =value_in_minutes
        "reminder_minutes$1", // in minutes k = 1
        "reminder_hours$60",
        "reminder_days$1440",  // in days k = 60 * 24
        "reminder_weeks$10080" // in weeks k = 60 * 24 * 7
    ];

    var listLocale = list.slice(0); // localized list
    listLocale.forEach(LocalizeComboOption);

    this.items =  list;
    this.itemsLocale = listLocale;

    /* returns k for an item with index i in this.items
         * int i - index */
    this.InMinutes = function(i) {
        return parseInt(GetGoogleNameByValue(list[i]));
    }
}

// keeps variants for reminder method combo
function ReminderMethodList() {
    var list =  [
        "reminder_popup$popup",
        "reminder_sms$sms",
        "reminder_email$email"
    ];

    var listLocale = list.slice(0);
    listLocale.forEach(LocalizeComboOption); // localized list

    this.items = list;
    this.itemsLocale = listLocale;

    /* items[i] is a$b this function returns b part
      * i - the entity index in items array
       * returns string all after $*/
    this.ForRequest = function(i) {
        return GetGoogleNameByValue(list[i]);
    }

    /* Returns index of item with name in items array
       string name - name to search for
    */
    this.IndexOf = function(name) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i].indexOf(name) != -1) {
                break;
            }
        }

        return (i < list.length) ? i : -1;
    }
}

// keeps variants for repetition period combo
function RepetitionPeriodList() {
    var list = [ "repetition_interval_everyday$DAILY",
        "repetition_interval_everyweek$WEEKLY",
        "repetition_interval_everymonth$MONTHLY",
        "repetition_interval_everyyear$YEARLY"];

    var listLocale = list.slice(0);
    listLocale.forEach(LocalizeComboOption); // localized list

    this.items = list;
    this.itemsLocale = listLocale;

    /* items[i] is a$b this function returns b part
     * i - the entity index in items array
     * returns string all after $*/
    this.ForRequest = function(i) {
        return GetGoogleNameByValue(list[i]);
    }

    /* Returns index of item with name in items array
     string name - name to search for
     */
    this.IndexOf = function(name) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i].indexOf(name) != -1) {
                break;
            }
        }

        return (i < list.length) ? i : -1;
    }
}

/* cuts off from arr[i] all text after TEXT_VALUE_SPLITTER and saves result to arr[i]*/
function LocalizeComboOption(item, i, arr) {
    var temp = arr[i].substring(0, arr[i].indexOf(TEXT_VALUE_SPLITTER));
    arr[i] = chrome.i18n.getMessage(temp);
}
