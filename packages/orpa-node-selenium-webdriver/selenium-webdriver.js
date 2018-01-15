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


/**
 * TODO:
 *  - [x] Size of target select field
 *  - [x] Target cannot be renamed all the places where it is used
 *  - [x] Implement the on change of config node selection
 *  - [x] Element selector is not being saved in web-page config node
 *  - [x] Add error handling for web-page config node
 *  - [x] Url field in config node is being validated but empty is being allowed
 *  - [x] config nodes web-page with same name is beinng allowed
 *  - Multiple web applications within the same flow, handling the selenium session (driver object)
 *  - [x] Add variable support for get/set nodes
 */

module.exports = function(RED) {
    'use strict';
    let q = require('q');
    let fs = require('fs-extra');
    let util = require('util');
    let easyimg = require('easyimage');
    let VError = require('verror');
    let path = require('path');
    const webdriver = require('selenium-webdriver');
    const By = webdriver.By;
    const until = webdriver.until;
    // const Key = webdriver.Key;
    let jQueryMin;
    try {
        jQueryMin = fs.readFileSync(path.join(__dirname, 'vendor', 'jquery-3.2.1.min.js'), {encoding: 'utf8'});
    } catch (ex) {
        throw new VError(ex, 'Reading jQuery resource failed');
    }
    // FIXME: Move this helper to a generic RED.utils like location so that it can be used across nodes
    function processValuesFromContext(node, msg, varList) {
        let pMsg = {};
        Object.assign(pMsg, msg);
        varList.forEach((varItem) => {
            if (varItem.type === undefined || node[varItem.type] === undefined) {
                pMsg[varItem.name] = node[varItem.name];
            } else if (['msg', 'flow', 'global'].includes(node[varItem.type])) {
                pMsg[varItem.name] = RED.util.evaluateNodeProperty(node[varItem.name], node[varItem.type], node, msg);
                // console.log(pMsg[varItem.name]);
                pMsg[varItem.type] = node[varItem.type];
            } else {
                pMsg[varItem.name] = node[varItem.name];
                pMsg[varItem.type] = node[varItem.type];
            }
        });
        return pMsg;
    }

    function saveToFile(node, msg) {
        node.filename = msg.filename || node.filename;
        let data = msg.payload;
        if ((typeof data === 'object') && (!Buffer.isBuffer(data))) {
            data = JSON.stringify(data);
        }
        if (typeof data === 'boolean') {
            data = data.toString();
        }
        if (typeof data === 'number') {
            data = data.toString();
        }
        fs.writeFile(node.filename, data, 'utf8', function(err) {
            if (err) {
                if ((err.code === 'ENOENT') && node.createDir) {
                    fs.ensureFile(node.filename, function(err) {
                        if (err) {
                            node.error(RED._('file.errors.createfail', {
                                error: err.toString(),
                            }), msg);
                        } else {
                            fs.writeFile(node.filename, data, 'utf8', function(err) {
                                if (err) {
                                    node.error(RED._('file.errors.writefail', {
                                        error: err.toString(),
                                    }), msg);
                                }
                            });
                        }
                        node.send(msg);
                    });
                } else {
                    node.error(RED._('file.errors.writefail', {
                        error: err.toString(),
                    }), msg);
                    node.send(msg);
                }
            } else {
                node.send(msg);
            }
        });
    }

    let sessions = {
        // FIXME: Stores the session specific drivers
        // This approach needs to be re-evaluated for distrributed execution model.
    };

    function getSessionDriver(msg) {
        if (msg === undefined) {
            return sessions[0];
        }
        console.log('Session Info:');
        console.log('msg.driver %s', msg.driver ? true : false);
        console.log(msg.session);
        console.log(Object.keys(sessions));
        return (msg.driver) ? msg.driver : msg.session ? sessions[msg.session] : sessions[0];
    }

    function getPageIdentity(node) {
        if (node.pageObj === undefined) {
            return;
        }

        return {
            name: node.pageObj.name,
            url: node.pageObj.url,
            include: (node.pageObj.markers !== undefined) ? node.pageObj.markers.filter((marker) => {
                return marker.exclude == false;
            }).map((marker) => {
                return marker.expression;
            }) : [],
            exclude: (node.pageObj.markers !== undefined) ? node.pageObj.markers.filter((marker) => {
                return marker.exclude == true;
            }).map((marker) => {
                return marker.expression;
            }) : [],
        };
    }

    function navigateFramePath(node, framePath) {
        // console.log('navigateFramePath');
        // console.log('framePath %s', framePath);
        let fpSegs = framePath.split('->');
        // console.log('Before switch %j',fpSegs);
        if (fpSegs.length === 0) {
            // console.log('No more frame segments');
            return;
        }
        return node.sessionDriver.switchTo().frame(node.sessionDriver.findElement(By.xpath(fpSegs.splice(0, 1)[0]))).then(() => {
            // console.log('Switched Frame %j', fpSegs);
            if (fpSegs.length > 0) {
                return navigateFramePath(node, fpSegs.join('->'));
            }
            return true;
        });
    }

    function waitUntilElementLocated(node, msg, callback) {
        node.selector = (node.selector && node.selector != '') ? node.selector : msg.selector;
        node.target = (node.target && node.target != '') ? node.target : msg.target;
        node.timeout = (node.timeout && node.timeout != '') ? parseInt(node.timeout) : parseInt(msg.timeout);
        node.waitfor = msg.waitfor || node.waitfor;
        node.sessionDriver = getSessionDriver(msg);
        console.log('node.pageObj');
        console.log(node.pageObj);
        console.log(node.selector + ' : ' + node.target);
        node.status({});
        if (msg.refresh) {
            node.status({});
            node.send(msg);
        } else if (msg.error) {
            // node.log('MethodwaitUntilElementLocated: Unknown Error')
            node.error('MethodwaitUntilElementLocated: Unknown Error', msg);
        } else if (node.target && node.target != '') {
            try {
                node.status({
                    fill: 'blue',
                    shape: 'dot',
                    text: 'locating',
                });
                // node.log('MethodwaitUntilElementLocated: Calling SetTimeout')
                let identifyError;
                setTimeout(function() {
                    if (node.sessionDriver) {
                        // node.log('MethodwaitUntilElementLocated: Identifying')
                        node.sessionDriver.wait(() => {
                            if (node.framePath) {
                                // console.log('node.framePath %s', node.framePath);
                                return node.sessionDriver.switchTo().defaultContent().then(() => {
                                    // console.log('In default content');
                                    // console.log('Navigating Frames now');
                                    return navigateFramePath(node, node.framePath).then(() => {
                                        // console.log('Reached Leaf Frame');
                                        return identify(node.sessionDriver, getPageIdentity(node)).catch((err) => {
                                            identifyError = err;
                                            console.log(err.message);
                                            return false;
                                        });
                                    });
                                    // .catch((err)=>{
                                    //  console.log('Err2')
                                    //  console.log(err);
                                    // })
                                });
                            } else {
                                console.log('NoFramePath');
                                return node.sessionDriver.switchTo().defaultContent().then(() => {
                                    return identify(node.sessionDriver, getPageIdentity(node)).catch((err) => {
                                        identifyError = err;
                                        console.log(err.message);
                                        return false;
                                    });
                                });
                            }

                            // return identify(node.sessionDriver, getPageIdentity(node), node.timeout);
                        }, parseInt(node.timeout), 'Identify failed').catch((waitErr) => {
                            // console.log('WaitErr');
                            // console.log(waitErr);
                            // console.log(identifyError);
                            // // console.log(waitErr instanceof TimeoutError);
                            // if(waitError instanceof TimeoutError){

                            // }

                            let idError = new VError(identifyError, 'Identify Failed');
                            let waitTImeoutIdError = new VError(idError, 'Identity Wait Timed out in %s ms', node.timeout);
                            console.log(waitTImeoutIdError.message);
                            throw waitTImeoutIdError;
                        }).then((rerr, res) => {
                            node.log('Identification completed');
                            console.log('Waiting for Element %s %s in %s ms', node.selector, node.target, node.timeout);
                            // console.log(By);
                            // console.log(By[node.selector]);
                            console.log('rerr&res');
                            console.log(rerr);
                            console.log(res);
                            return node.sessionDriver.wait(until.elementLocated(By[node.selector](node.target)), node.timeout).catch(function(errorback) {
                                node.log('Error in locating element:Catch');
                                msg.error = {
                                    name: node.name,
                                    selector: node.selector,
                                    target: node.target,
                                    value: 'catch timeout after ' + node.timeout + ' seconds',
                                };
                                node.status({
                                    fill: 'red',
                                    shape: 'ring',
                                    text: 'error',
                                });
                            }).then(function() {
                                if (msg.error) {
                                    node.log('Error in locating element:Catch-then');

                                    sendErrorMsg(node, msg, 'Error in locating element:Catch-then', 'error');
                                } else {
                                    msg.element = node.sessionDriver.findElement(By[node.selector](node.target));
                                    if (typeof (callback) !== 'undefined') {
                                        // node.status({});
                                        // We are passing a promise (msg.element) here
                                        callback(msg.element);
                                    }
                                }
                            }, function(err) {
                                node.log('Error in locating element:Error Callback');
                                node.status({
                                    fill: 'red',
                                    shape: 'ring',
                                    text: 'error',
                                });
                                sendErrorMsg(node, msg, 'MethodwaitUntilElementLocated: Unknown Error Callback', 'error');
                            });
                        }).catch((err) => {
                            // console.log(Object.keys(err));
                            // console.dir(err);
                            // console.log(err.message);
                            // console.log(err.name);
                            // console.log(err.code);
                            // console.log(err.stack);
                            node.status({
                                fill: 'red',
                                shape: 'ring',
                                text: 'error',
                            });

                            let waitElmError = new VError(err, 'Element Not Found');
                            console.log(waitElmError);
                            console.log('Error locating element %j', waitElmError.message);
                            msg.error = waitElmError;
                            sendErrorMsg(node, msg, waitElmError.message, 'error');
                        });
                    } else {
                        if (typeof (callback) !== 'undefined') {
                            node.status({});
                            callback(msg.element);
                        }
                    }
                }, node.waitfor);
            } catch (ex) {
                node.log('Caught Exception');
                node.log(JSON.stringify(ex));
                node.status({
                    fill: 'red',
                    shape: 'ring',
                    text: 'exception',
                });
                sendErrorMsg(node, msg, 'MethodwaitUntilElementLocated: Unknown Error Caught', 'error');
            }
        } else {
            if (typeof (callback) !== 'undefined') {
                node.status({
                    fill: 'blue',
                    shape: 'dot',
                    text: 'delay ' + (node.waitfor / 1000).toFixed(1) + ' s',
                });
                setTimeout(function() {
                    node.status({});
                    callback(msg.element);
                }, node.waitfor);
            }
        }
    }
    function getUrlBase(url) {
        return (url.indexOf('?') !== -1) ? url.substring(0, url.indexOf('?')) : url;
    }
    function identify(driver, identity, timeout) {
        // console.log('Identification');
        // console.log(identity);

        return driver.wait(() => {
            return driver.executeScript('return document.readyState').then(function(readyState) {
                // console.log('ReadyState %s', readyState);
                return readyState === 'complete';
            });
        }, timeout).then(() => {
            return driver.executeScript('return document.location.href').then((url) => {
                if (url === undefined || url.length === 0) throw new Error('Page URL is empty');
                let lurl = getUrlBase(url);
                let lfetchUrl = getUrlBase(identity.url);
                // console.log('Checking for url');
                // console.log(lfetchUrl);
                // console.log('with');
                // console.log(url);
                if (url === identity.url || lfetchUrl === lurl || lfetchUrl.indexOf(lurl) !== -1 || lurl.indexOf(lfetchUrl) !== -1) {
                    return driver.getPageSource();
                }
                throw new VError('URL match failed: %s vs %s', url, lfetchUrl);
            }).then((html) => {
                // console.log('Got Page source');
                // console.log(html);
                let inclusionsOk = true;
                if (identity.include != undefined && identity.include instanceof Array && identity.include.length > 0) {
                    identity.include.forEach((incItem) => {
                        console.log('Checking Inclusion %s', incItem);
                        if (html.indexOf(incItem) == -1) {
                            inclusionsOk = false;
                        }
                    });
                }

                if (!inclusionsOk) {
                    throw new VError('Inclusions mismatch %j', identity.include);
                }
                let exclusionsOk = true;
                if (identity.exclude != undefined && identity.exclude instanceof Array && identity.exclude.length > 0) {
                    identity.exclude.forEach((excItem) => {
                        console.log('Checking Exclusion %s', excItem);
                        if (html.indexOf(excItem) != -1) {
                            exclusionsOk = false;
                        }
                    });
                }

                if (!exclusionsOk) {
                    throw new VError('Exclusions match %s', identity.exclude);
                }

                return driver.manage().timeouts().setScriptTimeout(5000).then(() => {
                    return driver.findElements(By.id('torpaPageID')).then((foundPageId) => {
                        if (foundPageId.length > 0) {
                            console.log('PageId available');
                            return driver.executeScript((identityInfo) => {
                                window.torpa.jq('#torpaPageID').val(identityInfo.name);
                                return true;
                            }, identity);
                        }
                        // if torpaPageId is present assume torpa jQuery instance also exists
                        return driver.executeAsyncScript((url, jqm) => {
                            // FIXME: the url parameter is unused now. Support URL based inject from CDN
                            let callback = arguments[arguments.length - 1];
                            let s = document.createElement('script');
                            s.innerText = jqm;
                            s.setAttribute('type', 'text/javascript');
                            s.setAttribute('id', 'InjectedJQ');
                            (document.getElementsByTagName('head')[0] ||
                                document.getElementsByTagName('body')[0]).appendChild(s);
                            console.log('Injected into %s', document.location.href);
                            callback('jQuery v' + window.jQuery().jquery); // FIXME:Although not async, this was added to add a way to ensure jquery load even if asynchronously in the future.
                        }, 'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js', jQueryMin).then((scriptLoaded) => {
                            console.log('JQuery %s', scriptLoaded);
                            return driver.executeScript((identityInfo) => {
                                window.torpa = {
                                    jq: jQuery.noConflict(),
                                    torpaPageID: identityInfo.name,
                                };
                                window.torpa.jq('<input>').attr('id', 'torpaPageID').attr('type', 'hidden').val(identityInfo.name).appendTo('body');
                                return true;
                            }, identity);
                        });
                    });
                }).catch((injectError) => {
                    throw new VError(injectError, 'Identity Injection on Page Failed %j', identity);
                });
                // return true;
            });
        });
    }

    function sendErrorMsg(node, msg, text, type) {
        console.log('Sending Error Message %s: %s-%s', type, text, msg);
        msg.error = {
            name: node.name,
            selector: node.selector,
            target: node.target,
            expected: (node.expected && node.expected != '') ? node.expected : msg.expected,
            value: text,
        };
        node.status({
            fill: 'red',
            shape: 'ring',
            text: type || 'unknown',
        });
        node.error(text, msg);
    };

    function identifyPage(node, msg) {
        try {
            node.sessionDriver.wait(() => {
                return identify(node.sessionDriver, getPageIdentity(node), node.timeout);
            }, node.timeout, 'Identify failed').then(function(identified) {
                console.log('Identified Page');
                if (!identified) {
                    node.send([undefined, msg]);
                } else if (!msg.error) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'Found',
                    });
                    delete msg.error;
                    node.send([msg]);
                }
            }).catch(function(errorback) {
                console.log(errorback);
                node.status({
                    fill: 'green',
                    shape: 'ring',
                    text: 'Not Found',
                });
                delete msg.error;
                node.send([undefined, msg]);
                // sendErrorMsg(node, msg, 'Not Found', "error");
            });
        } catch (ex) {
            sendErrorMsg(node, msg, ex.message, 'error');
            // node.send(msg);
        }
    };

    function getValueNode(node, msg) {
        try {
            msg.element.getAttribute('value').then(function(text) {
                if (node.storeType === 'msg') {
                    RED.util.setMessageProperty(msg, node.store, text);
                } else if (node.storeType === 'flow') {
                    node.context().flow.set(node.store, text);
                } else if (node.storeType === 'global') {
                    node.context().global.set(node.store, text);
                }
                msg.payload = text;
                let expected = (node.expected && node.expected != '') ? node.expected : msg.expected;
                if (expected && expected != '' && expected != text) {
                    sendErrorMsg(node, msg, text, 'unexpected');
                } else if (!msg.error) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'passed',
                    });
                    delete msg.error;
                    if (msg.filename && node.savetofile) {
                        saveToFile(node, msg);
                    } else {
                        node.send(msg);
                    }
                }
            }).catch(function(errorback) {
                console.log(errorback);
                sendErrorMsg(node, msg, errorback.message, 'error');
            });
        } catch (ex) {
            node.send(msg);
        }
    };

    function getAttributeNode(node, msg) {
        try {
            msg.element.getAttribute(node.attribute).then(function(text) {
                if (node.storeType === 'msg') {
                    RED.util.setMessageProperty(msg, node.store, text);
                } else if (node.storeType === 'flow') {
                    node.context().flow.set(node.store, text);
                } else if (node.storeType === 'global') {
                    node.context().global.set(node.store, text);
                }
                msg.payload = text;
                let expected = (node.expected && node.expected != '') ? node.expected : msg.expected;
                if (expected && expected != '' && expected != text) {
                    sendErrorMsg(node, msg, text, 'unexpected');
                } else if (!msg.error) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'passed',
                    });
                    delete msg.error;
                    if (msg.filename && node.savetofile) {
                        saveToFile(node, msg);
                    } else {
                        node.send(msg);
                    }
                }
            }).catch(function(errorback) {
                sendErrorMsg(node, msg, errorback.message, 'error');
            });
        } catch (ex) {
            node.send(msg);
        }
    };

    function getTextNode(node, msg) {
        try {
            console.log('getTextNode');
            msg.element.getText().then(function(text) {
                // console.log('Got Text: %s', text);
                // console.log(node.store);
                // console.log(node.storeType);
                if (node.storeType === 'msg') {
                    RED.util.setMessageProperty(msg, node.store, text);
                } else if (node.storeType === 'flow') {
                    node.context().flow.set(node.store, text);
                } else if (node.storeType === 'global') {
                    node.context().global.set(node.store, text);
                }
                msg.payload = text;
                let expected = (node.expected && node.expected != '') ? node.expected : msg.expected;
                if (expected && expected != '' && expected != text) {
                    sendErrorMsg(node, msg, text, 'unexpected');
                } else if (!msg.error) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'passed',
                    });
                    delete msg.error;
                    if (msg.filename && node.savetofile) {
                        saveToFile(node, msg);
                    } else {
                        node.send(msg);
                    }
                }
            }).catch(function(errorback) {
                console.log(errorback);
                sendErrorMsg(node, msg, errorback.message, 'error');
            });
        } catch (ex) {
            node.send(msg);
        }
    };

    function setValueNode(node, msg, callback) {
        node.log('SetValue Called');
        try {
            let value = msg.value;
            node.sessionDriver.executeScript('arguments[0].setAttribute(\'value\', \'' + value + '\')', msg.element).then(function() {
                if (!msg.error) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'done',
                    });
                    delete msg.error;
                    node.send(msg);
                }
            }).catch(function(errorback) {
                node.log('Sending SesendErrorMsgtValue Error');
                sendErrorMsg(node, msg, errorback.message, 'error');
            });
        } catch (ex) {
            node.send(msg);
        }
    };

    function clickOnNode(node, msg) {
        try {
            msg.element.click().then(function() {
                if (!msg.error) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'done',
                    });
                    delete msg.error;
                    node.send(msg);
                }
            }).catch(function(errorback) {
                sendErrorMsg(node, msg, errorback.message, 'error');
            });
        } catch (ex) {
            node.send(msg);
        }
    }

    function sendKeysNode(node, msg) {
        try {
            let value = msg.value;
            console.log('Sending keys %s', value);
            if (value.indexOf('Key.') != -1) {
                value = value.split(',').map((token) => {
                    // FIXME: Check against webdriver list .. do not eval any passed in value.
                    return eval(token);
                });
            }
            if (node.repeat > 1) {
                let valArr = [];
                for (let q = 0; q < node.repeat; q++) {
                    if (Array.isArray(value)) {
                        valArr = valArr.concat(value);
                    } else {
                        valArr.push(value);
                    }
                }
                value = valArr;
            } else {
                value = Array.isArray(value) ? value : [value];
            }
            console.log('After Evaluating Key %s', value.join(''));
            if (node.clearval) {
                msg.element.clear().then(function() {
                    msg.element.sendKeys(...value).then(function() {
                        if (!msg.error) {
                            node.status({
                                fill: 'green',
                                shape: 'ring',
                                text: 'done',
                            });
                            delete msg.error;
                            node.send(msg);
                        }
                    }).catch(function(errorback) {
                        sendErrorMsg(node, msg, errorback.message, 'error');
                    });
                }).catch(function(errorback) {
                    sendErrorMsg(node, msg, errorback.message, 'error');
                });
            } else {
                msg.element.sendKeys(...value).then(function() {
                    if (!msg.error) {
                        node.status({
                            fill: 'green',
                            shape: 'ring',
                            text: 'done',
                        });
                        delete msg.error;
                        node.send(msg);
                    }
                }).catch(function(errorback) {
                    sendErrorMsg(node, msg, errorback.message, 'error');
                });
            }
        } catch (ex) {
            console.log('Error');
            console.log(ex);
            node.send(msg);
        }
    };
    let tryCatchWrap = 'try{%s}catch(err){console.error(err);arguments[arguments.length-1](err);return err;}';
    function runScriptNode(node, msg) {
        try {
            // FIXME: Needs to have access to variables from global and flow context and probably JQuery as well
            let flowContext = {};
            node.context().flow.keys().forEach((key, index) => {
                flowContext[key] = node.context().flow.get(key);
            });
            // console.log('Flow Context ready. Starting Execution')
            node.sessionDriver.manage().timeouts().setScriptTimeout(parseInt(node.timeout)).then(() => {
                return node.sessionDriver.executeAsyncScript(util.format(tryCatchWrap, node.func), msg.element, msg, flowContext).then(function(results) {
                    console.log('Execution complete');
                    console.log('results %s', arguments.length);
                    console.log(results);
                    if (!msg.error) {
                        node.status({
                            fill: 'green',
                            shape: 'ring',
                            text: 'done',
                        });
                        delete msg.error;
                        /**
                         * FIXME: Sending msg back from within the evaluated csript caused an issue.
                         * The second invocation of executeScript just hung. Need to investigate. Now sending just DONE.
                         */
                        // msg.payload = 'DONE'
                        // results;
                        console.log('msg');
                        console.log(msg);
                        msg.payload = {data: {}};
                        if (!!results.payload && !!results.payload.data) {
                            Object.assign(msg.payload.data, results.payload.data);
                        }
                        node.send(msg);
                    }
                    // callback('Done Execution Callback');
                }).catch(function(errorbackInner) {
                    console.log('Async Script Error');
                    console.log(errorbackInner);
                    sendErrorMsg(node, msg, errorbackInner.message, 'error');
                });
            }).then((isDone) => {
                console.log('WExecution complete');
                console.log(isDone);
            })
                .catch(function(errorback) {
                    console.log('Evaluation Failed');
                    console.log(errorback);
                    sendErrorMsg(node, msg, errorback.message, 'error');
                });
        } catch (ex) {
            console.log('Script error in Invocation');
            console.log(ex);
            node.send(msg);
        }
    }

    function takeScreenShotNode(node, msg) {
        node.filename = msg.filename || node.filename;
        let cropInFile = function(size, location, srcFile) {
            if (typeof (easyimg) !== 'undefined') {
                easyimg.crop({
                    src: srcFile,
                    dst: srcFile,
                    cropwidth: size.width,
                    cropheight: size.height,
                    x: location.x,
                    y: location.y,
                    gravity: 'North-West',
                }, function(err, stdout, stderr) {
                    if (err) {
                        throw err;
                    }
                });
            }
        };
        try {
            msg.element.getSize().then(function(size) {
                msg.element.getLocation().then(function(location) {
                    node.sessionDriver.takeScreenshot().then(function(base64PNG) {
                        if (node.filename.length == 0) {
                            msg.payload = base64PNG;
                            node.status({
                                fill: 'green',
                                shape: 'ring',
                                text: 'done',
                            });
                            delete msg.error;
                            node.send(msg);
                        } else {
                            let base64Data = base64PNG.replace(/^data:image\/png;base64,/, '');
                            fs.writeFile(node.filename, base64Data, 'base64', function(err) {
                                if (err) {
                                    sendErrorMsg(node, msg, err.message, 'error');
                                } else {
                                    cropInFile(size, location, node.filename);
                                }
                                if (!msg.error) {
                                    node.status({
                                        fill: 'green',
                                        shape: 'ring',
                                        text: 'done',
                                    });
                                    delete msg.error;
                                    node.send(msg);
                                }
                            });
                        }
                    }).catch(function(errorback) {
                        sendErrorMsg(node, msg, errorback.message, 'error');
                    });
                }).catch(function(errorback) {
                    sendErrorMsg(node, msg, errorback.message, 'error');
                });
            }).catch(function(errorback) {
                sendErrorMsg(node, msg, errorback.message, 'error');
            });
        } catch (ex) {
            node.send(msg);
        }
    };

    function getAbsoluteXPath(driver, element) {
        return driver.executeScript('function absoluteXPath(element) {' + 'var comp, comps = [];' + 'var parent = null;' + 'var xpath = \'\';' + 'var getPos = function(element) {' + 'var position = 1, curNode;' + 'if (element.nodeType == Node.ATTRIBUTE_NODE) {' + 'return null;' + '}' + 'for (curNode = element.previousSibling; curNode; curNode = curNode.previousSibling){' + 'if (curNode.nodeName == element.nodeName) {' + '++position;' + '}' + '}' + 'return position;' + '};' + 'if (element instanceof Document) {' + 'return \'/\';' + '}' + 'for (; element && !(element instanceof Document); element = element.nodeType == Node.ATTRIBUTE_NODE ? element.ownerElement : element.parentNode) {' + 'comp = comps[comps.length] = {};' + 'switch (element.nodeType) {' + 'case Node.TEXT_NODE:' + 'comp.name = \'text()\';' + 'break;' + 'case Node.ATTRIBUTE_NODE:' + 'comp.name = \'@\' + element.nodeName;' + 'break;' + 'case Node.PROCESSING_INSTRUCTION_NODE:' + 'comp.name = \'processing-instruction()\';' + 'break;' + 'case Node.COMMENT_NODE:' + 'comp.name = \'comment()\';' + 'break;' + 'case Node.ELEMENT_NODE:' + 'comp.name = element.nodeName;' + 'break;' + '}' + 'comp.position = getPos(element);' + '}' + 'for (var i = comps.length - 1; i >= 0; i--) {' + 'comp = comps[i];' + 'xpath += \'/\' + comp.name.toLowerCase();' + 'if (comp.position !== null) {' + 'xpath += \'[\' + comp.position + \']\';' + '}' + '}' + 'return xpath;' + '} return absoluteXPath(arguments[0]);', element);
    }

    function SeleniumOpenURLNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.page = n.page;
        this.browser = n.browser;
        // this.weburl = n.weburl;
        // this.width = n.width;
        // this.height = n.height;
        // this.webtitle = n.webtitle;
        this.timeout = n.timeout;
        this.maximized = n.maximized;
        this.pageObj = RED.nodes.getNode(this.page);
        // console.log(this.pageObj);
        let node = this;

        node.driver = new webdriver.Builder().forBrowser(node.browser);


        this.on('input', function(msg) {
            console.log(' idontExist.iwillcrash();');
            setTimeout(() => {
                idontExist.iwillcrash();
            }, 2000);
            if (msg.topic == 'RESET') {
                msg.refresh = true;
                node.status({});
                node.send(msg);
            } else {
                function setWindowSize(driver, title) {
                    // msgx.driver = driver;
                    msg.session = node.session;
                    msg.payload = title;
                    node.send(msg);
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'connected',
                    });
                }

                let driver = node.driver.build();
                node.session = RED.util.generateId();
                sessions[node.session] = driver;
                sessions[0] = driver;
                driver.get(node.pageObj.url);
                if (node.pageObj.url) {
                    console.log('Page Defined');
                    driver.wait(until.urlContains(node.pageObj.url), parseInt(node.timeout)).catch(function(errorback) {
                        node.status({
                            fill: 'yellow',
                            shape: 'ring',
                            text: 'unexpected',
                        });
                    }).then(function() {
                        // FIXME: Line below crashes when window is close during automation
                        driver.getTitle().then(function(title) {
                            setWindowSize(driver, title);
                        });
                    });
                    // .then(function () {
                    //  console.log('Node Send EMpty Called');
                    //  //node.send();
                    // });
                } else {
                    // FIXME: Behaviour when page definition is not used. Needs to be tested. How session handled here?
                    msg.driver = driver;
                    node.send(msg);
                    // setWindowSize(driver);
                }
                // }
                // , function(error) {
                //  node.status({
                //      fill : "red",
                //      shape : "ring",
                //      text : "disconnected"
                //  });
                // });
            }
        });
        this.on('close', function() {
            if (node.serverObj) {
                node.serverObj.deregister();
            }
        });
    }


    RED.nodes.registerType('open-web', SeleniumOpenURLNode);

    function SeleniumCloseBrowserNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.waitfor = n.waitfor || 0;
        let node = this;
        this.on('input', function(msg) {
            node.sessionDriver = getSessionDriver(msg);
            if (msg.refresh) {
                msg.refresh = false;
                node.status({});
                node.send(msg);
            } else {
                setTimeout(function() {
                    node.sessionDriver.quit();
                    node.send(msg);
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'closed',
                    });
                }, node.waitfor);
            }
        });
    }


    RED.nodes.registerType('close-web', SeleniumCloseBrowserNode);

    function SeleniumFindElementNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        let node = this;

        this.on('input', function(msg) {
            console.log('Target is %s', n.target);
            console.log('TargetObj is %j', node.targetObj);
            console.log(msg);
            console.log(node);
            waitUntilElementLocated(node, msg, function(element) {
                node.status({
                    fill: 'green',
                    shape: 'ring',
                    text: 'found',
                });
                node.send(msg);
            });
        });
    }


    RED.nodes.registerType('find-object', SeleniumFindElementNode);

    function SeleniumSendKeysNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.value = n.text;
        this.text = n.text;
        this.textType = n.textType;
        this.repeat = (n.repeat && n.repeat) ? parseInt(n.repeat) : undefined;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.timeout = n.timeout;
        this.waitfor = n.waitfor;
        this.clearval = n.clearval;
        let node = this;
        this.on('input', function(msg) {
            let msgParams = processValuesFromContext(node, msg, [
                {name: 'text', type: 'textType'},
            ]);
            msg.value = msgParams.text;
            waitUntilElementLocated(node, msg, function(element) {
                sendKeysNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('send-keys', SeleniumSendKeysNode);

    function SeleniumClickOnNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        this.clickon = n.clickon;
        let node = this;
        this.on('input', function(msg) {
            waitUntilElementLocated(node, msg, function(element) {
                if (node.clickon) {
                    if (typeof (msg.payload) !== 'undefined') {
                        node.___msgs = msg;
                        node.status({
                            fill: 'blue',
                            shape: 'dot',
                            text: 'click on',
                        });
                    } else {
                        msg = node.___msgs;
                        if (typeof (msg) !== 'undefined') {
                            clickOnNode(node, msg);
                            delete node.___msgs;
                        }
                    }
                } else {
                    clickOnNode(node, msg);
                }
            });
        });
    }


    RED.nodes.registerType('click-on', SeleniumClickOnNode);

    function SeleniumSetValueNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.value = n.text;
        this.text = n.text;
        this.textType = n.textType;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            let msgParams = processValuesFromContext(node, msg, [
                {name: 'text', type: 'textType'},
            ]);
            msg.value = msgParams.text;
            waitUntilElementLocated(node, msg, function(element) {
                node.log('Element Found');
                setValueNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('set-value', SeleniumSetValueNode);

    function SeleniumToFileNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.filename = n.filename;
        this.filenameType = n.filenameType;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            let msgParams = processValuesFromContext(node, msg, [
                {name: 'filename', type: 'filenameType'},
            ]);
            msg.filename = msgParams.filename;
            if (msg.refresh) {
                node.status({});
                node.send(msg);
            } else {
                saveToFile(node, msg);
            }
        });
    }


    RED.nodes.registerType('to-file', SeleniumToFileNode);

    function SeleniumIdentifyNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.expected = n.expected;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        // this.targetObj = RED.nodes.getNode(n.target);
        // this.selector = this.targetObj.selector;
        // this.target = this.targetObj.expression;
        this.waitfor = n.waitfor;
        let node = this;

        this.on('input', function(msg) {
            // waitUntilElementLocated(node, msg, function (element) {
            node.sessionDriver = getSessionDriver(msg);
            console.log('Calling identifyPage %j', msg);
            identifyPage(node, msg);
            // });
        });
    }


    RED.nodes.registerType('identify-page', SeleniumIdentifyNode);

    function SeleniumGetValueNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.expected = n.expected;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        this.savetofile = n.savetofile;
        this.store = n.store;
        this.storeType = n.storeType;
        let node = this;

        this.on('input', function(msg) {
            // var msgParams = processValuesFromContext(node, msg, [
            //  { name: 'store', type: 'storeType' }
            // ]);
            // msg.store = msgParams.store;
            waitUntilElementLocated(node, msg, function(element) {
                getValueNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('get-value', SeleniumGetValueNode);

    function SeleniumGetAttributeNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.attribute = n.attribute;
        this.expected = n.expected;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        this.savetofile = n.savetofile;
        this.store = n.store;
        this.storeType = n.storeType;
        let node = this;

        this.on('input', function(msg) {
            // var msgParams = processValuesFromContext(node, msg, [
            //  { name: 'store', type: 'storeType' }
            // ]);
            // msg.store = msgParams.store;
            waitUntilElementLocated(node, msg, function(element) {
                getAttributeNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('get-attribute', SeleniumGetAttributeNode);

    function SeleniumGetTextNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.expected = n.expected;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        this.savetofile = n.savetofile;
        this.store = n.store;
        this.storeType = n.storeType;
        let node = this;

        this.on('input', function(msg) {
            // var msgParams = processValuesFromContext(node, msg, [
            //  { name: 'store', type: 'storeType' }
            // ]);
            // msg.store = msgParams.store;
            // console.log('Getting text');
            // console.log(msg);
            // console.log(msgParams);
            waitUntilElementLocated(node, msg, function(element) {
                getTextNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('get-text', SeleniumGetTextNode); waitUntilElementLocated;

    function SeleniumRunScriptNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.func = n.func;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            waitUntilElementLocated(node, msg, function(element) {
                console.log('Element Found');
                runScriptNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('run-script', SeleniumRunScriptNode);

    function SeleniumTakeScreenshotNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.timeout = n.timeout;
        this.page = n.page;
        this.pageObj = RED.nodes.getNode(this.page);
        this.targetObj = RED.nodes.getNode(n.target);
        this.selector = this.targetObj.selector;
        this.target = this.targetObj.expression;
        this.framePath = this.pageObj.framePath && this.pageObj.framePath != '' && this.pageObj.framePath != 'Main Frame' ? this.pageObj.framePath : undefined;
        this.framePath = this.targetObj.framePath && this.targetObj.framePath != '' && this.targetObj.framePath != 'Main Frame' ? this.targetObj.framePath : this.framePath;
        this.waitfor = n.waitfor;
        this.filename = n.filename;
        this.filenameType = n.filenameType;
        let node = this;
        this.on('input', function(msg) {
            let msgParams = processValuesFromContext(node, msg, [
                {name: 'filename', type: 'filenameType'},
            ]);
            msg.filename = msgParams.filename;
            waitUntilElementLocated(node, msg, function(element) {
                takeScreenShotNode(node, msg);
            });
        });
    }


    RED.nodes.registerType('screenshot', SeleniumTakeScreenshotNode);

    function SeleniumNavToNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.url = n.url;
        this.urlType = n.urlType;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            node.sessionDriver = getSessionDriver(msg);
            if (msg.refresh) {
                node.status({});
                node.send(msg);
            } else if (node.sessionDriver) {
                setTimeout(function() {
                    let msgParams = processValuesFromContext(node, msg, [
                        {name: 'url', type: 'urlType'},
                    ]);
                    msg.url = msgParams.url;
                    node.sessionDriver.navigate().to(msg.url).then(function() {
                        node.send(msg);
                    });
                }, node.waitfor);
            }
        });
    }


    RED.nodes.registerType('nav-to', SeleniumNavToNode);

    function SeleniumNavBackNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            node.sessionDriver = getSessionDriver(msg);
            if (msg.refresh) {
                node.status({});
                node.send(msg);
            } else if (node.sessionDriver) {
                setTimeout(function() {
                    node.sessionDriver.navigate().back().then(function() {
                        node.send(msg);
                    });
                }, node.waitfor);
            }
        });
    }


    RED.nodes.registerType('nav-back', SeleniumNavBackNode);

    function SeleniumNavForwardNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            node.sessionDriver = getSessionDriver(msg);
            if (msg.refresh) {
                node.status({});
                node.send(msg);
            } else if (node.sessionDriver) {
                setTimeout(function() {
                    node.sessionDriver.navigate().forward().then(function() {
                        node.send(msg);
                    });
                }, node.waitfor);
            }
        });
    }


    RED.nodes.registerType('nav-forward', SeleniumNavForwardNode);

    function SeleniumNavRefreshNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.waitfor = n.waitfor;
        let node = this;
        this.on('input', function(msg) {
            node.sessionDriver = getSessionDriver(msg);
            if (msg.refresh) {
                node.status({});
                node.send(msg);
            } else if (node.sessionDriver) {
                setTimeout(function() {
                    node.sessionDriver.navigate().refresh().then(function() {
                        node.send(msg);
                    });
                }, node.waitfor);
            }
        });
    }


    RED.nodes.registerType('nav-refresh', SeleniumNavRefreshNode);

    RED.httpAdmin.post('/onclick/:id', RED.auth.needsPermission('inject.write'), function(req, res) {
        let node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                node.receive({
                    waitfor: 1,
                });
                res.sendStatus(200);
            } catch (err) {
                res.sendStatus(500);
                node.error(RED._('inject.failed', {
                    error: err.toString(),
                }));
            }
        } else {
            res.sendStatus(404);
        }
    });
};
