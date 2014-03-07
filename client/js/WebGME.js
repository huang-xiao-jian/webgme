"use strict";

var WebGMEGlobal = { 'version': 'x',    //will be set from Node's package.json
    'SUPPORTS_TOUCH': 'ontouchstart' in window || navigator.msMaxTouchPoints }; //touch device detection}

// let require load all the toplevel needed script and call us on domReady
define(['logManager',
    'bin/getconfig',
    'text!package.json',
    'js/client',
    'js/Constants',
    'clientUtil',
    'js/Utils/GMEConcepts',
    'js/Utils/GMEVisualConcepts',
    'js/Utils/ExportManager',
    'js/Utils/ImportManager',
    'js/Utils/StateManager',
    'js/LayoutManager/LayoutManager',
    'js/Decorators/DecoratorManager',
    'js/KeyboardManager/KeyboardManager',
    'js/PanelManager/PanelManager',
    './WebGME.History',
    'js/Utils/METAAspectHelper',
    'js/Utils/PreferencesHelper',
    'js/ConstraintManager/ConstraintManager'], function (logManager,
                                            CONFIG,
                                            packagejson,
                                            Client,
                                            CONSTANTS,
                                            util,
                                            GMEConcepts,
                                            GMEVisualConcepts,
                                            ExportManager,
                                            ImportManager,
                                            StateManager,
                                            LayoutManager,
                                            DecoratorManager,
                                            KeyboardManager,
                                            PanelManager,
                                            WebGMEHistory,
                                            METAAspectHelper,
                                            PreferencesHelper,
                                            ConstraintManager) {

    var npmJSON = JSON.parse(packagejson);
    WebGMEGlobal.version = npmJSON.version;

    var _webGMEStart = function () {
        var lm,
            client,
            loadPanels,
            layoutToLoad = util.getURLParameterByName('layout') || 'DefaultLayout',
            commitToLoad = util.getURLParameterByName('commit').toLowerCase(),
            projectToLoad = util.getURLParameterByName('project'),
            objectToLoad = util.getURLParameterByName('obj').toLowerCase(),
            logger = logManager.create('WebGME'),
            selectObject;

        lm = new LayoutManager();
        lm.loadLayout(layoutToLoad, function () {
            var panels = [],
                layoutPanels = lm._currentLayout.panels,
                len = layoutPanels ? layoutPanels.length : 0,
                i;

            client = new Client(CONFIG);

            WebGMEGlobal.ConstraintManager = new ConstraintManager(client);

            WebGMEGlobal.State = StateManager.initialize();

            WebGMEHistory.initialize();

            GMEConcepts.initialize(client);
            GMEVisualConcepts.initialize(client);

            METAAspectHelper.initialize(client);
            PreferencesHelper.initialize(client);

            ExportManager.initialize(client);
            ImportManager.initialize(client);

            //hook up branch changed to set read-only mode on panels
            client.addEventListener(client.events.BRANCH_CHANGED, function (__project, branchName) {
                lm.setPanelReadOnly(client.isCommitReadOnly() || client.isProjectReadOnly());
            });
            client.addEventListener(client.events.PROJECT_OPENED, function (__project, projectName) {
                lm.setPanelReadOnly(client.isProjectReadOnly());
            });

            //on project close clear the current state
            client.addEventListener(client.events.PROJECT_CLOSED, function (__project, projectName) {
                WebGMEGlobal.State.clear();
            });

            client.decoratorManager = new DecoratorManager();

            for (i = 0; i < len; i += 1) {
                panels.push({'panel': layoutPanels[i].panel,
                    'container': layoutPanels[i].container,
                    'control': layoutPanels[i].control,
                    'params' : {'client': client}});
            }

            //load the panels
            loadPanels(panels);

            //as of now it's a global variable just to make access to it easier
            //TODO: might need to be changed
            WebGMEGlobal.KeyboardManager = KeyboardManager;
            WebGMEGlobal.KeyboardManager.setEnabled(true);
            WebGMEGlobal.PanelManager = new PanelManager();
        });

        loadPanels = function (panels) {
            var p = panels.splice(0, 1)[0];

            lm.loadPanel(p, function () {
                if (panels.length > 0) {
                    loadPanels(panels);
                } else {
                    projectToLoad = projectToLoad === "" ? CONFIG.project : projectToLoad;
                    client.connectToDatabaseAsync({'open': projectToLoad,
                                                    'project': projectToLoad}, function (err) {
                        if (err) {
                            logger.error(err);
                        } else {
                            if (commitToLoad && commitToLoad !== "") {
                                client.selectCommitAsync(commitToLoad, function (err) {
                                    if (err) {
                                        logger.error(err);
                                    } else {
                                        selectObject();
                                    }
                                });
                            } else {
                                selectObject();
                            }
                        }
                    });
                }
            });
        };

        selectObject = function () {
            if (objectToLoad && objectToLoad !== "") {
                if (objectToLoad.toLowerCase() === 'root') {
                    objectToLoad = CONSTANTS.PROJECT_ROOT_ID;
                }
                setTimeout(function () {
                    WebGMEGlobal.State.setActiveObject(objectToLoad);
                }, 1000);
            }
        };
    };

    return {
        start : _webGMEStart
    };
});