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
    // const verror = require('verror');
    // Database related plugins
    const mysql = require('mysql');
    // let ___msgs = {};

    // function dateNum(v, date1904) {
    //     if (date1904) v += 1462;
    //     let epoch = Date.parse(v);
    //     return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    // }

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
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {object} connObject __DOCSPLACEHOLDER__
     * @param {object} ssl __DOCSPLACEHOLDER__
     * @param {object} _callback __DOCSPLACEHOLDER__
     * @return {object} connection
     */
    function connectToDB(connObject, ssl, _callback) {
        let connection;
        let sslObject;
        let connectionObject;
        if (ssl == true) {
            sslObject = {
                ca: fs.readFileSync(connObject.certificatePath),
            };
        }
        console.log('Setting connection params');
        if (connObject.dbtype === 'mysql') {
            if (ssl == true) {
                connectionObject = {
                    host: connObject.server,
                    port: connObject.port,
                    user: connObject.username,
                    password: connObject.password,
                    database: connObject.database,
                    connectTimeout: connObject.connTimeout,
                    ssl: sslObject,
                };
            } else {
                connectionObject = {
                    host: connObject.server,
                    port: connObject.port,
                    user: connObject.username,
                    password: connObject.password,
                    database: connObject.database,
                    connectTimeout: connObject.timeout,
                };
            }

            console.log('After initializing params for connection');
            // check if db connection string is provided
            if (checkTypes.assigned(connObject.connectionString)) {
                connection = mysql.createConnection(connectString);
            } else {
                connection = mysql.createConnection(connectionObject);
            }
            console.log('Calling connection connect');
            connection.connect(function(err) {
                _callback(err, connection);
                return connection;
            });
            return connection;
        } else {
            // TBD: Add implementation for handling other types of database and drivers.
            console.log('Invalid Database Type');
            return 0;
        }
    }

    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {object} node __DOCSPLACEHOLDER__
     * @param {object} params __DOCSPLACEHOLDER__
     * @param {object} msg __DOCSPLACEHOLDER__
     */
    function processDBNode(node, params, msg) {
        try {
            console.log('Starting mysql process');
            console.log('');
            if (params.dbtype == 'mysql') {
                let ssl;
                if (checkTypes.assigned(params.ssl)) {
                    ssl = params.ssl;
                } else {
                    ssl = false;
                }

                // Connection string
                console.log('Starting connection string');
                let connectionString;
                if (checkTypes.assigned(params.connectionString)) {
                    connectionString = params.connectionString;
                } else {
                    // Server and DB details check
                    console.log('checking server and database details');
                    let server;
                    let database;
                    if (checkTypes.assigned(params.server) && checkTypes.assigned(params.database)) {
                        server = params.server;
                        database = params.database;
                    } else {
                        let errInvalidDB = 'Insufficient database server details';
                        // util.format("Invalid Sheet %s in  Workbook %s", params.sheet, params.location);
                        msg.error = getError(node, errInvalidDB);
                        node.error(errInvalidDB, msg);
                        return;
                    }


                    let port;
                    if (checkTypes.assigned(params.port)) {
                        port = params.port;
                    } else {
                        port = '3306';
                    }
                }
                // Username and  Password details check
                console.log('check credentials details');
                let username;
                let password;
                if (checkTypes.assigned(params.username) && checkTypes.assigned(params.password)) {
                    username = params.username;
                    password = params.password;
                } else {
                    let errInvalidDB = 'Insufficient database credential details';
                    // util.format("Invalid Sheet %s in  Workbook %s", params.sheet, params.location);
                    msg.error = getError(node, errInvalidDB);
                    node.error(errInvalidDB, msg);
                    return;
                }
                // Getting query details
                let query;
                if (checkTypes.assigned(params.query)) {
                    query = params.query;
                } else {
                    let errInvalidDB = 'Invalid query string';
                    // util.format("Invalid Sheet %s in  Workbook %s", params.sheet, params.location);
                    msg.error = getError(node, errInvalidDB);
                    node.error(errInvalidDB, msg);
                    return;
                }
                console.log('checking connection timeout');
                let connTimeout;
                if (checkTypes.assigned(params.timeout)) {
                    connTimeout = params.timeout;
                } else {
                    connTimeout = 5000;
                }
                console.log('creating connection');

                connectToDB(params, ssl, function(err, connection) {
                    let _connection = null;
                    if (err) {
                        let errInvalidDB = util.format('Error while connecting to database - %s', err);
                        msg.error = getError(node, errInvalidDB);
                        node.error(errInvalidDB, msg.error);
                        return;
                    }
                    if (connection != undefined) {
                        _connection = connection;
                    }


                    if (_connection === undefined) {
                        let errInvalidDB = util.format('Unable to get a connection to database');
                        msg.error = getError(node, errInvalidDB);
                        node.error(errInvalidDB, msg);
                        return;
                    } else {
                        console.log('Database Connection Successful');
                        console.log('Executing mysql query.');
                        _connection.query(query, function(err, result) {
                            if (err) {
                                _connection.end();
                                let errInvalidDB = util.format('Error while executing query - %s', err);
                                msg.error = getError(node, errInvalidDB);
                                node.error(errInvalidDB, msg);
                                return;
                            }
                            console.log(JSON.stringify(result));
                            _connection.end();
                            msg.payload = result;
                            node.send(msg);
                            return;
                        });
                    }
                });
            } else {
                let errInvalidDB = util.format('Sorry. We do not support other database types.');
                msg.error = getError(node, errInvalidDB);
                node.error(errInvalidDB, msg);
                return;
            }
        } catch (error) {
            // var errMissingRegion = util.format("Required parameter region [%s] is invalid", params.region);
            node.log('Error in ProcessDBNode');
            node.log(JSON.stringify(error));
            msg.error = error;
            node.error(JSON.stringify(error), msg);
            return;
        }
    }

    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {object} node __DOCSPLACEHOLDER__
     * @param {object} msg __DOCSPLACEHOLDER__
     * @param {object} varList __DOCSPLACEHOLDER__
     * @return {object} pMsg
     */
    function processValuesFromContext(node, msg, varList) {
        let pMsg = {};
        Object.assign(pMsg, msg);
        varList.forEach((varItem) => {
            if (varItem.type === undefined || node[varItem.type] === undefined) {
                pMsg[varItem.name] = node[varItem.name];
            } else if (node[varItem.type] === 'flow' || node[varItem.type] === 'global') {
                pMsg[varItem.name] = RED.util.evaluateNodeProperty(node[varItem.name], node[varItem.type], node, msg);
                pMsg[varItem.type] = node[varItem.type];
            } else {
                pMsg[varItem.name] = node[varItem.name];
                pMsg[varItem.type] = node[varItem.type];
            }
        });
        return pMsg;
    }
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {object} params __DOCSPLACEHOLDER__
     */
    function QueryDBRead(params) {
        RED.nodes.createNode(this, params);
        this.name = params.name;
        this.waitfor = params.waitfor;
        let node = this;
        this.on('input', function(msg) {
            if (msg.error) {
                // FIXME: Add error handling here
            } else {
                params.actionType = 'read';
                node.log('QueryDBNode');
                node.log(JSON.stringify(params));
                // node.log(JSON.stringify(msg));
                processDBNode(node, params, msg);
            }
        });
    }
    RED.nodes.registerType('querydb-read', QueryDBRead);
};
