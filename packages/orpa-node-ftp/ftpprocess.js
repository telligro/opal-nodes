/**
 *  Copyright Telligro Pte Ltd 2017
 *
 *  This file is part of OPAL.
 *
 *  OPAL is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  OPAL is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OPAL.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = function(RED) {
    'use strict';

    // Also load any other dependencies you have
    const util = require('util');
    const fs = require('fs-extra');
    const checkTypes = require('check-types');
    const FtpClient = require('ftp');


    let ___msgs = {};

    // TODO: handle error formatting as well in one place.
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {object} node __DOCSPLACEHOLDER__
     * @param {object} errorMsg __DOCSPLACEHOLDER__
     * @return {object} errorObject
     */
    function getError(node, errorMsg) {
        return {
            node: node.name,
            value: errorMsg,
        };
    }


    // function sendError(node, msg, err, ...attrs) {
    //     if (check.string(err)) {
    //         msg.error = {
    //             node: node.name,
    //             message: util.format(err, ...attrs),
    //         };
    //     } else if (check.instance(err, Error)) {
    //         msg.error = err;
    //     }
    //     node.error(node.name + ': ' + msg.error.message, msg);
    // }

    let connectToFTP = function(params) {
        // TBD : Need to implement secure FTP connection
        let args;
        let client = new FtpClient();
        let secure;
        let connTimeout;
        let pasvTimeout;
        let keepalive;

        if (checkTypes.assigned(params.secure)) {
            secure = params.secure;
        } else {
            secure = false;
        }
        if (checkTypes.assigned(params.connTimeout)) {
            connTimeout = params.connTimeout;
        } else {
            connTimeout = 10000;
        }
        if (checkTypes.assigned(params.pasvTimeout)) {
            pasvTimeout = params.pasvTimeout;
        } else {
            pasvTimeout = 10000;
        }
        if (checkTypes.assigned(params.keepalive)) {
            keepalive = params.keepalive;
        } else {
            keepalive = 10000;
        }

        if (params.mode === 'READ') {
            args = {
                user: params.user,
                password: params.password,
                host: params.host,
                port: params.port,
                connTimeout: connTimeout,
                pasvTimeout: pasvTimeout,
                keepalive: keepalive,
            };

            return new Promise((resolve, reject) => {
                client.connect(args);
                client.on('ready', function() {
                    client.get(params.filename, function(err, stream) {
                        if (err) {
                            reject(new Error('Error during connecting to server'));
                        }

                        console.log('Destination : ' + params.location + params.filename);
                        stream.once('close', function() {
client.end();
});
                        stream.pipe(fs.createWriteStream(params.location + params.filename));
                        resolve('success');
                    });
                });

                client.on('close', function(msg) {
                    console.log('Close called.');
                });
                client.on('end', function() {
                    console.log('End called.');
                });
                client.on('error', function(err) {
                    reject(new Error('Error during download file - ' + err));
                });
                client.on('greeting', function(msg) {
                    console.log('Greeting  ' + msg);
                });
            });
        } else if (params.mode === 'WRITE') {
            args = {
                user: params.user,
                password: params.password,
                host: params.host,
                port: params.port,
                connTimeout: connTimeout,
                pasvTimeout: pasvTimeout,
                keepalive: keepalive,
            };

            return new Promise((resolve, reject) => {
                client.connect(args);
                client.on('ready', function() {
                    if (!params.append) {
                        client.put(params.filename, params.remoteLocation, function(err, stream) {
                            if (err) {
                                reject(new Error('Error during connecting to server' + err));
                            }

                            client.end();
                            resolve('success');
                        });
                    } else {
                        client.append(params.filename, params.remoteLocation, function(err, stream) {
                            if (err) {
                                reject(new Error('Error during connecting to server' + err));
                            }

                            client.end();
                            resolve('success');
                        });
                    }
                });

                client.on('close', function(msg) {
                    console.log('on log - ' + msg);
                });
                client.on('end', function() {
                    console.log('On end.');
                });
                client.on('error', function(err) {
                    reject(new Error('Error during uploading file to server ' + err));
                });
                client.on('greeting', function(msg) {
                    console.log(msg);
                });
            });
        } else {
            console.log('Invalid FTP mode');
            return 0;
        }
    };
/**
 * __DOCSPLACEHOLDER__
 *
 * @param {any} node __DOCSPLACEHOLDER__
 * @param {any} msgParams __DOCSPLACEHOLDER__
 * @param {any} msg __DOCSPLACEHOLDER__
 */
