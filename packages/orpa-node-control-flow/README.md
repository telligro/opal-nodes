## orpa-node-control-flow [![orpa-node-ftp build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/17/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
### Nodes: 
* orpa loops
### Loops
- [ ] Provides `for-loop`, `foreach-loop`, `while-loop` functionality. THe loop node provides 2 output ports. The next item `output` and the `done` output port. Connect the nodes that are to be in the loop body to the `next` output port. At the end of the loop connect the last action to the input port of the loop node. Connect the `done` output port to the nodes that are to be executed after the loops ends. 
#### Inputs:
* **Name**: A Name for this instance
* **Type**: choose from `for-loop`, `foreach-loop`and `while-loop`
* **for-loop**: Takes start, end and step as parameters
    * **start**: A number that represents the starting value for the loop
    * **end**: A number that represents the ending value of the loop. This must be greater than the start value
    * **step**: A number y which the loop counter is incremented for each iteration
* **foreach-loop**: Takes a collection to be iterated as input. 
    * **collection**: The collection to be iterated. Expects a JSON array or variable containing a json array.
* **while-loop**: Takes start, end and step as parameters
    * **property**: The value to be used in the comparison for while condition
    * **rules**: A collection of rules that can be applied to the property. The rules when applied to the property forms the condition for the loop
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
`msg.payload` contains the data read from spreadsheet

