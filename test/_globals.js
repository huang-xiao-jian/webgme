/*globals require, global, module */
/* jshint node:true */

/**
 * @author kecso / https://github.com/kecso
 */

global.TESTING = true;

process.env.NODE_ENV = 'test';

//adding a local storage class to the global Namespace
var gmeConfig = require('../config'),
    getGmeConfig = function () {
        'use strict';
        // makes sure that for each request it returns with a unique object and tests will not interfere
        if (!gmeConfig) {
            // if some tests are deleting or unloading the config
            gmeConfig = require('../config');
        }
        return JSON.parse(JSON.stringify(gmeConfig));
    },
    WebGME = require('../webgme'),
    requirejs = require('requirejs'),

    Local = requirejs('storage/local'),
    Commit = requirejs('storage/commit'),
    Storage = function (options) {
        'use strict';
        return new Commit(new Local(options || {}), options || {});
    },
    Log = requirejs('../src/common/LogManager'),
    generateKey = requirejs('util/key'),

    GMEAuth = requirejs('auth/gmeauth'),
    SessionStore = requirejs('auth/sessionstore'),

    ExecutorClient = requirejs('executor/ExecutorClient'),
    BlobClient = requirejs('blob/BlobClient'),
    openContext = requirejs('common/util/opencontext'),

    should = require('chai').should(),
    expect = require('chai').expect,

    superagent = require('superagent'),
    mongodb = require('mongodb'),
    Q = require('q'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    childProcess = require('child_process')
    ;

Log.setFileLogPath('../test-tmp/testexecution.log');

//TODO globally used functions to implement
function loadJsonFile(path) {
    'use strict';
    //TODO decide if throwing an exception is fine or we should handle it
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}
function importProject(parameters, done) {
    'use strict';
    //TODO should return a result object with storage + project + core + root + commitHash + branchName objects }
    //TODO by default it should create a localStorage and put the project there

    var result = {
            storage: {},
            root: {},
            commitHash: '',
            branchName: 'master',
            project: {},
            core: {}
        },
        contextParam = {};
    /*
     parameters:
     storage - a storage object, where the project should be created (if not given and mongoUri is not defined we create a new local one and use it
     filePath - the filePath, where we can find the project
     jsonProject - already loaded project
     projectName - the name of the project
     branchName - the branch name where we should import
     -*-*-*-*-*-*-yet-to-come-*-*-*-*-*-
     mongoUri - if the storage is not given, then we will create one to this given mongoDB
     clear - if set we will first delete the whole project from the storage or drop the collection from the mongoDB
     */

    /*
     result
     storage - the opened storage object (either mongoDB or local one)
     project - the project object pointing to the created project
     core - a core object created to use the project object
     branchName - the name of the created branch
     commitHash - the hash of the final commit
     root - the loaded final root node object
     jsonProject - the loaded project
     */

    //TODO should be written in promise style
    if (!parameters.jsonProject) {
        (undefined === parameters.filePath).should.be.false;
        result.jsonProject = loadJsonFile(parameters.filePath);
    } else {
        result.jsonProject = parameters.jsonProject;
    }

    (undefined === parameters.projectName).should.be.false;

    result.branchName = parameters.branchName || 'master';

    if (parameters.storage) {
        result.storage = parameters.storage;
    } else {
        if (!parameters.mongoUri) {
            result.storage = new Storage({globConf: parameters.gmeConfig});
        }
    }

    contextParam = {
        projectName: parameters.projectName,
        overwriteProject: true,
        branchName: result.BranchName
    };

    openContext(result.storage, parameters.gmeConfig, contextParam, function (err, context) {
        if (err) {
            done(err);
            return;
        }
        result.project = context.project;
        result.core = context.core;
        result.root = context.rootNode;

        WebGME.serializer.import(result.core,
            result.root,
            result.jsonProject,
            function (err) {
                if (err) {
                    done(err);
                    return;
                }
                result.core.persist(result.root, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    result.project.makeCommit(
                        [],
                        result.core.getHash(result.root),
                        'importing project',
                        function (err, id) {
                            if (err) {
                                done(err);
                                return;
                            }
                            result.commitHash = id;
                            result.project.getBranchNames(function (err, names) {
                                var oldHash = '';
                                if (err) {
                                    done(err);
                                    return;
                                }

                                if (names && names[result.branchName]) {
                                    oldHash = names[result.branchName];
                                }
                                //TODO check the branch naming... probably need to add some layer to the local storage
                                result.project.setBranchHash(result.branchName,
                                    oldHash,
                                    result.commitHash,
                                    function (err) {
                                        done(err, result);
                                    });
                            });
                        });
                });
            });
    });
}

function saveChanges(parameters, done) {
    'use strict';
    expect(typeof parameters.project).to.equal('object');
    expect(typeof parameters.core).to.equal('object');
    expect(typeof parameters.rootNode).to.equal('object');

    parameters.core.persist(parameters.rootNode, function (err) {
        var newRootHash;
        if (err) {
            done(err);
            return;
        }

        newRootHash = parameters.core.getHash(parameters.rootNode);
        parameters.project.makeCommit([], newRootHash, 'create empty project', function (err, commitHash) {
            if (err) {
                done(err);
                return;
            }

            parameters.project.setBranchHash(parameters.branchName || 'master', '', commitHash, function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done(null, newRootHash, commitHash);
            });
        });
    });
}

function checkWholeProject(parameters, done) {
    //TODO this should export the given project and check against a file or a jsonObject to be deeply equal
}

function exportProject(parameters, done) {
    //TODO gives back a jsonObject which is the export of the project
    //should work with project object, or mongoUri as well
    //in case of mongoUri it should open the connection before and close after - or just simply use the exportCLI
}

function deleteProject(parameters, done) {
    //TODO should work with storage object and mongoUri although probably we only need to delete if we use mongo
}

function loadNodes(parameters, done) {
    //TODO loads multiple paths of the input project and returns the loaded objects
    /*
     function loadNodes(paths, next) {
     var needed = paths.length,
     nodes = {}, error = null, i,
     loadNode = function (path) {
     core.loadByPath(root, path, function (err, node) {
     error = error || err;
     nodes[path] = node;
     if (--needed === 0) {
     next(error, nodes);
     }
     })
     };
     for (i = 0; i < paths.length; i++) {
     loadNode(paths[i]);
     }
     }
     */
}

WebGME.addToRequireJsPaths(gmeConfig);

module.exports = {
    getGmeConfig: getGmeConfig,

    WebGME: WebGME,
    Storage: Storage,
    Log: Log,
    generateKey: generateKey,

    GMEAuth: GMEAuth,
    SessionStore: SessionStore,

    ExecutorClient: ExecutorClient,
    BlobClient: BlobClient,

    requirejs: requirejs,
    Q: Q,
    fs: fs,
    superagent: superagent,
    mongodb: mongodb,
    rimraf: rimraf,
    childProcess: childProcess,

    should: should,
    expect: expect,

    loadJsonFile: loadJsonFile,
    importProject: importProject,
    checkWholeProject: checkWholeProject,
    exportProject: exportProject,
    deleteProject: deleteProject,
    loadNodes: loadNodes,
    saveChanges: saveChanges,
    openContext: openContext
};