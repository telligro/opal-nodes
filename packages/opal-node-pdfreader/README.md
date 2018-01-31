## opal-node-pdfreader [![opal-node-pdfreader build status](https://frozen-fortress-98851.herokuapp.com/telligro/orpa-nodes/8/badge?subject=build)](https://travis-ci.org/telligro/orpa-nodes)
### This module is part of the OPAL framework
#### Nodes: 
* read pdf
### Read PDF
Opens an pdf from a specified location and reads the contents. The contents can then be passed to downstream node or saved to a store variable.
#### Inputs:
* **Name**: A Name for this instance
* **File Path**: choose the location from where the pdf can be read
* **Preprocess**: specify if pdf document needs to be processed, optionally based on rules specified
#### Output Formats: 
The output of the read operation can be a JSON
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
`msg.payload` contains the data read from pdf