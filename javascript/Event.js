/**
 * Created by AstafyevaLA on 04.06.2014.
 */

function EventCal(name, listName, listId, dateStart, dateEnd, description, allDay, place, recurrenceTypeValue, reminderTimeArray) {
    this.name = name;
    this.listId = listId;
    this.listName = listName;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.description = description;
    this.allDay = allDay;
    this.place = place;
    this.recurrenceTypeValue = recurrenceTypeValue;
    this.reminderTimeArray = reminderTimeArray.slice(0);
}
