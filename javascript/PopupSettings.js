/**
 * Created by AstafyevaLA on 11.06.2014.
 */

// saving settings of popup win after it closes
function PopupSettings(lastState, lastTab) {

    // keeps popup window state after it closes
    this.lastState = lastState;

    // keeps popup last selected tab after it closes
    this.lastTab = lastTab;

    // date & time when popup was closed
    var startKeepingTime = null;

    // time (mins) to keep field values (task and event)
    var TIME_TO_KEEP_SAVED_VALS = 15;

    // task edit fields` values are kept here when popup closes (if null - nothing was saved and all fields should have values by default)
    var taskInProcess = null;

    // event edit fields` values are kept here when popup closes (if null - nothing was saved and all fields should have values by default)
    var eventInProcess = null;

    // returns true if keeping time is over
    this.CheckKeepingTimeOver = function() {
        if (startKeepingTime == null) {
            return false;
        }

        var now = new Date();

        return ((now - startKeepingTime ) / (1000*60)) > TIME_TO_KEEP_SAVED_VALS;
    }

    // sets start keeping time
    this.SetStartKeepingTime = function() {
        startKeepingTime = new Date();
    }

    // clears saved task
    this.ClearSavedTask = function() {
        taskInProcess = null;
    }

    // clears saved event
    this.ClearSavedEvent = function() {
        eventInProcess = null;
    }

    // checks if we have some saved fields` values for task
    this.SavedTaskExists = function() {
        return taskInProcess != null;
    }

    // checks if we have some saved fields` values for event
    this.SavedEventExists = function() {
        return eventInProcess != null;
    }

    // returns taskInProcess if it exists
    // creates and returns it otherwise
    this.GetSavedTask = function() {
        if (taskInProcess == null) {
            taskInProcess = new Task('', null, null, '', null);
        }

        return taskInProcess;
    }

    // returns eventInProcess if it exists
    // creates and returns it otherwise
    this.GetSavedEvent = function() {
        if (eventInProcess == null) {
            eventInProcess = new EventCal('', null, null, null, null, null, null, '', false, '', null, []);
        }

        return eventInProcess;
    }
}
