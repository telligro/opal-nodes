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
  // const fs = require('fs-extra');
  // const checkTypes = require('check-types');
  const soap = require('strong-soap').soap;


  // let ___msgs = {};

  // function dateNum(v, date1904) {
  //   if (date1904) v += 1462;
  //   let epoch = Date.parse(v);
  //   return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
  // }

  // TODO: handle error formatting as well in one place.
  /**
   * creates error object
   *
   * @param {any} node
   * @param {any} errorMsg
   * @return {object} ErrorObject
   */
  function getError(node, errorMsg) {
    return {
      node: node.name,
      value: errorMsg,
    };
  }


  // TODO: Move this helper to a generic RED.utils like location so that it can be used across nodes
  /**
   * __DOCSPLACEHOLDER__
   *
   * @param {any} node
   * @param {any} params
   * @param {any} msg
   * @param {any} varList
   * @return {object} pMsg
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
 * __DOCSPLACEHOLDER__
 *
 * @param {any} node __DOCSPLACEHOLDER__
 * @param {any} msgParams __DOCSPLACEHOLDER__
 * @param {any} msg __DOCSPLACEHOLDER__
 */
function processSOAPNode(node, msgParams, msg) {
    // Handle simple generic SOAP. TBD: Handle multiple types of SOAP security and other params
    // TBD: Test Security features
    // TBD: Implement soap listen

    let options = {};
    console.log('Processing Node .......... ');
    console.log(JSON.stringify(node));
    let params = processValuesFromContext(node, msgParams, msg, [
      {name: 'url', type: 'urlType'},
      {name: 'method', type: 'methodType'},
      {name: 'parameters', type: 'parametersType'},
      {name: 'headers', type: 'headersType'},
    ]);
    console.log(params);


    soap.createClient(params.url, options, function(err, client) {
      if (err) {
        let errInvalidSOAP = util.format('Error while creating soap client - %s', err);
        msg.error = getError(node, errInvalidSOAP);
        node.error(errInvalidSOAP, msg);
        return;
      }
      try {
        let method = eval('client' + params.method);
        // let method = client['GetHolidaysAvailable'];
        // let requestArgs = {"countryCode": "UnitedStates"};
        method(params.parameters, function(err, result, envelope, soapHeader) {
          if (err) {
            let errInvalidSOAP = util.format('Error while calling soap service - %s', err);
            msg.error = getError(node, errInvalidSOAP);
            node.error(errInvalidSOAP, msg);
            return;
          }
          // response envelope
          console.log('Response Envelope: \n' + envelope);
          // 'result' is the response body
          console.log('Result: \n' + JSON.stringify(result));
          console.log(JSON.stringify(result));
          msg.payload = JSON.stringify(result);
          node.send(msg);
          return;
        });
      } catch (error) {
        let errInvalidSOAP = util.format('Error while calling soap service - %s', error);
        msg.error = getError(node, errInvalidSOAP);
        node.error(errInvalidSOAP, msg);
        return;
      }
    });
  }
/**
 * SOAPProcess constructor
 *
 * @param {any} params __DOCSPLACEHOLDER__
 */
function SOAPProcess(params) {
    RED.nodes.createNode(this, params);
    this.name = params.name;
    this.waitfor = params.waitfor;
    let node = this;
    this.on('input', function(msg) {
      if (msg.error) {
        // FIXME: Add error handling here
      } else {
        params.actionType = 'read';
        node.log('SOAPProcess');
        node.log(JSON.stringify(params));
        // node.log(JSON.stringify(msg));
        processSOAPNode(node, params, msg);
      }
    });
  }
  RED.nodes.registerType('soap-service', SOAPProcess);
};
