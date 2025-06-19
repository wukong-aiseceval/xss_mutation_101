import utils from "./services/utils.js";
import macInit from './services/mac_init.js';

macInit.init();

function SetupModel() {
    if (syncInProgress) {
        setInterval(checkOutstandingSyncs, 1000);
    }

    const serverAddress = location.protocol + '//' + location.host;

    $("#current-host").html(serverAddress);

    this.step = ko.observable(syncInProgress ? "sync-in-progress" : "setup-type");
    this.setupType = ko.observable();

    this.setupNewDocument = ko.observable(false);
    this.setupSyncFromDesktop = ko.observable(false);
    this.setupSyncFromServer = ko.observable(false);

    this.syncServerHost = ko.observable();
    this.syncProxy = ko.observable();
    this.password = ko.observable();

    this.setupTypeSelected = () => !!this.setupType();

    this.selectSetupType = () => {
        if (this.setupType() === 'new-document') {
            this.step('new-document-in-progress');

            $.post('api/setup/new-document').then(() => {
                window.location.replace("./setup");
            });
        }
        else {
            this.step(this.setupType());
        }
    };

    this.back = () => {
        this.step("setup-type");

        this.setupType("");
    };

    this.finish = async () => {
        const syncServerHost = this.syncServerHost();
        const syncProxy = this.syncProxy();
        const password = this.password();

        if (!syncServerHost) {
            showAlert("Trilium server address can't be empty");
            return;
        }

        if (!password) {
            showAlert("Password can't be empty");
            return;
        }

        // not using server.js because it loads too many dependencies
        const resp = await $.post('api/setup/sync-from-server', {
            syncServerHost: syncServerHost,
            syncProxy: syncProxy,
            password: password
        });

        if (resp.result === 'success') {
            this.step('sync-in-progress');

            setInterval(checkOutstandingSyncs, 1000);

            hideAlert();
        }
        else {
            showAlert('Sync setup failed: ' + resp.error);
        }
    };
}

async function checkOutstandingSyncs() {
    const { outstandingPullCount, initialized } = await $.get('api/sync/stats');

    if (initialized) {
        if (utils.isElectron()) {
            const remote = utils.dynamicRequire('@electron/remote');
            remote.app.relaunch();
            remote.app.exit(0);
        }
        else {
            utils.reloadFrontendApp();
        }
    }
    else {
        $("#outstanding-syncs").html(outstandingPullCount);
    }
}

function showAlert(message) {
    $("#alert").html(message);
    $("#alert").show();
}

function hideAlert() {
    $("#alert").hide();
}

ko.applyBindings(new SetupModel(), document.getElementById('setup-dialog'));

$("#setup-dialog").show();