function processFTPNode(node, msgParams, msg) {
        console.log('Processing Node .......... ');
        console.log(JSON.stringify(node));
        let params = processValuesFromContext(node, msgParams, msg, [
            {name: 'host', type: 'hostType'},
            {name: 'port', type: 'portType'},
            {name: 'filename', type: 'filenameType'},
            {name: 'location', type: 'locationType'},
            {name: 'remoteLocation', type: 'remoteLocationType'},
            {name: 'user', type: 'userType'},
            {name: 'password', type: 'passwordType'},
        ]);

        console.log('After assigning..');
        console.log(JSON.stringify(params));


        if (params.mode == 'READ') { // GET file
            if (!(checkTypes.assigned(params.location))) {
                let errInvalid = util.format('Invalid file or location for download');
                msg.error = getError(node, errInvalid);
                node.error(errInvalid, msg);
                return;
            }


            connectToFTP(params).then(function(value) {
                // console.log(value);
                msg.payload = JSON.stringify(value); ;
                node.send(msg);
                return;
            }).catch(function(e) {
                let errInvalid = util.format('Error while executing FTP read request - %s', e.message);
                msg.error = getError(node, errInvalid);
                node.error(errInvalid, msg);
                return;
            });
        } else if (params.mode == 'WRITE') { // Upload File
            if (!(checkTypes.assigned(params.remoteLocation))) {
                let errInvalid = util.format('Invalid remote location for upload');
                msg.error = getError(node, errInvalid);
                node.error(errInvalid, msg);
                return;
            }
            if (!(checkTypes.assigned(params.append))) {
                params.append = false;
            }

            connectToFTP(params).then(function(value) {
                // console.log(value);
                msg.payload = JSON.stringify(value); ;
                node.send(msg);
                return;
            }).catch(function(e) {
                // console.log(e);
                let errInvalid = util.format('Error while executing POST request - %s', e.message);
                msg.error = getError(node, errInvalid);
                node.error(errInvalid, msg);
                return;
            });
        }
    }


    // TODO: Move this helper to a generic RED.utils like location so that it can be used across nodes
/**
 * __DOCSPLACEHOLDER__
 *
 * @param {any} node __DOCSPLACEHOLDER__
 * @param {any} params __DOCSPLACEHOLDER__
 * @param {any} msg __DOCSPLACEHOLDER__
 * @param {any} varList __DOCSPLACEHOLDER__
 * @return {object} pMsg __DOCSPLACEHOLDER__
 */
function processValuesFromContext(node, params, msg, varList) {
        let pMsg = {};
        Object.assign(pMsg, params);
        varList.forEach((varItem) => {
            if (varItem.type === undefined || params[varItem.type] === undefined) {
                pMsg[varItem.name] = params[varItem.name];
            } else if (params[varItem.type] === 'flow' || params[varItem.type] === 'global') {
                pMsg[varItem.name] = RED.util.evaluateNodeProperty(params[varItem.name], params[varItem.type], node, msg);
                pMsg[varItem.type] = params[varItem.type];
            } else {
                pMsg[varItem.name] = params[varItem.name];
                pMsg[varItem.type] = params[varItem.type];
            }
        });
        return pMsg;
    }
/**
 * FTPProcess Constructor
 *
 * @param {object} params
 */
function FTPProcess(params) {
        RED.nodes.createNode(this, params);
        this.name = params.name;
        this.waitfor = params.waitfor;
        /* this.host = params.host;
        this.hostType = params.hostType;
        this.port = params.port;
        this.portType = params.portType;
        this.filename = params.filename;
        this.filenameType = params.filenameType;
        this.location = params.location;
        this.locationType = params.locationType;
        this.remoteLocation = params.remoteLocation;
        this.remoteLocationType = params.remoteLocationType;
        this.user= params.user;
        this.userType = params.userType;
        this.password = params.password;
        this.passwordType = params.passwordType;*/
        let node = this;
        this.on('input', function(msg) {
            if (msg.error) {
                // FIXME: Add error handling here
            } else {
                params.actionType = 'read';
                console.log('FTPProcess params .....');
                console.log(JSON.stringify(params));
                processFTPNode(node, params, msg);
            }
        });
    }
    RED.nodes.registerType('ftp-service', FTPProcess);
};
