/**
 * Created by AstafyevaLA on 04.06.2014.
 */

// keeps modifying event between popup launches
function EventCal( myEvent) {
    this.name = myEvent.name || "";
    this.listId = myEvent.listId || null;
    this.timeZone  = myEvent.timeZone || null;
    this.dateStart = myEvent.dateStart || null;
    this.dateEnd = myEvent.dateEnd || null;
    this.timeStart =  myEvent.timeStart || null;
    this.timeEnd = myEvent.timeEnd || null;
    this.description = myEvent.description || "";
    this.allDay =  myEvent.allDay || false;
    this.place = myEvent.place || "";
    this.recurrenceTypeValue = myEvent.recurrenceTypeValue || null;
    this.reminderTimeArray = myEvent.reminderTimeArray ? myEvent.reminderTimeArray.slice(0) : [];
    this.reminderMethodArray = myEvent.reminderMethodArray ? myEvent.reminderMethodArray.slice(0) : [];
}
