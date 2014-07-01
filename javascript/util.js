/**
 * Created by AstafyevaLA on 29.04.2014.
 */


ST_REQUEST_OK = 200;
TEXT_VALUE_SPLITTER = '$';

/* string id
  returns object by its id*/
function $(id) {
    return document.getElementById(id);
};

/*
    date theDay,
    returns date as string YYYY-MM-DD
*/
function CurrDateStr(theDay) {
    var dd = theDay.getDate();
    var mm = theDay.getMonth()+1;
    var yyyy = theDay.getFullYear();

    dd = AddZero(dd);
    mm = AddZero(mm);

    theDay = yyyy + '-' + mm + '-' + dd;
    return theDay;
};

/*
   date theDay
   offset - offset in hours 0-23
   returns the Date one hour later than theDay
*/
function CurrDateStrOffset(theDay) {
    if (theDay.getHours() < 23) {
        return CurrDateStr(theDay);
    }
    else {
        return CurrDateStr(addDays(theDay, 1));
    }
}

/*
 date theDay
 offset - offset in hours 0-23
 returns the Time one hour later than theTime
 */
function CurrTimeStrOffset(theTime) {
    if (theTime.getHours() == 23) {
        return "00:00:00";
    }
    else {
        return AddZero(theTime.getHours() + 1) + ":00:00";
    }
}

/*
 date theTime,
 returns time of date as string HH:MM:SS
 */
function CurrTimeStr(theTime) {

    var hh =  theTime.getHours();
    var mm = theTime.getMinutes();
    var ss = theTime.getSeconds();

    hh = AddZero(hh);
    mm = AddZero(mm);
    ss = AddZero(ss);

    return hh + ":" + mm + ":" + ss;
};

/*
    returns current date and time as a formatted string YYYY-MM-DD HH:MM:SS
 */
function GetDateTimeStr() {
    var today = new Date();
    return CurrDateStr(today) + ' ' + CurrTimeStr(today);
};

/*
    int a,
    returns string 0a if a<10, a if a>10
*/
function AddZero(a) {
    var b = parseInt(a);
    if (b < 10) {
        return '0' + b;
    }
    else {
        return b;
    }
}

/*
    int min - min value,
    int max - max value
    returns random number between min and max
*/
function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

/*
    returns random letter between a and z as string
*/
function getRandomLetter() {
    return String.fromCharCode(getRandomNumber(97, 122));
}

/*
    returns random string of letters a-z with defined length
    int length - length of the string
 */
function getRandomString(length) {
    var i = 0;
    var s = "";
    while (i < length) {
        s+= getRandomLetter();
        i++;
    }

    return s;
}

/*
 * Substitute special chars for JSON
 * string data
 * returns string
 */
function filterSpecialChar(data) {
    if (data) {
        data = data.replace(/"/g, "\\\"");
        data = data.replace(/\n/g, "\\n");
        data = data.replace(/\//g, "\\/");
        data = data.replace(/\r/g, "\\r");
        data = data.replace(/\t/g, "\\t");
    }

    return data;
}

/*
    prints char codes of all symbols in string
    string data - string to print
 */
/*function printCharCodes(data) {
    console.log("Printing char codes of " + data);
    for (var i = 0; i < data.length; i++) {
        console.log(data.charCodeAt(i));
    }
}*/

/* make button disabled
  Button (getElementById) button*/
function disableButton(button) {
    button.setAttribute('disabled', 'disabled');
}

/* make button enabled
 Button (getElementById) button*/
function enableButton(button) {
    button.removeAttribute('disabled');
}

/*
check button is disabled */
function IsButtonDisabled(button) {
    return button.hasAttribute('disabled');
}

/*
    returns timezone offset as string
    +04:00 for example
*/
function GetTimeZoneOffsetStr() {
    var d = new Date();
    var offset = d.getTimezoneOffset();
    var durationInMinutes = AddZero(parseInt(Math.abs(offset/60))) + ":" + AddZero(Math.abs(offset%60), 2);
    var sign = offset > 0?"-":"+";
    return sign + durationInMinutes;
}

/*
    Returns date part from string 2014-06-16T10:00:00
    string date
*/

function GetDateOnly(date) {
    return date.substr(0, date.indexOf('T'));
}

/*
    Returns right part of string left_part$right_part, $ - TEXT_VALUE_SPLITTER
    string value
    returns string right_part
*/
function GetGoogleNameByValue(value) {
    if (!value || value.indexOf(TEXT_VALUE_SPLITTER) < 0) {
        return null;
    }

    return value.substring(value.indexOf(TEXT_VALUE_SPLITTER) + 1);
}

/*
    Builds recurrence rule for periods - DAILY, MONTHLY etc
    returns string attribute for request
 */
function BuildRecurrenceRule(recurrenceTypeValue) {
    var period = GetGoogleNameByValue(recurrenceTypeValue);
    if (!period) {
        return null;
    }

    return "RRULE:FREQ=" + period;
}

/*
    Gives times array from reminderTimearray
    reminderTimeArray - array of strings from reminderPeriods
    returns array - array of right parts of reminderPeriods as strings
 */
function BuildReminderTimeArrayMins(reminderTimeArray) {
    var times = [];
    reminderTimeArray.forEach(function(item, i, arr) {times.push(GetGoogleNameByValue(arr[i]))});
    return times;
}

/*
    Fills combo with values from array from
    Combo combo - (got with getelementById)
    array[string] arrayFrom - array of strings to add as combo values
*/
function FillCombo(combo, arrayFrom) {
    var x = combo;

    // clears options
    x.options.length = 0;

    for (var i = arrayFrom.length - 1; i >= 0; i--)
    {
        var option = document.createElement("option");
        option.text = arrayFrom[i];
        x.add(option,x[0]);
    }
}

/*
 Adds days to a date
 string date YYYY-MM-DD HH:MM:SS,
 int days
 returns date as date
 */
function addDays(date, days) {
    var d2 = new Date(date);
    d2.setDate(d2.getDate() + days);
    return d2;
}

/*
 Adds minutes to a date
 string date YYYY-MM-DD HH:MM:SS,
 int hours
 returns date as date
 */
function addHours(date, hours){
    var d2 = new Date(date);
    d2.setHours(d2.getHours() + hours);
    return d2;
}

/*
    Adds minutes to a date
    string date YYYY-MM-DD HH:MM:SS,
    int minutes
    returns date as date
 */
function addMinutes(date, minutes) {
    var d2 = new Date(date);
    d2.setMinutes(d2.getMinutes() + minutes);
    return d2;
}

/*
    returns difference between first and second date in days
    string first YYYY-MM-DD,
    string second YYYY-MM-DD
*/
function daydiff(first, second) {
    return (new Date(second)- new Date(first))/(1000*60*60*24);
}


/*
    returns difference between first and second times in minutes
    string first as HH:MM
    string second as HH:MM
*/
function timeDiff(first, second) {
    var firstDate = new Date(2014, 6, 10, parseInt(first.split(':')[0]), parseInt(first.split(':')[1]));
    var secondDate = new Date(2014, 6, 10, parseInt(second.split(':')[0]), parseInt(second.split(':')[1]));
    return (secondDate.getHours() - firstDate.getHours())*60 + (secondDate.getMinutes() - firstDate.getMinutes());
}








