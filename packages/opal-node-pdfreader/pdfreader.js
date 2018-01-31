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
    const util = require('util');
    const check = require('check-types');
    const PDFParser = require('pdf2json');
    const pdfreader = require('pdfreader');

    /**
   * sends Error back to node-red
   * @function
   * @param {object} node - the node object returned by createNode
   * @param {object} msg - msg object passed as input to this node.
   * @param {object} err - error object.
   * @param {object} attrs - attrs to be used to construct error message.
   */
    function sendError(node, msg, err, ...attrs) {
        if (check.string(err)) {
            msg.error = {
                node: node.name,
                message: util.format(err, ...attrs),
            };
        } else if (check.instance(err, Error)) {
            msg.error = err;
        }
        node.error(node.name + ': ' + msg.error.message, msg);
    }

    /**
   * processed input data from flow, global or msg context
   * FIXME: Move this helper to a generic RED.utils like location so that
   * it can be used across nodes
   * @function
   * @param {object} node - node instance.
   * @param {object} msg - msg object passed as input to this node.
   * @param {object} varList - list of properties to be extracted.
   * @return {object} pMsg - returns a JS object
   */
    function processValuesFromContext(node, msg, varList) {
        let pMsg = {};
        Object.assign(pMsg, msg);
        varList.forEach((varItem) => {
            if (varItem.type === undefined || node[varItem.type] === undefined) {
                pMsg[varItem.name] = node[varItem.name];
            } else if (['msg', 'flow', 'global'].includes(node[varItem.type])) {
                pMsg[varItem.name] = RED.util.evaluateNodeProperty(node[varItem.name], node[varItem.type], node, msg);
                pMsg[varItem.type] = node[varItem.type];
            } else {
                pMsg[varItem.name] = node[varItem.name];
                pMsg[varItem.type] = node[varItem.type];
            }
        });
        return pMsg;
    }

    let rows = {}; // indexed by y-position
    let pdfData = {
        pages: [],
    };
    let pdfPage = {
        lines: [],
    };
    /**
     *
     *
     * @param {any} y
     */
    function collectRow(y) {
        //   console.log((rows[y] || []).join(' * '));
        pdfPage.lines.push((rows[y] || []).join(''));
    }
    /**
     *
     *
     */
    function collectRows() {
        Object.keys(rows) // => array of y-positions (type: float)
            .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
            .forEach(collectRow);
    }
    /**
    * reads a pdf from the specified location
    * @function
    * @param {object} node - the node object returned by createNode
    * @param {object} msg - msg object passed as input to this node.
    */
    function getPdfAsJson(node, msg) {
        let pdfParser = new PDFParser();

        node.log('getPdfAsJson');
        // FIXME:Cleanup
        // console.log('Before Context Processing');
        // console.log(msg);
        let msgParams = processValuesFromContext(node, msg, [
            {name: 'location', type: 'locationType'},
            {name: 'preprocess'},
        ]);


        if (msgParams.preprocess !== 'true') {
            console.log('No Preprocessing');
            pdfParser.on('pdfParser_dataError', (errData) => {
                console.log(errData);
                console.error(errData.parserError);
                sendError(node, msg, 'Could not parse pdf: %s', msgParams.location);
            });
            pdfParser.on('pdfParser_dataReady', (pdfData) => {
                // fs.writeFile("./pdf_output.json", JSON.stringify(pdfData));
                if (node.storeType === 'msg') {
                    RED.util.setMessageProperty(msg, node.store, pdfData);
                } else if (node.storeType === 'flow') {
                    node.context().flow.set(node.store, pdfData);
                } else if (node.storeType === 'global') {
                    node.context().global.set(node.store, pdfData);
                }
                msg.payload = pdfData;
                node.send(msg);
                return;
            });
            pdfParser.loadPDF(msgParams.location);
        } else {
            console.log('Preprocessing');
            // pdfreader.LOG.toggle(true); // uncomment this to get DEBUG logs
            new pdfreader.PdfReader().parseFileItems(msgParams.location, function(err, item) {
                try {
                    if (err) {
                        console.error(err);
                        sendError(node, msg, 'Could not parse pdf: %s', msgParams.location);
                    } else if (!item || item.page) {
                        // end of file, or page
                        collectRows();
                        rows = {}; // clear rows for next page
                        if (pdfPage.lines.length > 0) {
                            pdfData.pages.push(JSON.parse(JSON.stringify(pdfPage)));
                        }
                        if (item && item.page) {
                            console.log('Processing Page ', item.page);
                            pdfPage = {
                                lines: [],
                            };
                        }

                        if (!item) {
                            console.log('All Pages Done');
                            // console.log(JSON.stringify(pdfData));
                            pdfData.pages.forEach((page, pageNo) => {
                                console.log('Page ' + (pageNo + 1) + ':' + page.lines.length);
                            });
                            if (node.storeType === 'msg') {
                                RED.util.setMessageProperty(msg, node.store, pdfData);
                            } else if (node.storeType === 'flow') {
                                node.context().flow.set(node.store, pdfData);
                            } else if (node.storeType === 'global') {
                                node.context().global.set(node.store, pdfData);
                            }
                            msg.payload = pdfData;
                            node.send(msg);
                        }
                    } else if (item.text) {
                        // accumulate text items into rows object, per line
                        // console.log(item.y + ' ' + item.text);
                        (rows[item.y] = rows[item.y] || []).push(item.text);
                    }
                } catch (ex) {
                    console.error(ex);
                    sendError(node, msg, 'Could not parse pdf: %s', msgParams.location);
                }
            });
        }
    }


    /**
    * Handles the ReadPDFNode node
    * FIXME: Move this helper to a generic RED.utils like location so that
    * it can be used across nodes
    * @function
    * @param {object} params - params passed during creation.
    */
    function ReadPDFNode(params) {
        // FIXME:Cleanup
        // console.log('ReadPDFNode Called');
        let node = this;
        node.log(JSON.stringify(params));
        RED.nodes.createNode(this, params);
        this.name = params.name;
        this.location = params.location;
        this.locationType = params.locationType;
        this.preprocess = params.preprocess;
        this.store = params.store;
        this.storeType = params.storeType;
        this.waitfor = params.waitfor;

        this.on('input', function(msg) {
            if (msg.error) {
                // FIXME: Add error handling here
            } else {
                node.actionType = 'read';
                node.log('ReadPDFNode Received Input');
                // node.log(JSON.stringify(params));
                node.log(JSON.stringify(msg));
                getPdfAsJson(node, msg);
            }
        });
    }
    RED.nodes.registerType('read-pdf', ReadPDFNode);
};
