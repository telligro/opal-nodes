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
    const xlsx = require('xlsx');
    const moment = require('moment');


    /**
    * opens a workbook from the specified location
    * @function
    * @param {object} node - the node object returned by createNode
    * @param {object} msg - msg object passed as input to this node.
    * @param {boolean} create - specifies if a new book should be created
    * @return {object} workbook - returns a workbook
    */
    function openOrCreateWorkbook(node, msg, create) {
        let workbook; let type;
        type = msg.type === undefined ? 'file' : msg.type;
        if (check.assigned(msg.location)) {
            const args = {
                type: type,
                cellFormula: true,
                cellHTML: true,
                cellStyles: true,
                cellNF: true,
                bookDeps: true,
                bookFiles: true,
                bookVBA: true,
                sheetStubs: true,
            };

            try {
                workbook = xlsx.readFileSync(msg.location, args);
            } catch (ex) {
                if (create) {
                    workbook = new Workbook();
                    let wsName = msg.sheet || 'Sheet1';
                    let contents = xlsx.utils.aoa_to_sheet([[]]);
                    workbook.SheetNames.push(wsName);
                    workbook.Sheets[wsName] = contents;
                } else {
                    node.debug('Error opening file ' + msg.location);
                    node.debug(ex);
                }
            }
        } else {
            node.debug('Error: Invalid location ' + msg.location);
        }
        return workbook;
    }

    /**
    * reads a specified rows from an opened workbook
    * @function
    * @param {object} ws - worksheet.
    * @param {object} rows - rows to be fetched.
    * @param {{asis: bool,
    *   useLabel: boolean,
    *   header: string,
    *   removeEmpty:boolean}} opts - options for processing the read request
    * @return {object} contentsJson - returns the fetched content as a JSON
    */
    function readRows(ws, rows, opts) {
        let contents = {};
        if (typeof rows === 'string') {
            rows = rows.split(',');
        }
        opts = (opts === undefined) ? {} : opts;
        // console.log('Typeof Rows %s', typeof rows);
        // console.log('Typeof Rows %s', rows);
        // console.log('Length Rows %d', rows.length);
        let dRange = xlsx.utils.decode_range(ws['!ref']);
        for (let i = 0; i < rows.length; ++i) {
            // console.log('rows[%d]=%s', i, rows[i]);
            let dRow = xlsx.utils.decode_row(rows[i]);
            for (let C = dRange.s.c; C <= dRange.e.c; ++C) {
                let encCell = xlsx.utils.encode_cell({c: C, r: dRow});
                contents[encCell] = ws[encCell] || {};
            }
        }
        contents['!ref'] = ws['!ref'];

        if (opts.asis) {
            return contents;
        }

        Object.assign(opts, {
            header: 1,
            raw: true,
            blankrows: true,
        });

        opts.header = opts.useLabel ? 'A' : opts.header;

        let contentsJson = xlsx.utils.sheet_to_json(contents, opts);

        if (opts.removeEmpty) {
            contentsJson = contentsJson.filter((row) => {
                // console.log(typeof row);
                return check.object(row) ?
                    check.nonEmptyObject(row) : check.nonEmptyArray(row);
            });
        }

        return contentsJson;
    }

    /**
    * reads a specified cols from an opened workbook
    * @function
    * @param {object} ws - worksheet.
    * @param {object} cols - cols to be fetched.
    * @param {{asis: bool,
    *   useLabel: boolean,
    *   header: string,
    *   removeEmpty:boolean}} opts - options for processing the read request
    * @return {object} contentsJson - returns the fetched content as a JSON
    */
    function readCols(ws, cols, opts) {
        // console.log('Reading cols ' + cols.length);
        // console.log(cols);
        let contents = {};
        if (typeof cols === 'string') {
            cols = cols.split(',');
        }
        opts = (opts === undefined) ? {} : opts;
        let dRange = xlsx.utils.decode_range(ws['!ref']);
        for (let i = 0; i < cols.length; ++i) {
            // console.log('Reading col:' + cols[i]);
            let dCol = xlsx.utils.decode_col(cols[i]);
            for (let R = dRange.s.r; R <= dRange.e.r; ++R) {
                // console.log('Reading cell:' + cols[i] + ', ' + R);
                let encCell = xlsx.utils.encode_cell({c: dCol, r: R});
                contents[encCell] = ws[encCell] || {};
                // console.log('Done cell:' + cols[i] + ', ' + R + ', ' + JSON.stringify(contents[encCell]));
            }
        }
        contents['!ref'] = ws['!ref'];

        if (opts.asis) {
            return contents;
        }

        Object.assign(opts, {
            header: 1,
            raw: true,
            blankrows: true,
        });


        opts.header = opts.useLabel ? 'A' : opts.header;


        let contentsJson = xlsx.utils.sheet_to_json(contents, opts);

        if (opts.removeEmpty) {
            contentsJson = contentsJson.filter((col) => {
                // console.log(typeof col);
                return check.object(col) ? check.nonEmptyObject(col) : check.nonEmptyArray(col);
            });
        }
        return contentsJson;
    }

    /**
    * reads a specified region from an opened workbook
    * @function
    * @param {object} ws - worksheet.
    * @param {object} range - rows to be fetched.
    * @param {{asis: bool,
    *   useLabel: boolean,
    *   header: string,
    *   removeEmpty:boolean}} opts - options for processing the read request
    * @return {object} contentsJson - returns the fetched content as a JSON
    */
    function readRegion(ws, range, opts) {
        let contents = {};
        opts = (opts === undefined) ? {} : opts;
        // console.log('Xref:%s', ws['!ref']);
        let dORange = xlsx.utils.decode_range(ws['!ref']);
        let dRange = xlsx.utils.decode_range(range);

        // Support for cols only ranges like !A:A,!A:C
        dRange.s.r = (isNaN(dRange.s.r)) ? dORange.s.r : dRange.s.r;
        dRange.e.r = (isNaN(dRange.e.r)) ? dORange.e.r : dRange.e.r;

        // Single for row only ranges like !1:1, !1:3
        dRange.s.c = (dRange.s.c === -1) ? dORange.s.c : dRange.s.c;
        dRange.e.c = (dRange.e.c === -1) ? dORange.e.c : dRange.e.c;

        for (let R = dRange.s.r; R <= dRange.e.r; ++R) {
            for (let C = dRange.s.c; C <= dRange.e.c; ++C) {
                let cellref = xlsx.utils.encode_cell({c: C, r: R});
                contents[cellref] = ws[cellref] || {};
            }
        }
        // console.log(JSON.stringify(dRange));
        contents['!ref'] = xlsx.utils.encode_range(dRange);

        if (opts.asis) {
            return contents;
        }

        Object.assign(opts, {
            header: 1,
            raw: true,
            blankrows: true,
        });

        opts.header = opts.useLabel ? 'A' : opts.header;

        let contentsJson = xlsx.utils.sheet_to_json(contents, opts);

        if (opts.removeEmpty) {
            contentsJson = contentsJson.filter((row) => {
                // console.log(typeof row);
                return check.object(row) ?
                    check.nonEmptyObject(row) : check.nonEmptyArray(row);
            });
        }
        return contentsJson;
    }

    /**
    * writes a specified region to an opened workbook
    * @function
    * @param {object} ws - worksheet.
    * @param {object} urange - range where contents are written
    * @param {boolean} contents - contents that are to written to specified range
    * @return {object} ws - returns the modified worksheet
    */
    function writeRegion(ws, urange, contents) {
        let range = ws['!ref'];
        range = check.undefined(range) ? 'A1:A1' : range;
        let dRange = xlsx.utils.decode_range(range);
        let dUrange = xlsx.utils.decode_range(urange);
        let newRef = {s: {c: 0, r: 0}, e: {c: dRange.e.c, r: dRange.e.r}};
        let encCell;

        for (let R = dUrange.s.r, i = 0; R <= dUrange.e.r; ++R, ++i) {
            let cellVal = contents[i];
            if (R > newRef.e.r) {
                newRef.e.r = R;
            }

            for (let C = dUrange.s.c, j = 0; C <= dUrange.e.c; ++C, ++j) {
                encCell = xlsx.utils.encode_cell({c: C, r: R});

                if (C > newRef.e.c) {
                    newRef.e.c = C;
                }
                ws[encCell] = updateCellData(ws[encCell], cellVal[j]);
            }
        }
        ws['!ref'] = xlsx.utils.encode_range(newRef);
        return ws;
    }

    /**
    * writes specified cols to an opened workbook
    * @function
    * @param {object} ws - worksheet.
    * @param {object} cols - cols where contents are written
    * @param {boolean} contents - contents that are to written to specified cols
    * @return {object} ws - returns the modified worksheet
    */
    function writeCols(ws, cols, contents) {
        let range = ws['!ref'];
        range = check.undefined(range) ? 'A1:A1' : range;
        let dRange = xlsx.utils.decode_range(range);
        let newRef = {s: {c: 0, r: 0}, e: {c: dRange.e.c, r: dRange.e.r}};
        let encCell;
        if (typeof cols === 'string') {
            cols = cols.split(',');
        }
        for (let i = 0; i < cols.length; ++i) {
            let dCol = xlsx.utils.decode_col(cols[i]);
            let cellVal = contents[i];
            if (dCol > newRef.e.c) {
                newRef.e.c = dCol;
            }


            for (let R = dRange.s.r; R < cellVal.length; ++R) {
                encCell = xlsx.utils.encode_cell({c: dCol, r: R});
                if (R > newRef.e.r) {
                    newRef.e.r = R;
                }

                ws[encCell] = updateCellData(ws[encCell], cellVal[R]);
            }
        }
        ws['!ref'] = xlsx.utils.encode_range(newRef);
        return ws;
    }

    /**
    * writes specified rows to an opened workbook
    * @function
    * @param {object} ws - worksheet.
    * @param {object} rows - rows where contents are written
    * @param {boolean} contents - contents that are to written to specified rows
    * @return {object} ws - returns the modified worksheet
    */
    function writeRows(ws, rows, contents) {
        // console.log('Typeof Rows %s', typeof rows);
        // console.log('Typeof Rows %s', rows);
        // console.log('Length Rows %d', rows.length);
        let range = ws['!ref'];
        range = check.undefined(range) ? 'A1:A1' : range;
        let dRange = xlsx.utils.decode_range(range);
        let newRef = {s: {c: 0, r: 0}, e: {c: dRange.e.c, r: dRange.e.r}};
        let encCell;
        if (typeof rows === 'string') {
            rows = rows.split(',');
        }
        for (let i = 0; i < rows.length; ++i) {
            let dRow = xlsx.utils.decode_row(rows[i]);
            let cellVal = contents[i];
            // console.log('contents[%d]=%s', i, cellVal);
            if (dRow > newRef.e.r) {
                newRef.e.r = dRow;
            }

            for (let C = dRange.s.c; C < cellVal.length; ++C) {
                encCell = xlsx.utils.encode_cell({c: C, r: dRow});
                if (C > newRef.e.c) {
                    newRef.e.c = C;
                }
                ws[encCell] = updateCellData(ws[encCell], cellVal[C]);
            }
        }
        ws['!ref'] = xlsx.utils.encode_range(newRef);
        return ws;
    }

    /**
    * opens a workbook from the specified location
    * @function
    * @param {object} wscell - worksheet.
    * @param {object} data - rows to be fetched.
    * @return {object} contentsJson - returns a JS object
    */
    function updateCellData(wscell, data) {
        // console.log('data %s, %s', data, typeof data);
        if (data == null) return wscell;

        let cell = {};
        Object.assign(cell, wscell);
        Object.assign(cell, {
            v: data,
            w: data,
            t: 's',
            r: '<t>' + data + '</t>',
            h: data,
        });

        if (check.number(data)) cell.t = 'n';
        else if (typeof data === 'boolean') cell.t = 'b';
        else if (check.date(data) || getMoment(data).isValid()) {
            cell.t = 'n'; cell.z = xlsx.SSF._table[14];
            // console.log(datenum(getMoment(data).toDate().toString()));
            cell.v = datenum(getMoment(data).toDate().toString());
            // FIXME:portability OSX
        }
        return cell;
    }
    let DefaultDateFormats = [
        'DD-MM-YYYY', 'DD/MM/YYYY',
        'DD.MM.YYYY', 'MMM DD, YYYY',
        'MMMDD,YYYY', 'MMMM DD YYYY',
        'MMMM DD, YYYY', 'DD MMM, YYYY',
        'DD MMM YYYY', 'DD MMMM YYYY',
        'YYYY MM DD', 'YYYY/MM/DD',
        'YYYY-MM-DD',
    ];

    /**
    * opens a workbook from the specified location
    * @function
    * @param {object} dateStr - rows to be fetched.
    * @return {object} moment - returns a JS object
    */
    function getMoment(dateStr) {
        // console.log(moment(dateStr, DefaultDateFormats, true));
        return moment(dateStr, DefaultDateFormats, true);
    }
    /**
    * opens a workbook from the specified location
    * @function
    * @param {number} v - worksheet.
    * @param {boolean} date1904 - rows to be fetched.
    * @return {object} contentsJson - returns a JS Date object
    */
    function datenum(v, date1904) {
        // console.log(v)
        if (date1904) v += 1462;
        let epoch = Date.parse(v);
        return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    }
    /**
    * workbook constructor
    * @constructor
    */
    function Workbook() {
        if (!(this instanceof Workbook)) return new Workbook();
        this.SheetNames = [];
        this.Sheets = {};
    }
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

    /**
    * Processes the Excel/Read write tasks
    * FIXME: Move this helper to a generic RED.utils like location so that
    * it can be used across nodes
    * @function
    * @param {object} node - node object.
    * @param {object} msg - msg object passed as input to this node.
    */
    function processExcelNode(node, msg) {
        node.log('ProcessExcelNode');
        // FIXME:Cleanup
        // console.log('Before Context Processing');
        // console.log(msg);
        let msgParams = processValuesFromContext(node, msg, [
            {name: 'location', type: 'locationType'},
            {name: 'sheet', type: 'sheetType'},
            {name: 'rows', type: 'rowsType'},
            {name: 'cols', type: 'colsType'},
            {name: 'region', type: 'regionType'},
            {name: 'store', type: 'storeType'},
            {name: 'name'}, {name: 'mode'}, {name: 'asis'},
            {name: 'asjson'}, {name: 'useLabel'},
            {name: 'removeEmpty'}, {name: 'actionType'},
        ]);

        // FIXME:Cleanup
        // console.log('After Context Processing');
        // console.log(msg);
        // console.log(msgParams);

        try {
            const createWorkbook = (node.actionType == 'write');
            let workbook = openOrCreateWorkbook(node, msgParams, createWorkbook);

            if (check.not.assigned(workbook)) {
                sendError(node, msg, 'Could not open Workbook: %s', msgParams.location);
                return;
            }// Check for workbook

            if (check.assigned(msgParams.sheet)) {
                if (check.undefined(workbook.Sheets[msgParams.sheet])) {
                    node.log(workbook.SheetNames[0]);
                    node.log(JSON.stringify(workbook.Sheets));
                    sendError(node, msg, 'Missing Sheet [%s] in Workbook: %s', msgParams.sheet, msgParams.location);
                    return;
                } else {
                    // Sheet available for reading

                    let opts = {
                        asis: msgParams.asis === 'true',
                        useLabel: msgParams.useLabel === 'true',
                        removeEmpty: msgParams.removeEmpty === 'true',
                    };


                    let requiredSheet = workbook.Sheets[msgParams.sheet];
                    if (check.undefined(requiredSheet)) {
                        sendError(node, msg, 'Could not open sheet: %s', msgParams.sheet);
                        return;
                    }

                    let contents;
                    try {
                        msgParams.contents = check.string(msgParams.contents) ? JSON.parse(msgParams.contents) : msgParams.contents;
                    } catch (ex) {
                        sendError(node, msg, 'Content [%s] is invalid JSON', msgParams.contents);
                        return;
                    }

                    if (check.assigned(msgParams.mode)) {
                        if (msgParams.mode === 'rows') {
                            if (!(check.assigned(msgParams.rows))) {
                                sendError(node, msg, 'Required parameter rows [%s] is invalid', msgParams.rows);
                                return;
                            }
                            if (msgParams.actionType == 'write') {
                                contents = writeRows(requiredSheet, msgParams.rows, msgParams.contents, opts);
                            } else if (msgParams.actionType == 'read') {
                                contents = readRows(requiredSheet, msgParams.rows, opts);
                            }
                        } else if (msgParams.mode === 'cols') {
                            if (!(check.assigned(msgParams.cols))) {
                                sendError(node, msg, 'Required parameter cols [%s] is invalid', msgParams.cols);
                                return;
                            }
                            if (msgParams.actionType == 'write') {
                                contents = writeCols(requiredSheet, msgParams.cols, msgParams.contents, opts);
                            } else if (msgParams.actionType == 'read') {
                                contents = readCols(requiredSheet, msgParams.cols, opts);
                            }
                        } else if (msgParams.mode === 'region') {
                            if (!(check.assigned(msgParams.region))) {
                                sendError(node, msg, 'Required parameter region [%s] is invalid', msgParams.region);
                                return;
                            }
                            if (msgParams.actionType == 'write') {
                                contents = writeRegion(requiredSheet, msgParams.region, msgParams.contents, opts);
                            } else if (msgParams.actionType == 'read') {
                                contents = readRegion(requiredSheet, msgParams.region, opts);
                            }
                        } else {
                            contents = requiredSheet;
                        }
                        if (msgParams.actionType == 'write') {
                            workbook.Sheets[msgParams.sheet] = contents;

                            try {
                                // FIXME: portability - bookSST might be needed for OSX
                                xlsx.writeFile(workbook, msgParams.location, {bookSST: false, bookType: 'xlsx'});
                            } catch (ex) {
                                sendError(node, msg, 'Could not write workbook %s', msgParams.location);
                                return;
                            }
                        } else {
                            if (node.storeType === 'msg') {
                                RED.util.setMessageProperty(msg, node.store, contents);
                            } else if (node.storeType === 'flow') {
                                node.context().flow.set(node.store, contents);
                            } else if (node.storeType === 'global') {
                                node.context().global.set(node.store, contents);
                            }

                            msg.payload = contents;
                        }

                        node.send(msg);
                        return;
                    } else {
                        msg.payload = requiredSheet;
                        node.send(msg);
                        return;
                    }
                }
            } else {
                // FIXME: Refactor-Or-Remove
            }
        } catch (error) {
            // let errMissingRegion = util.format('Required parameter region [%s] is invalid', msg.region);
            node.log('Error in ProcessExcelNode');
            node.log(JSON.stringify(error));
            sendError(node, msg, error);
            return;
        }
    }

    /**
    * Handles the ReadExcel node
    * FIXME: Move this helper to a generic RED.utils like location so that
    * it can be used across nodes
    * @function
    * @param {object} params - params passed during creation.
    */
    function ReadExcelNode(params) {
        // FIXME:Cleanup
        // console.log('RealExcelNode Called');
        // node.log(JSON.stringify(params));
        RED.nodes.createNode(this, params);
        this.name = params.name;
        this.location = params.location;
        this.locationType = params.locationType;
        this.mode = params.mode;
        this.sheet = params.sheet;
        this.sheetType = params.sheetType;
        this.rows = params.rows;
        this.rowsType = params.rowsType;
        this.cols = params.cols;
        this.colsType = params.colsType;
        this.region = params.region;
        this.regionType = params.regionType;
        this.asjson = params.asjson;
        this.asis = params.asis;
        this.useLabel = params.useLabel;
        this.removeEmpty = params.removeEmpty;
        this.store = params.store;
        this.storeType = params.storeType;
        this.waitfor = params.waitfor;
        let node = this;
        this.on('input', function(msg) {
            if (msg.error) {
                // FIXME: Add error handling here
            } else {
                node.actionType = 'read';
                node.log('ReadExcelNode Received Input');
                // node.log(JSON.stringify(params));
                node.log(JSON.stringify(msg));
                processExcelNode(node, msg);
            }
        });
    }
    RED.nodes.registerType('read-excel', ReadExcelNode);

    /**
    * Handles the WriteExcel node
    * FIXME: Move this helper to a generic RED.utils like location so that
    * it can be used across nodes
    * @function
    * @param {object} params - params passed during creation
    */
    function WriteExcelNode(params) {
        // FIXME:Cleanup
        // console.log('WriteExcelNode Called');
        // node.log(JSON.stringify(params));
        RED.nodes.createNode(this, params);
        this.name = params.name;
        this.location = params.location;
        this.locationType = params.locationType;
        this.mode = params.mode;
        this.sheet = params.sheet;
        this.sheetType = params.sheetType;
        this.rows = params.rows;
        this.rowsType = params.rowsType;
        this.cols = params.cols;
        this.colsType = params.colsType;
        this.region = params.region;
        this.regionType = params.regionType;
        this.asjson = params.asjson;
        this.asis = params.asis;
        this.useLabel = params.useLabel;
        this.removeEmpty = params.removeEmpty;
        this.store = params.store;
        this.storeType = params.storeType;
        this.waitfor = params.waitfor;
        let node = this;
        this.on('input', function(msg) {
            if (msg.error) {
                // FIXME: Add error handling here
            } else {
                node.actionType = 'write';
                node.log('WriteExcelNode');
                node.log('WriteExcelNode Received Input');
                // node.log(JSON.stringify(params));
                processExcelNode(node, msg);
            }
        });
    }

    RED.nodes.registerType('write-excel', WriteExcelNode);
};
