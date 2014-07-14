/**
 * Created by AstafyevaLA on 09.07.2014.
 */

var RemindersLib = (function() {
    return {
        getRemindDivName: function(i) { return "div-event-remind-" + i.toString(); },
        getRemindLabelName: function(i) { return "label-event-remind-" + i.toString(); },
        getRemindComboName: function(i) { return "combo-event-remind-" + i.toString(); },
        getRemindInputName: function(i) { return "input-quantity-remind-" + i.toString();},
        getRemindMethodComboName: function(i) { return "combo-event-remind-method-" + i.toString();},
        getRemindHrefName: function(i) { return this.getRemindDivName(i) + "-close"; },
        REMINDER_MAX : 5,
        REMINDER_DEFAULT_VALUE : 10
    };})();

function ReminderTimeList() {
    var list = [
        "reminder_minutes$1",
        "reminder_hours$60",
        "reminder_days$1440",
        "reminder_weeks$10080"
    ];

    var listLocale = list.slice(0);
    listLocale.forEach(LocalizeComboOption);

    this.items =  list;
    this.itemsLocale = listLocale;
    this.InMinutes = function(i) {
        return parseInt(GetGoogleNameByValue(list[i]));
    }
}

function ReminderMethodList() {
    var list =  [
        "reminder_popup$popup",
        "reminder_sms$sms",
        "reminder_email$email"
    ];

    var listLocale = list.slice(0);
    listLocale.forEach(LocalizeComboOption);

    this.items = list;
    this.itemsLocale = listLocale;
    this.ForRequest = function(i) {
        return GetGoogleNameByValue(list[i]);
    }

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

function RepetitionPeriodList() {
    var list = [ "repetition_interval_everyday$DAILY",
        "repetition_interval_everyweek$WEEKLY",
        "repetition_interval_everymonth$MONTHLY",
        "repetition_interval_everyyear$YEARLY"];

    var listLocale = list.slice(0);
    listLocale.forEach(LocalizeComboOption);

    this.items = list;
    this.itemsLocale = listLocale;

    this.ForRequest = function(i) {
        return GetGoogleNameByValue(list[i]);
    }


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
