## orpa-node-database [![orpa-node-database build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/5/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
### Nodes: 
* querydb-read
### Querydb Read
Connects to mysql database based on the connections details provided and executes the specified query. Query results are returned as the output of the node.
#### Inputs:
* **DB Type**: Specify the type of database to connect (e.g. mysql, oracle, db2, etc.)
* **Server**: Specify the database server details (IP address or hostname)
* **Database**: Specify the database instance name
* **Port**: Specify the port number to be used for connection
* **Connection String**: Specify the connection string for the database.
* **Username**: Specify the username for connecting to the database.
* **Password**: Specify the password for connecting to the database
* **Query**: Specify the query to be executed on the database
* **Timeout**: specify the timeout during lookup for the title operation
#### Outputs:
`msg.error` When an error happens contains the error message from underlying database connection
`msg.payload` contains the data read from database query