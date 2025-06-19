import utils from "./utils.js";
import dateNoteService from "./date_notes.js";
import protectedSessionHolder from './protected_session_holder.js';
import server from "./server.js";
import appContext from "./app_context.js";
import Component from "../widgets/component.js";
import toastService from "./toast.js";
import noteCreateService from "./note_create.js";
import ws from "./ws.js";
import bundleService from "./bundle.js";

export default class Entrypoints extends Component {
    constructor() {
        super();

        if (jQuery.hotkeys) {
            // hot keys are active also inside inputs and content editables
            jQuery.hotkeys.options.filterInputAcceptingElements = false;
            jQuery.hotkeys.options.filterContentEditable = false;
            jQuery.hotkeys.options.filterTextInputs = false;
        }

        $(document).on('click', "a[data-action='note-revision']", async event => {
            const linkEl = $(event.target);
            const noteId = linkEl.attr('data-note-path');
            const noteRevisionId = linkEl.attr('data-note-revision-id');

            const attributesDialog = await import("../dialogs/note_revisions.js");

            attributesDialog.showNoteRevisionsDialog(noteId, noteRevisionId);

            return false;
        });
    }

    openDevToolsCommand() {
        if (utils.isElectron()) {
            utils.dynamicRequire('@electron/remote').getCurrentWindow().toggleDevTools();
        }
    }

    async createNoteIntoInboxCommand() {
        const inboxNote = await dateNoteService.getInboxNote();

        const {note} = await server.post(`notes/${inboxNote.noteId}/children?target=into`, {
            content: '',
            type: 'text',
            isProtected: inboxNote.isProtected && protectedSessionHolder.isProtectedSessionAvailable()
        });

        await ws.waitForMaxKnownEntityChangeId();

        const hoistedNoteId = appContext.tabManager.getActiveContext()
            ? appContext.tabManager.getActiveContext().hoistedNoteId
            : 'root';

        await appContext.tabManager.openContextWithNote(note.noteId, true, null, hoistedNoteId);

        appContext.triggerEvent('focusAndSelectTitle', {isNewNote: true});
    }

    async toggleNoteHoistingCommand() {
        const noteContext = appContext.tabManager.getActiveContext();

        if (noteContext.note.noteId === noteContext.hoistedNoteId) {
            await noteContext.unhoist();
        }
        else if (noteContext.note.type !== 'search') {
            await noteContext.setHoistedNoteId(noteContext.note.noteId);
        }
    }

    async hoistNoteCommand({noteId}) {
        const noteContext = appContext.tabManager.getActiveContext();

        if (noteContext.hoistedNoteId !== noteId) {
            await noteContext.setHoistedNoteId(noteId);
        }
    }

    async unhoistCommand() {
        const activeNoteContext = appContext.tabManager.getActiveContext();

        if (activeNoteContext) {
            activeNoteContext.unhoist();
        }
    }

    copyWithoutFormattingCommand() {
        utils.copySelectionToClipboard();
    }

    toggleFullscreenCommand() {
        if (utils.isElectron()) {
            const win = utils.dynamicRequire('@electron/remote').getCurrentWindow();

            if (win.isFullScreenable()) {
                win.setFullScreen(!win.isFullScreen());
            }
        }
        else {
            // outside of electron this is handled by the browser
            this.$widget.find(".toggle-fullscreen-button").hide();
        }
    }

    reloadFrontendAppCommand() {
        utils.reloadFrontendApp();
    }

    logoutCommand() {
        const $logoutForm = $('<form action="logout" method="POST">')
            .append($(`<input type="hidden" name="_csrf" value="${glob.csrfToken}"/>`));

        $("body").append($logoutForm);
        $logoutForm.trigger('submit');
    }

    backInNoteHistoryCommand() {
        if (utils.isElectron()) {
            // standard JS version does not work completely correctly in electron
            const webContents = utils.dynamicRequire('@electron/remote').getCurrentWebContents();
            const activeIndex = parseInt(webContents.getActiveIndex());

            webContents.goToIndex(activeIndex - 1);
        }
        else {
            window.history.back();
        }
    }

    forwardInNoteHistoryCommand() {
        if (utils.isElectron()) {
            // standard JS version does not work completely correctly in electron
            const webContents = utils.dynamicRequire('@electron/remote').getCurrentWebContents();
            const activeIndex = parseInt(webContents.getActiveIndex());

            webContents.goToIndex(activeIndex + 1);
        }
        else {
            window.history.forward();
        }
    }

    async switchToDesktopVersionCommand() {
        utils.setCookie('trilium-device', 'desktop');

        utils.reloadFrontendApp("Switching to desktop version");
    }

    async switchToMobileVersionCommand() {
        utils.setCookie('trilium-device', 'mobile');

        utils.reloadFrontendApp("Switching to mobile version");
    }

    async openInWindowCommand({notePath, hoistedNoteId}) {
        if (!hoistedNoteId) {
            hoistedNoteId = 'root';
        }

        if (utils.isElectron()) {
            const {ipcRenderer} = utils.dynamicRequire('electron');

            ipcRenderer.send('create-extra-window', {notePath, hoistedNoteId});
        }
        else {
            const url = window.location.protocol + '//' + window.location.host + window.location.pathname + '?extra=1#' + notePath;

            window.open(url, '', 'width=1000,height=800');
        }
    }

    async openNewWindowCommand() {
        this.openInWindowCommand({notePath: '', hoistedNoteId: 'root'});
    }

    async runActiveNoteCommand() {
        const {ntxId, note} = appContext.tabManager.getActiveContext();

        // ctrl+enter is also used elsewhere so make sure we're running only when appropriate
        if (!note || note.type !== 'code') {
            return;
        }

        // TODO: use note.executeScript()
        if (note.mime.endsWith("env=frontend")) {
            await bundleService.getAndExecuteBundle(note.noteId);
        } else if (note.mime.endsWith("env=backend")) {
            await server.post('script/run/' + note.noteId);
        } else if (note.mime === 'text/x-sqlite;schema=trilium') {
            const resp = await server.post("sql/execute/" + note.noteId);

            if (!resp.success) {
                alert("Error occurred while executing SQL query: " + resp.message);
            }

            await appContext.triggerEvent('sqlQueryResults', {ntxId: ntxId, results: resp.results});
        }

        toastService.showMessage("Note executed");
    }

    hideAllTooltips() {
        $(".tooltip").removeClass("show");
    }

    noteSwitchedEvent() {
        this.hideAllTooltips();
    }

    activeContextChangedEvent() {
        this.hideAllTooltips();
    }
}
