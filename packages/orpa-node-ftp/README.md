## orpa-node-ftp [![orpa-node-ftp build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/11/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
### Nodes: 
* ftp service
### FTP Service
Connects to a ftp server and helps to read or write the specified file.
#### Inputs:
* **Name**: A Name for this instance
* **Host**: Specify the port number of FTP server
* **Port**: Specify the port number of FTP server
* **Filename**: Specify the filename to be transferred
* **Mode**: Specify the type of operation. READ / WRITE a file
* **Location**: Specify the location of the file to be uploaded
* **Remote Location**: Specify the remote location of the file on the FTP server
* **Username**: Specify the username for connecting to FTP server
* **Password**: Specify the password for connecting to FTP server
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
`msg.payload` contains the data read from spreadsheet
