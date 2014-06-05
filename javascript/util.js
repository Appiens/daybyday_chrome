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

function printCharCodes(data) {
    console.log("Printing char codes of " + data);
    for (var i = 0; i < data.length; i++) {
        console.log(data.charCodeAt(i));
    }
}

function disableButton(button) {
    button.setAttribute('disabled', 'disabled');
}

function enableButton(button) {
    button.removeAttribute('disabled');
}

function GetTimeZoneOffsetStr() {
    var d = new Date();
    var offset = d.getTimezoneOffset();
    var durationInMinutes = AddZero(parseInt(Math.abs(offset/60))) + ":" + AddZero(Math.abs(offset%60), 2);
    var sign = offset > 0?"-":"+";
    return sign + durationInMinutes;
}

function GetDateOnly(date) {
    return date.substr(0, date.indexOf('T'));
}

function GetGoogleNameByValue(value) {
    if (!value || value.indexOf(TEXT_VALUE_SPLITTER) < 0) {
        return null;
    }

    return value.substring(value.indexOf(TEXT_VALUE_SPLITTER) + 1);
}

function BuildRecurrenceRule(recurrenceTypeValue) {
    var period = GetGoogleNameByValue(recurrenceTypeValue);
    if (!period) {
        return null;
    }

    return "RRULE:FREQ=" + period;
}

function BuildReminderTimeArrayMins(reminderTimeArray) {
    var times = [];
    reminderTimeArray.forEach(function(item, i, arr) {times.push(GetGoogleNameByValue(arr[i]))});
    return times;
}

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






