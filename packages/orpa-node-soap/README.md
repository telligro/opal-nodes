## orpa-node-soap [![orpa-node-soap build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/11/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
#### Nodes: 
* soap service
### Soap Service
Connects to a soap service and provides the response.
#### Inputs:
* **Name**: A Name for this read-excel instance
* **Url**: Specify the url for soap request
* **Method**: Specify the methods to invoke based on the wsdl
* **Parameters**: Specify the parameters in json format
* **Headers**: Specify the header for the request
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
`msg.payload` contains the data read from spreadsheet
