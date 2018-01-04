## orpa-node-selenium-webdriver [![orpa-node-selenium-webdriver build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/20/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
#### Nodes: 
* open web 
* close web
* find object
* send keys
* click on
* set value
* to file
* identify page
* get value
* get attributee
* get text
* run script
* screenshot
* nav to
* nav back
* nav forward
* nav refresh
### Open Web
Create an instance of selenium webdriver and connect to the Selenium Server when an event is triggered.
#### Inputs:
* **Name**: A Name for this read-excel instance
* **Browser**: specify the selenium node which support the web browser you wan tot test such as [Chrome, Firefox etc.,]
* **Page**: the name of the page to be launched. pages can be defined by editing this configuration item
* **Timeout**: specify the timeout during lookup for the title operation.  
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
### Close Web
Close the web browser which is openned by the open-web node 
#### Inputs:
* **Name**: a Name for this instance
* **Wait For**: time in milliseconds to waiit before execution
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
### Find Object
Finds a target specified in the specified page
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Send Keys
Sends the specified keys to the target
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Click On
Clicks on the target
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Set Value
Sets the value of the target
#### Inputs:
* **Name**: a Name for this instance
* **Value**: the value to set
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### To File
Save a value to the File location with `msg.payload` content as a string.
#### Inputs:
* **Name**: a Name for this instance
* **File**: specify the file path to write to. The msg.filename will override the File field if set
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
### Identify Page
Identifies the current page. If the page specified is available in the browser the `identified` output port is activated. If the page is not found the `not identified` output port is activated.
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
### Get Value
Gets the value of the target
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
* **Store**: the location where the value is stored
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Get Attribute
Gets the specified attribute value of the target
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
* **Store**: the location where the value is stored
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Get Text
Gets the text property of the target
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
* **Store**: the location where the value is stored
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Run Script
Executes the script in the context of the page
#### Inputs:
* **Name**: a Name for this instance
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
* **Function**: the javascript code that is executed in the context of the page
##### Logging and Error Handling
To log any information, or report an error, the following functions are available:

```
node.log("Log")
node.warn("Warning")
node.error("Error")
```
The Catch node can also be used to handle errors. To invoke a Catch node, pass msg as a second argument to node.error:
```
node.error("Error",msg)
```
Sending messages
The function can either return the messages it wants to pass on to the next nodes in the flow, or can call node.send(messages).

It can return/send:

a single message object - passed to nodes connected to the first output
an array of message objects - passed to nodes connected to the corresponding outputs
If any element of the array is itself an array of messages, multiple messages are sent to the corresponding output.

If null is returned, either by itself or as an element of the array, no message is passed on.

See the online documentation for more help.
You can manage your palette of nodes with ctrl-⇧p
 
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
`msg.element` If the element is found, it will be passed though the msg object to the next node.
### Screenshot
Take a screenshot fo the current page and save to a file
#### Inputs:
* **Name**: a Name for this instance
* **File**: full filename to store the screenshot
* **Page**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Target**: specify the target to lookup. The `msg.target` will override the Target field if set.
* **Timeout**: specify the timeout during lookup operation. The `msg.timeout` will override the Timeout field if set.
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
### Nav To
Navigate to the specified URL
#### Inputs:
* **Name**: a Name for this instance
* **URL**: the page where this browser action executes. Pages can be defined by editing this configuration item
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
### Nav Back
Triggers the back action in browser
#### Inputs:
* **Name**: a Name for this instance
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
### Nav Forward
Triggers the forward action in browser
#### Inputs:
* **Name**: a Name for this instance
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
### Nav Refresh
Refreshes the page in the browser
#### Inputs:
* **Name**: a Name for this instance
* **Wait For**: specify the time to wait before looking up. The `msg.waitfor` will override the Wait For field if set.
#### Outputs:
`msg.error` When the object is unexpected or cannot find element, this node generates the error with detail information  
