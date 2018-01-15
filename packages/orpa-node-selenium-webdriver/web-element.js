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
 *
 * @param {*} RED
 */
module.exports = function(RED) {
    'use strict';
    let q = require('q');
    let fs = require('fs-extra');
    let easyimg = require('easyimage');
    let verror = require('verror');
    const webdriver = require('selenium-webdriver');
    const By = webdriver.By;
    const until = webdriver.until;

    // console.log('Registering Plugin Service')
    // const FinderPluginSvc = require('@torpadev/orpa-page-object-finder').FinderPluginSvc;
    // const Dispatcher = require('@torpadev/orpa-page-object-finder').Dispatcher;
    // console.log('Registered Plugin Service: Page Object Finder');
    // // const finderSvc = new FinderPluginSvc();
    // const dispatcher = new Dispatcher();
    // dispatcher.registerObject("FinderPluginSvc", FinderPluginSvc);
    // // console.log(finderSvc);
    // console.log(dispatcher);
    // try{
    //     dispatcher.start(9010);
    // }catch(ex){
    //     console.error(ex);
    // }

    // RED.comms.publish('object:finder', 'How is the view ?');
    function ConfigureWebPageElements(n) {
        RED.nodes.createNode(this, n);

        this.usecount = 0;

        this.name = n.name;
        this.expression = n.expression;
        this.selector = n.selector;
        this.page = n.page;
        this.markers = n.markers;
        this.framePath = n.framePath;

        let node = this;
        // node.log(n);
        this.register = function() {
            node.usecount += 1;
        };

        this.deregister = function() {
            node.usecount -= 1;
            if (node.usecount == 0) {
            }
        };
    }

    RED.nodes.registerType('web-element', ConfigureWebPageElements);

    RED.httpAdmin.get('/plugins/*', function(req, res) {
        let options = {
            root: __dirname + '/plugins/',
            dotfiles: 'deny',
        };
        res.sendFile(req.params[0], options);
    });
};

