## orpa-node-email [![orpa-node-email build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/8/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
#### Nodes: 
* email send
* email listen
### Email Send
Sends the `msg.payload` as an email, with a subject of `msg.topic`.

The default message recipient can be configured in the node, if it is left blank it should be set using the msg.to property of the incoming message. If left blank you can also specify `msg.cc` and/or `msg.bcc` properties.

You may optionally set `msg.from` in the payload which will override the userid default value.

The payload can be html format.

If the payload is a binary buffer then it will be converted to an attachment. The filename should be set using `msg.filename`. Optionally `msg.description` can be added for the body text.

Alternatively you may provide `msg.attachments` which should contain an array of one or more attachments in nodemailer format.

If required by your recipient you may also pass in a `msg.envelope` object, typically containing extra from and to properties.

**Note**: uses SMTP with SSL to port 465.

### Email Listen
Repeatedly gets a single email from an IMAP server and forwards on as a msg if not already seen.

The subject is loaded into `msg.topic` and `msg.payload` is the plain text body. If there is text/html then that is returned in `msg.html`. `msg.from` and `msg.date` are also set if you need them.

Additionally `msg.header` contains the complete header object including to, cc and other potentially useful properties.

Uses the imap module.

**Note**: this node only gets the most recent single email from the inbox, so set the repeat (polling) time appropriately.

**Note**: uses IMAP with SSL to port 993.

Any attachments supplied in the incoming email can be found in the `msg.attachments` property. This will be an array of objects where each object represents a specific attachments. The format of the object is:
```
{
  contentType:        // The MIME content description
  fileName:           // A suggested file name associated with this attachment
  transferEncoding:   // How was the original email attachment encodded?
  contentDisposition: // Unknown
  generatedFileName:  // A suggested file name associated with this attachment
  contentId:          // A unique generated ID for this attachment
  checksum:           // A checksum against the data
  length:             // Size of data in bytes
  content:            // The actual content of the data contained in a Node.js Buffer object
                      // We can turn this into a base64 data string with content.toString('base64')
}

```
