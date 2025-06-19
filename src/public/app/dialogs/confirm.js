const $dialog = $("#confirm-dialog");
const $confirmContent = $("#confirm-dialog-content");
const $okButton = $("#confirm-dialog-ok-button");
const $cancelButton = $("#confirm-dialog-cancel-button");
const $custom = $("#confirm-dialog-custom");

const DELETE_NOTE_BUTTON_ID = "confirm-dialog-delete-note";

let resolve;
let $originallyFocused; // element focused before the dialog was opened so we can return to it afterwards

export function confirm(message) {
    $originallyFocused = $(':focus');

    $custom.hide();

    glob.activeDialog = $dialog;

    if (typeof message === 'string') {
        message = $("<div>").text(message);
    }

    $confirmContent.empty().append(message);

    $dialog.modal();

    return new Promise((res, rej) => { resolve = res; });
}

export function confirmDeleteNoteBoxWithNote(title) {
    glob.activeDialog = $dialog;

    $confirmContent.text(`Are you sure you want to remove the note "${title}" from relation map?`);

    $custom.empty()
        .append("<br/>")
        .append($("<div>").addClass("form-check")
            .append($("<input>")
                .attr("id", DELETE_NOTE_BUTTON_ID)
                .attr("type", "checkbox")
                .addClass("form-check-input"))
            .append($("<label>")
                .attr("for", DELETE_NOTE_BUTTON_ID)
                .addClass("form-check-label")
                .attr("style", "text-decoration: underline dotted black")
                .attr("title", "If you don't check this, note will be only removed from relation map, but will stay as a note.")
                .html("Also delete note")));
    $custom.show();

    $dialog.modal();

    return new Promise((res, rej) => { resolve = res; });
}

export function isDeleteNoteChecked() {
    return $("#" + DELETE_NOTE_BUTTON_ID + ":checked").length > 0;
}

$dialog.on('shown.bs.modal', () => $okButton.trigger("focus"));

$dialog.on("hidden.bs.modal", () => {
    if (resolve) {
        resolve(false);
    }

    if ($originallyFocused) {
        $originallyFocused.trigger('focus');
        $originallyFocused = null;
    }
});

function doResolve(ret) {
    resolve(ret);
    resolve = null;

    $dialog.modal("hide");
}

$cancelButton.on('click', () => doResolve(false));
$okButton.on('click', () => doResolve(true));