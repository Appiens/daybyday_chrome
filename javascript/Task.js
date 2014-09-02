/**
 * Created by AstafyevaLA on 29.04.2014.
 */

// keeps modifying event between popup launches
function Task(task) {
             /*name, listId, date, notes, listName, notesRows*/
       // /*    '',  null,   null, '',    null,     null*/
    this.name = task.name || '';
    this.listId = task.listId || null;
    this.listName = task.listName || null;
    this.date = task.date || null;
    this.notes = task.notes || '';
    this.notesRows = task.notesRows || null;
}
