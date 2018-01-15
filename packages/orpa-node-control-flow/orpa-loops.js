/**
 *  Copyright Telligro Pte Ltd 2017
 *  Copyright JS Foundation and other contributors, http://js.foundation
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
    let operators = {
        'eq': function(a, b) {
            return a == b;
        },
        'neq': function(a, b) {
            return a != b;
        },
        'lt': function(a, b) {
            return a < b;
        },
        'lte': function(a, b) {
            return a <= b;
        },
        'gt': function(a, b) {
            return a > b;
        },
        'gte': function(a, b) {
            return a >= b;
        },
        'btwn': function(a, b, c) {
            return a >= b && a <= c;
        },
        'cont': function(a, b) {
            return (a + '').indexOf(b) != -1;
        },
        'regex': function(a, b, c, d) {
            return (a + '').match(new RegExp(b, d ? 'i' : ''));
        },
        'true': function(a) {
            return a === true;
        },
        'false': function(a) {
            return a === false;
        },
        'null': function(a) {
            return (typeof a == 'undefined' || a === null);
        },
        'nnull': function(a) {
            return (typeof a != 'undefined' && a !== null);
        },
        'else': function(a) {
            return a === true;
        },
    };

    /**
    * __DOCSPLACEHOLDER__
    * @function
    * @param {string} property - __DOCSPLACEHOLDER__
    * @param {string} type - __DOCSPLACEHOLDER__
    * @param {object} node - __DOCSPLACEHOLDER__
    * @return {object} property - __DOCSPLACEHOLDER__
    */
    function processJsonataType(property, type, node) {
        console.log('prep - p:%s, t:%s', property, type);
        if (type === 'jsonata') {
            try {
                property = RED.util.prepareJSONataExpression(property, node);
            } catch (err) {
                // this.error(RED._('switch.errors.invalid-expr', { error: err.message }));
                // throw new
                // verror(err, RED._('switch.errors.invalid-expr', { error: err.message }));
                throw RED._('loop.errors.invalid-expr', {error: err.message});
            }
        }

        return property;
    }

    /**
    * __DOCSPLACEHOLDER__
    * @function
    * @param {object} node - __DOCSPLACEHOLDER__
    * @param {object} msg - __DOCSPLACEHOLDER__
    * @param {object} param - __DOCSPLACEHOLDER__
    * @param {object} type - __DOCSPLACEHOLDER__
    * @return {object} prop - __DOCSPLACEHOLDER__
    */
    function evaluateTypedParameters(node, msg, param, type) {
        console.log('eval - p:%s, t:%s', param, type);
        let prop;
        if (type === 'jsonata') {
            prop = RED.util.evaluateJSONataExpression(param, msg);
        } else {
            prop = RED.util.evaluateNodeProperty(param, type, node, msg);
        }
        return prop;
    }

    /**
    * __DOCSPLACEHOLDER__
    * @constructor
    * @param {object} n - __DOCSPLACEHOLDER
    */
    function LoopNode(n) {
        RED.nodes.createNode(this, n);
        let node = this;
        console.log(n);
        this.rules = n.rules || [];
        this.checkall = n.checkall || 'true';
        this.previousValue = null;
        this.loopType = n.loopType;


        switch (this.loopType) {
            case 'for':
                this.forStart = n.forStart;
                this.forStartType = n.forStartType;
                this.forEnd = n.forEnd;
                this.forEndType = n.forEndType;
                this.forStep = n.forStep;
                this.forStepType = n.forStepType;
                this.forStart = processJsonataType(this.forStart, this.forStartType, node);
                this.forEnd = processJsonataType(this.forEnd, this.forEndType, node);
                this.forStep = processJsonataType(this.forStep, this.forStepType, node);
                break;
            case 'foreach':
                this.foreachCollection = n.foreachCollection;
                this.foreachCollectionType = n.foreachCollectionType;
                this.foreachCollection = processJsonataType(this.foreachCollection, this.foreachCollectionType, node);
                break;
            case 'while':
                this.property = n.property;
                this.propertyType = n.propertyType || 'msg';
                this.property = processJsonataType(this.property, this.propertyType, node);
                break;
        }

        // console.log('property %s-%j', [this.forStart,this.property)

        let valid = true;
        for (let i = 0; i < this.rules.length; i += 1) {
            let rule = this.rules[i];
            if (!rule.vt) {
                if (!isNaN(Number(rule.v))) {
                    rule.vt = 'num';
                } else {
                    rule.vt = 'str';
                }
            }
            if (rule.vt === 'num') {
                if (!isNaN(Number(rule.v))) {
                    rule.v = Number(rule.v);
                }
            } else if (rule.vt === 'jsonata') {
                try {
                    rule.v = RED.util.prepareJSONataExpression(rule.v, node);
                } catch (err) {
                    this.error(RED._('loop.errors.invalid-expr', {error: err.message}));
                    valid = false;
                }
            }
            if (typeof rule.v2 !== 'undefined') {
                if (!rule.v2t) {
                    if (!isNaN(Number(rule.v2))) {
                        rule.v2t = 'num';
                    } else {
                        rule.v2t = 'str';
                    }
                }
                if (rule.v2t === 'num') {
                    rule.v2 = Number(rule.v2);
                } else if (rule.v2t === 'jsonata') {
                    try {
                        rule.v2 = RED.util.prepareJSONataExpression(rule.v2, node);
                    } catch (err) {
                        this.error(RED._('loop.errors.invalid-expr', {error: err.message}));
                        valid = false;
                    }
                }
            }
        }

        if (!valid) {
            return;
        }

        this.on('input', function(msg) {
            let response = [];
            try {
                let resMsg = RED.util.cloneMessage(msg);
                let prop; let paramForStart; let paramForEnd;
                let paramForStep; let paramForeachCollection;
                let loopId = node.id.replace(/\./g, ':') + ':for';
                let forCtx;

                try {
                    forCtx = node.context().get(loopId);
                } catch (ex) {
                    console.log('Loop not initialized', ex.message);
                }
                switch (node.loopType) {
                    case 'for':
                        // console.log(node);
                        // console.log(node.id);
                        // console.log('For-%s', node.id);
                        // console.log('node.context() %j', node.context);
                        // console.log(node.context());
                        // console.log('node.context().flow');
                        // console.log(node.context().flow);
                        // console.log('node.context().flow.keys()');
                        // console.log(node.context().flow.keys());

                        console.log('Loop Context %j', forCtx);
                        if (forCtx === undefined) {
                            console.log('Assigning loop params %j', [node.forStart, node.forStartType, node.forEnd, node.forEndType, node.forStep, node.forStepType].join(' | '));
                            paramForStart = evaluateTypedParameters(node, msg, node.forStart, node.forStartType);
                            paramForEnd = evaluateTypedParameters(node, msg, node.forEnd, node.forEndType);
                            paramForStep = evaluateTypedParameters(node, msg, node.forStep, node.forStepType);
                            forCtx = {
                                start: parseInt(paramForStart),
                                end: parseInt(paramForEnd),
                                step: parseInt(paramForStep),
                                now: parseInt(paramForStart),
                            };
                        }
                        console.log('Check Start loop %j', forCtx);
                        if (forCtx.step > 0) {
                            if (forCtx.now <= forCtx.end) {
                                resMsg.loop = {
                                    index: forCtx.now,
                                };
                                forCtx.now += forCtx.step;
                                console.log('Loop Increment %j', resMsg.loop);
                                response = [resMsg, null];
                            } else {
                                response = [null, resMsg];
                                resMsg.loop = {
                                    index: forCtx.now,
                                };
                                console.log('Loop Complete %j', resMsg.loop);
                                forCtx = undefined;
                            }
                        } else {

                        }
                        console.log('Check End loop %j', forCtx);
                        node.context().set(loopId, forCtx);
                        node.send(response);

                        break;
                    case 'foreach':
                        console.log('Loop Context %j', forCtx);
                        if (forCtx === undefined) {
                            console.log('Assigning loop params %j', [node.foreachCollection, node.foreachCollectionType].join(' | '));
                            paramForeachCollection = evaluateTypedParameters(node, msg, node.foreachCollection, node.foreachCollectionType);
                            const collectionType = Object.prototype.toString.call(paramForeachCollection);
                            forCtx = {
                                start: paramForeachCollection,
                                now: paramForeachCollection,
                                type: collectionType === '[object Array]' ? 'array' : collectionType === '[object Object]' ? 'object' : 'unknown',
                                index: 0,
                            };
                        }
                        console.log('Check Start loop %j', forCtx);
                        if (forCtx.type === 'array') {
                            if (forCtx.now.length > 0) {
                                let item = forCtx.now.splice(0, 1)[0];
                                resMsg.loop = {
                                    item: item,
                                    index: forCtx.index,
                                };
                                forCtx.index++;
                                response = [resMsg, null];
                            } else {
                                resMsg.loop = {
                                    index: forCtx.now,
                                };
                                response = [null, resMsg];
                                console.log('Loop Complete %j', resMsg.loop);
                                forCtx = undefined;
                            }
                        } else if (forCtx.type === 'object') {
                            node.error(RED._('loop.errors.not-an-iterable', {error: 'type is ' + forCtx.type}));
                            return;
                        } else {
                            node.error(RED._('loop.errors.not-an-iterable', {error: 'type is ' + forCtx.type}));
                            return;
                        }

                        console.log('Check End loop %j', forCtx);
                        node.context().set(loopId, forCtx);
                        node.send(response);
                        break;
                    case 'while':
                        // this.property = n.property;
                        // this.propertyType = n.propertyType || 'msg';
                        prop = evaluateTypedParameters(node, msg, node.property, node.propertyType);
                        break;
                }
                // console.log('Loop Implementation Returning');
                // return;
                // prop = evaluateTypedParameters(node, msg, node.property, node.propertyType)

                // let prop;
                // if (node.propertyType === 'jsonata') {
                //     prop = RED.util.evaluateJSONataExpression(node.property, msg);
                // } else {
                //     prop = RED.util.evaluateNodeProperty(node.property, node.propertyType, node, msg);
                // }
                // console.log('property %j-%j', node.property, prop)
                let elseflag = true;
                for (let i = 0; i < node.rules.length; i += 1) {
                    let rule = node.rules[i];
                    let test = prop;
                    // console.log('[%s], rule:%j, test:%j', i, rule, test);
                    let v1;
                    let v2;
                    if (rule.vt === 'prev') {
                        v1 = node.previousValue;
                    } else if (rule.vt === 'jsonata') {
                        try {
                            v1 = RED.util.evaluateJSONataExpression(rule.v, msg);
                            // console.log('Jsonata : %j, %j, %j', rule, test, v1)
                        } catch (err) {
                            node.error(RED._('loop.errors.invalid-expr', {error: err.message}));
                            return;
                        }
                    } else {
                        try {
                            v1 = RED.util.evaluateNodeProperty(rule.v, rule.vt, node, msg);
                        } catch (err) {
                            v1 = undefined;
                        }
                    }
                    v2 = rule.v2;
                    if (rule.v2t === 'prev') {
                        v2 = node.previousValue;
                    } else if (rule.v2t === 'jsonata') {
                        try {
                            v2 = RED.util.evaluateJSONataExpression(rule.v2, msg);
                            // console.log('Jsonata : %s, %s, %s', rule.v2, test, v2)
                        } catch (err) {
                            node.error(RED._('loop.errors.invalid-expr', {error: err.message}));
                            return;
                        }
                    } else if (typeof v2 !== 'undefined') {
                        try {
                            v2 = RED.util.evaluateNodeProperty(rule.v2, rule.v2t, node, msg);
                        } catch (err) {
                            v2 = undefined;
                        }
                    }


                    if (rule.t == 'else') {
                        test = elseflag; elseflag = true;
                    }
                    // console.log('isElse? %s', elseflag);
                    console.log('Eval expre %s, %s, %s, %s, %s', rule.t, test, v1, v2, rule.case);
                    console.log(operators[rule.t](test, v1, v2, rule.case));
                    if (operators[rule.t](test, v1, v2, rule.case)) {
                        // console.log('True %j', rule.case);
                        response = [msg, null];
                        elseflag = false;
                        if (node.checkall == 'false') {
                            break;
                        }
                    } else {
                        // console.log('False %j', rule.case);
                        response = [null, msg];
                        if (node.checkall == 'true') {
                            break;
                        }
                        // response.push(null);
                    }
                }
                console.log('response %j', response);
                node.previousValue = prop;
                node.send(response);
            } catch (err) {
                node.warn(err);
            }
        });
    }

    RED.nodes.registerType('orpa-loops', LoopNode);
};


