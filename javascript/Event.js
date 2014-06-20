/**
 * Created by AstafyevaLA on 04.06.2014.
 */

function EventCal(name, listName, listId, dateStart, dateEnd, timeStart, timeEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray, reminderMethodArray) {
    this.name = name;
    this.listId = listId;
    this.listName = listName;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.timeStart = timeStart;
    this.timeEnd = timeEnd;
    this.description = description;
    this.allDay = allDay;
    this.place = place;
    this.recurrenceTypeValue = recurrenceTypeValue;
    this.reminderTimeArray = reminderTimeArray.slice(0);
    this.reminderMethodArray = reminderMethodArray.slice(0);
}
