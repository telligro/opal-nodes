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

/**
 * POP3 protocol - RFC1939 - https://www.ietf.org/rfc/rfc1939.txt
 *
 * Dependencies:
 * * poplib     - https://www.npmjs.com/package/poplib
 * * nodemailer - https://www.npmjs.com/package/nodemailer
 * * imap       - https://www.npmjs.com/package/imap
 * * mailparser - https://www.npmjs.com/package/mailparser
 */

module.exports = function(RED) {
    'use strict';
    let nodemailer = require('nodemailer');
    let Imap = require('imap');
    let POP3Client = require('poplib');
    let MailParser = require('mailparser').MailParser;
    let util = require('util');
    let inspect = util.inspect;
    let fs = require('fs');
    let base64 = require('base64-stream');
    let imap;
    let retryParams;


    try {
        let globalkeys = RED.settings.email || require(process.env.NODE_RED_HOME + '/../emailkeys.js');
    } catch (err) {
    }
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {sting} thing __DOCSPLACEHOLDER__
     * @return {sting} upperCasedThing
     */
    function toUpper(thing) {
        return thing && thing.toUpperCase ? thing.toUpperCase() : thing;
    }
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {any} struct __DOCSPLACEHOLDER__
     * @param {any} attachments __DOCSPLACEHOLDER__
     * @return {object} attachments
     */
    function findAttachmentParts(struct, attachments) {
        attachments = attachments || [];
        for (let i = 0, len = struct.length, r; i < len; ++i) {
            if (Array.isArray(struct[i])) {
                findAttachmentParts(struct[i], attachments);
            } else {
                if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
                    attachments.push(struct[i]);
                }
            }
        }
        return attachments;
    }

    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {any} attachment __DOCSPLACEHOLDER__
     * @param {any} attachmentloc __DOCSPLACEHOLDER__
     * @return {function} attachMessageFunction
     */
    function buildAttMessageFunction(attachment, attachmentloc) {
        let filename = attachment.params.name;
        let encoding = attachment.encoding;

        return function(msg, seqno) {
            let prefix = '(#' + seqno + ') ';
            msg.on('body', function(stream, info) {
                if (attachmentloc) {
                    filename = attachmentloc + filename;
                }
                // Create a write stream so that we can stream the attachment to file;
                console.log(prefix + 'Streaming this attachment to file', filename, info);
                let writeStream = fs.createWriteStream(filename);
                writeStream.on('finish', function() {
                    console.log(prefix + 'Done writing to file %s', filename);
                });

                // stream.pipe(writeStream); this would write base64 data to the file.
                // so we decode during streaming using
                if (toUpper(encoding) === 'BASE64') {
                    // the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
                    stream.pipe(base64.decode()).pipe(writeStream);
                } else {
                    // here we have none or some other decoding streamed directly to the file which renders it useless probably
                    stream.pipe(writeStream);
                }
            });
            msg.once('end', function() {
                console.log(prefix + 'Finished attachment %s', filename);
            });
        };
    }
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {any} n __DOCSPLACEHOLDER__
     */
    function EmailNode(n) {
        RED.nodes.createNode(this, n);
        this.topic = n.topic;
        this.name = n.name;
        this.outserver = n.server;
        this.outport = n.port;
        this.secure = n.secure;
        let flag = false;
        if (this.credentials && this.credentials.hasOwnProperty('userid')) {
            this.userid = this.credentials.userid;
        } else {
            if (globalkeys) {
                this.userid = globalkeys.user;
                flag = true;
            }
        }
        if (this.credentials && this.credentials.hasOwnProperty('password')) {
            this.password = this.credentials.password;
        } else {
            if (globalkeys) {
                this.password = globalkeys.pass;
                flag = true;
            }
        }
        if (flag) {
            RED.nodes.addCredentials(n.id, {userid: this.userid, password: this.password, global: true});
        }
        let node = this;

        let smtpOptions = {
            host: node.outserver,
            port: node.outport,
            secure: node.secure,
        };

        if (this.userid && this.password) {
            smtpOptions.auth = {
                user: node.userid,
                pass: node.password,
            };
        }
        let smtpTransport = nodemailer.createTransport(smtpOptions);

        this.on('input', function(msg) {
            let params = processValuesFromContext(node, msg, [
                {name: 'port', type: 'portType'},
                {name: 'server', type: 'serverType'},
                {name: 'userid', type: 'useridType'},
                {name: 'password', type: 'passwordType'},
            ]);
            console.log('params are ....');
            console.log(JSON.stringify(params));

            if (params.userid && params.password) {
                smtpOptions.auth = {
                    user: params.userid,
                    pass: params.password,
                };
            }

            if (params.port && params.server) {
                smtpOptions.host = params.server;
                smtpOptions.port = params.port;
            }


            if (msg.hasOwnProperty('payload')) {
                if (smtpTransport) {
                    node.status({fill: 'blue', shape: 'dot', text: 'email.status.sending'});
                    if (msg.to && node.name && (msg.to !== node.name)) {
                        node.warn(RED._('node-red:common.errors.nooverride'));
                    }
                    let sendopts = {from: ((msg.from) ? msg.from : node.userid)}; // sender address
                    sendopts.to = node.name || msg.to; // comma separated list of addressees
                    if (node.name === '') {
                        sendopts.cc = msg.cc;
                        sendopts.bcc = msg.bcc;
                    }
                    sendopts.subject = msg.topic || msg.title || 'Message from Node-RED'; // subject line
                    if (msg.hasOwnProperty('envelope')) {
                        sendopts.envelope = msg.envelope;
                    }
                    if (Buffer.isBuffer(msg.payload)) { // if it's a buffer in the payload then auto create an attachment instead
                        if (!msg.filename) {
                            let fe = 'bin';
                            if ((msg.payload[0] === 0xFF) && (msg.payload[1] === 0xD8)) {
                                fe = 'jpg';
                            }
                            if ((msg.payload[0] === 0x47) && (msg.payload[1] === 0x49)) {
                                fe = 'gif';
                            } // 46
                            if ((msg.payload[0] === 0x42) && (msg.payload[1] === 0x4D)) {
                                fe = 'bmp';
                            }
                            if ((msg.payload[0] === 0x89) && (msg.payload[1] === 0x50)) {
                                fe = 'png';
                            } // 4E
                            msg.filename = 'attachment.' + fe;
                        }
                        let fname = msg.filename.replace(/^.*[\\\/]/, '') || 'file.bin';
                        sendopts.attachments = [{content: msg.payload, filename: fname}];
                        if (msg.hasOwnProperty('headers') && msg.headers.hasOwnProperty('content-type')) {
                            sendopts.attachments[0].contentType = msg.headers['content-type'];
                        }
                        // Create some body text..
                        sendopts.text = RED._('email.default-message', {filename: fname, description: (msg.description || '')});
                    } else {
                        let payload = RED.util.ensureString(msg.payload);
                        sendopts.text = payload; // plaintext body
                        if (/<[a-z][\s\S]*>/i.test(payload)) {
                            sendopts.html = payload;
                        } // html body
                        if (msg.attachments) {
                            sendopts.attachments = msg.attachments;
                        } // add attachments
                    }
                    smtpTransport.sendMail(sendopts, function(error, info) {
                        if (error) {
                            node.error(error, msg);
                            node.status({fill: 'red', shape: 'ring', text: 'email.status.sendfail'});
                        } else {
                            node.log(RED._('email.status.messagesent', {response: info.response}));
                            node.status({});
                        }
                    });
                } else {
                    node.warn(RED._('email.errors.nosmtptransport'));
                }
            } else {
                node.warn(RED._('email.errors.nopayload'));
            }
        });
    }
    RED.nodes.registerType('email-send', EmailNode, {
        credentials: {
            userid: {type: 'text'},
            password: {type: 'password'},
            global: {type: 'boolean'},
        },
    });


    //
    // EmailInNode
    //
    /**
     * __DOCSPLACEHOLDER__
     *
     * @param {any} n __DOCSPLACEHOLDER__
     * @param {any} inParams __DOCSPLACEHOLDER__
     * @param {any} msg __DOCSPLACEHOLDER__
     */
    function emailInNode(n, inParams, msg) {
        try {
            /* RED.nodes.createNode(this,n);*/

            let flag = false;

            if (n.credentials && n.credentials.hasOwnProperty('userid')) {
                n.userid = n.credentials.userid;
                inParams.userid = n.credentials.userid;

                console.log('After setting user id');
            } else {
                if (globalkeys) {
                    n.userid = globalkeys.user;
                    flag = true;
                } else {
                    n.error(RED._('email.errors.nouserid'));
                }
            }
            if (n.credentials && n.credentials.hasOwnProperty('password')) {
                n.password = n.credentials.password;
                inParams.password = n.credentials.password;
                console.log('After setting password');
            } else {
                if (globalkeys) {
                    n.password = globalkeys.pass;
                    flag = true;
                } else {
                    n.error(RED._('email.errors.nopassword'));
                }
            }
            if (flag) {
                RED.nodes.addCredentials(n.id, {userid: n.userid, password: n.password, global: true});
            }

            let params = processValuesFromContext(n, inParams, msg, [
                {name: 'port', type: 'portType'},
                {name: 'server', type: 'serverType'},
                {name: 'userid', type: 'useridType'},
                {name: 'password', type: 'passwordType'},
                {name: 'attachment', type: 'attachmentType'},
            ]);

            // console.log("After creating node..mailin ..");
            // console.log(JSON.stringify(params));

            n.name = params.name;
            n.repeat = params.repeat * 1000 || 30000;
            n.server = params.server || (globalkeys && globalkeys.server) || 'imap.gmail.com';
            n.port = params.port || (globalkeys && globalkeys.port) || '993';
            n.box = params.box || 'INBOX';
            n.useSSL = params.useSSL;
            n.protocol = params.protocol || 'IMAP';
            n.disposition = params.disposition || 'None'; // "None", "Delete", "Read"
            n.attachment = params.attachment;
            n.userid = params.userid;
            n.password = params.password;


            // var node = this;
            console.log('After replacing variables.');
            console.log(JSON.stringify(n));
            n.interval_id = null;

            // Process a new email message by building a Node-RED message to be passed onwards
            // in the message flow.  The parameter called `msg` is the template message we
            // start with while `mailMessage` is an object returned from `mailparser` that
            // will be used to populate the email.
            /**
             * Process a new email message by building a Node-RED message to be passed onwards
             * in the message flow.  The parameter called `msg` is the template message we
             * start with while `mailMessage` is an object returned from `mailparser` that
             * will be used to populate the email.
             *
             * @param {any} msg __DOCSPLACEHOLDER__
             * @param {any} mailMessage __DOCSPLACEHOLDER__
             */
            function processNewMessage(msg, mailMessage) {
                // msg = JSON.parse(JSON.stringify(msg)); // Clone the message
                // Populate the msg fields from the content of the email message
                // that we have just parsed.
                msg.payload = mailMessage.text;
                msg.topic = mailMessage.subject;
                msg.date = mailMessage.date;
                msg.header = mailMessage.headers;
                if (mailMessage.html) {
                    msg.html = mailMessage.html;
                }
                if (mailMessage.to && mailMessage.from.to > 0) {
                    msg.to = mailMessage.to;
                }
                if (mailMessage.cc && mailMessage.from.cc > 0) {
                    msg.cc = mailMessage.cc;
                }
                if (mailMessage.bcc && mailMessage.from.bcc > 0) {
                    msg.bcc = mailMessage.bcc;
                }
                if (mailMessage.from && mailMessage.from.length > 0) {
                    msg.from = mailMessage.from[0].address;
                }
                if (mailMessage.attachments) {
                    msg.attachments = mailMessage.attachments;
                } else {
                    msg.attachments = [];
                }
                n.send(msg); // Propagate the message down the flow
            } // End of processNewMessage

            // Check the POP3 email mailbox for any new messages.  For any that are found,
            // retrieve each message, call processNewMessage to process it and then delete
            /**
             * Check the POP3 email mailbox for any new messages.  For any that are found,
             * retrieve each message, call processNewMessage to process it and then delete
             *
             * @param {any} msg __DOCSPLACEHOLDER__
             */
            function checkPOP3(msg) {
                let currentMessage;
                let maxMessage;

                // Form a new connection to our email server using POP3.
                let pop3Client = new POP3Client(
                    node.port, node.server,
                    {enabletls: node.useSSL} // Should we use SSL to connect to our email server?
                );

                // If we have a next message to retrieve, ask to retrieve it otherwise issue a
                /**
                 * If we have a next message to retrieve, ask to retrieve it otherwise issue a
                 */
                function nextMessage() {
                    if (currentMessage > maxMessage) {
                        pop3Client.quit();
                        return;
                    }
                    pop3Client.retr(currentMessage);
                    currentMessage++;
                } // End of nextMessage

                pop3Client.on('stat', function(status, data) {
                    // Data contains:
                    // {
                    //   count: <Number of messages to be read>
                    //   octect: <size of messages to be read>
                    // }
                    if (status) {
                        currentMessage = 1;
                        maxMessage = data.count;
                        nextMessage();
                    } else {
                        node.log(util.format('stat error: %s %j', status, data));
                    }
                });

                pop3Client.on('error', function(err) {
                    node.log('We caught an error: ' + JSON.stringify(err));
                });

                pop3Client.on('connect', function() {
                    // node.log("We are now connected");
                    pop3Client.login(node.userid, node.password);
                });

                pop3Client.on('login', function(status, rawData) {
                    // node.log("login: " + status + ", " + rawData);
                    if (status) {
                        pop3Client.stat();
                    } else {
                        node.log(util.format('login error: %s %j', status, rawData));
                        pop3Client.quit();
                    }
                });

                pop3Client.on('retr', function(status, msgNumber, data, rawData) {
                    // node.log(util.format("retr: status=%s, msgNumber=%d, data=%j", status, msgNumber, data));
                    if (status) {
                        // We have now received a new email message.  Create an instance of a mail parser
                        // and pass in the email message.  The parser will signal when it has parsed the message.
                        let mailparser = new MailParser();
                        mailparser.on('end', function(mailObject) {
                            // node.log(util.format("mailparser: on(end): %j", mailObject));
                            processNewMessage(msg, mailObject);
                        });
                        mailparser.write(data);
                        mailparser.end();
                        pop3Client.dele(msgNumber);
                    } else {
                        node.log(util.format('retr error: %s %j', status, rawData));
                        pop3Client.quit();
                    }
                });

                pop3Client.on('invalid-state', function(cmd) {
                    node.log('Invalid state: ' + cmd);
                });

                pop3Client.on('locked', function(cmd) {
                    node.log('We were locked: ' + cmd);
                });

                // When we have deleted the last processed message, we can move on to
                // processing the next message.
                pop3Client.on('dele', function(status, msgNumber) {
                    nextMessage();
                });
            } // End of checkPOP3


            //
            // checkIMAP
            //
            /**
             * Check the email sever using the IMAP protocol for new messages.
             *
             * @param {any} msg __DOCSPLACEHOLDER__
             * @param {any} fileloc __DOCSPLACEHOLDER__
             */
            function checkIMAP(msg, fileloc) {
                // var fileloc =  msg.attachmentloc;
                n.log('Checking IMAP for new messages');
                // We get back a 'ready' event once we have connected to imap
                imap.once('ready', function() {
                    n.status({fill: 'blue', shape: 'dot', text: 'email.status.fetching'});
                    console.log('> ready');
                    // Open the inbox folder
                    imap.openBox(n.box, // Mailbox name
                        false, // Open readonly?
                        function(err, box) {
                            // console.log("> Inbox open: %j", box);
                            imap.search(['UNSEEN'], function(err, results) {
                                if (err) {
                                    n.status({fill: 'red', shape: 'ring', text: 'email.status.foldererror'});
                                    n.error(RED._('email.errors.fetchfail', {folder: n.box}), err);
                                    imap.end();
                                    return;
                                }
                                // console.log("> search - err=%j, results=%j", err, results);
                                if (results.length === 0) {
                                    // console.log(" [X] - Nothing to fetch");
                                    n.status({});
                                    imap.end();
                                    return;
                                }

                                let marks = false;
                                if (n.disposition === 'Read') {
                                    marks = true;
                                }
                                // We have the search results that contain the list of unseen messages and can now fetch those messages.
                                let fetch = imap.fetch(results, {
                                    bodies: '',
                                    struct: true,
                                    markSeen: marks,
                                });

                                // For each fetched message returned ...
                                fetch.on('message', function(imapMessage, seqno) {
                                    // node.log(RED._("email.status.message",{number:seqno}));
                                    let messageText = '';
                                    // console.log("> Fetch message - msg=%j, seqno=%d", imapMessage, seqno);
                                    imapMessage.on('body', function(stream, info) {
                                        // console.log("> message - body - stream=?, info=%j", info);
                                        stream.on('data', function(chunk) {
                                            // console.log("> stream - data - chunk=??");
                                            messageText += chunk.toString('utf8');
                                        });
                                        stream.once('end', function() {
                                            let mailParser = new MailParser();
                                            mailParser.on('end', function(mailMessage) {
                                                processNewMessage(msg, mailMessage);
                                            });
                                            mailParser.write(messageText);
                                            mailParser.end();
                                        }); // End of msg->end
                                    }); // End of msg->body

                                    imapMessage.once('attributes', function(attrs) {
                                        let prefix = '[TEMP]-';
                                        let attachments = findAttachmentParts(attrs.struct);
                                        console.log(prefix + 'Has attachments: %d', attachments.length);
                                        for (let i = 0, len = attachments.length; i < len; ++i) {
                                            let attachment = attachments[i];
                                            /* This is how each attachment looks like {
                                                partID: '2',
                                                type: 'application',
                                                subtype: 'octet-stream',
                                                params: { name: 'file-name.ext' },
                                                id: null,
                                                description: null,
                                                encoding: 'BASE64',
                                                size: 44952,
                                                md5: null,
                                                disposition: { type: 'ATTACHMENT', params: { filename: 'file-name.ext' } },
                                                language: null
                                              }
                                            */
                                            console.log(prefix + 'Fetching attachment %s', attachment.params.name);
                                            let f = imap.fetch(attrs.uid, { // do not use imap.seq.fetch here
                                                bodies: [attachment.partID],
                                                struct: true,
                                            });
                                            // build function to process attachment message
                                            f.on('message', buildAttMessageFunction(attachment, fileloc));
                                        }
                                    });// End of msg attachments
                                }); // End of fetch->message

                                // When we have fetched all the messages, we don't need the imap connection any more.
                                fetch.on('end', function() {
                                    console.log('> cleaning up');
                                    n.status({});
                                    let cleanup = function() {
                                        imap.end();
                                    };
                                    if (node.disposition === 'Delete') {
                                        imap.addFlags(results, '\Deleted', cleanup);
                                    } else if (node.disposition === 'Read') {
                                        imap.addFlags(results, '\Seen', cleanup);
                                    } else {
                                        cleanup();
                                    }
                                });

                                fetch.once('error', function(err) {
                                    console.log('Fetch error: ' + err);
                                });
                            }); // End of imap->search
                        }); // End of imap->openInbox
                }); // End of imap->ready
                n.status({fill: 'grey', shape: 'dot', text: 'node-red:common.status.connecting'});
                imap.connect();
            } // End of checkIMAP

            /**
             * // Perform a check of the email inboxes using either POP3 or IMAP
             *
             * @param {any} msg
             * @param {any} node
             */
            function checkEmail(msg, node) {
                if (node.protocol === 'POP3') {
                    checkPOP3(msg);
                } else if (node.protocol === 'IMAP') {
                    console.log('Inside checkEmail');
                    imap = new Imap({
                        user: node.userid,
                        password: node.password,
                        host: node.server,
                        port: node.port,
                        tls: node.useSSL,
                        tlsOptions: {rejectUnauthorized: false},
                        connTimeout: (node.repeat - 10),
                        authTimeout: (node.repeat - 10),
                    });

                    imap.on('error', function(err) {
                        if (err.errno !== 'ECONNRESET') {
                            node.log(err);
                            node.status({fill: 'red', shape: 'ring', text: 'email.status.connecterror'});
                        }
                    });

                    checkIMAP(msg, node.attachment);
                }
            } // End of checkEmail

            /**
             * proccess values from context
             *
             * @param {any} node __DOCSPLACEHOLDER__
             * @param {any} params __DOCSPLACEHOLDER__
             * @param {any} msg __DOCSPLACEHOLDER__
             * @param {any} varList __DOCSPLACEHOLDER__
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
                        console.log('Inside flow or global');
                        console.log(varItem.name + ' - - ' + pMsg[varItem.name]);
                    } else {
                        pMsg[varItem.name] = params[varItem.name];
                        pMsg[varItem.type] = params[varItem.type];
                    }
                });
                return pMsg;
            }


            checkEmail(msg, n);
        } catch (error) {
            // var errMissingRegion = util.format("Required parameter region [%s] is invalid", params.region);
            n.log('Error in Listen to Email node');
            n.log(JSON.stringify(error));
            msg.error = error;
            n.error(JSON.stringify(error), msg);
            return;
        }
        /* this.on("input", function(msg) {

            console.log("Node recevied input msg");
            checkEmail(msg,node);

        });*/

        /* this.on("close", function() {
            if (this.interval_id != null) {
                clearInterval(this.interval_id);
            }
            if (imap) { imap.destroy(); }
        });*/


        // Set the repetition timer as needed
    }

    /* RED.nodes.registerType("email-listen",EmailInNode,{
         credentials: {
             userid: { type:"text" },
             password: { type: "password" },
             global: { type:"boolean" }
         }
     });*/
/**
 * __DOCSPLACEHOLDER__
 *
 * @param {any} params __DOCSPLACEHOLDER__
 */
function ListenToEmail(params) {
        RED.nodes.createNode(this, params);
        this.name = params.name;
        this.waitfor = params.waitfor;
        let node = this;
        this.on('input', function(msg) {
            if (msg.error) {
                // FIXME: Add error handling here
            } else {
                node.log('ListenToEmail');
                // node.log(JSON.stringify(params));
                retryParams = params;
                emailInNode(node, params, msg);
            }
        });
        this.on('close', function() {
            if (node.interval_id != null) {
                clearInterval(node.interval_id);
            }
            if (imap) {
                imap.destroy();
            }
        });

        // Repeat interval
        if (!isNaN(params.repeat) && params.repeat > 0) {
            node.interval_id = setInterval(function() {
                if (retryParams) {
                    console.log('>Calling node emit input');
                    node.emit('input', retryParams);
                }
            }, params.repeat * 1000);
        }
    }

    RED.nodes.registerType('email-listen', ListenToEmail, {
        credentials: {
            userid: {type: 'text'},
            password: {type: 'password'},
            global: {type: 'boolean'},
        },
    });
};
