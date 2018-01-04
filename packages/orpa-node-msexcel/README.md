## orpa-node-msexcel [![orpa-node-msexcel build status](https://frozen-fortress-98851.herokuapp.com/parodotdev/orpa-nodes/2/badge?subject=build)](https://travis-ci.org/parodotdev/orpa-nodes)
### This module is part of the OPAL framework
#### Nodes: 
* read excel 
* write excel
### Read Excel
Opens an **_xlsx_** or **_xls_** file spreasheet from a specified location and reads the contents. The contents can then be passed to downstream node or saved to a store variable
#### Inputs:
* **Name**: A Name for this read-excel instance
* **File Path**: choose the location from where the spreadsheet can be read
* **Sheet**: specify the name of the sheet to be read (E.g. Sheet 1)
* **Read Mode**: specify the mode used for reading. This can be Full Content,Rows,Colummns,Region
    * **Full Contents** - Fetches the entirer contents of the specified sheet  
    * **Rows** - A comma separated list of Numbers of the Rows that are to be fetched.  
    * **Columns** - A comma separated list of Names(e.g. A, B, AA etc) of the columns that are to be fetched
    * **Region** - A region notation as deinfed by this MSDN article ([Range Notation](https://msdn.microsoft.com/en-us/library/bb211395(v=office.12).aspx)). Only a single range expression is supported.
#### Output Formats: 
The output of the read operation can be a Simple JSON (Array of Arrays or Colmn Header indexed objects) with only the data or a more descriptive format. Details can be found from the xlsx project  
* **As Json** - Uses the simple JSON format
* **Use Column Labels** - Use column headers such A,B etc to index the data rather using Array of Array. Only for JSON mode
* **Remove Empty Rows** - Removes Empty Rows fromm a JSON output. Only for JSON mode
* **Timeout**: specify the timeout during lookup for the title operation.  
#### Outputs:
`msg.error` When an error happens contains the error message from the read operation
`msg.payload` contains the data read from spreadsheet

### Write Excel
Creates or Opens an xlsx/xls file spreasheet from the specified location and write the contents that are provided. The contents can be from upstream actions, variables (flow/global) or provided as literal text
#### Inputs:
* **Name**: A Name for this read-excel instance
* **File Path**: choose the location where the spreadsheet is to be written
* **Sheet**: specify the name of the sheet to be updated (E.g. Sheet 1)
* **Write Mode**: specify the mode used for writing. This can be Full Content,Rows,Colummns,Region
    * **Full Contents** - Updates the entire contents of the specified sheet - TBD
    * **Rows** - A comma separated list of Numbers of the Rows that are to be updated.
    * **Columns** -A comma separated list of Names(e.g. A, B, AA etc) of the columns that are to be updated
    * **Region** - A region notation as deinfed by this MSDN article ([Range Notation](https://msdn.microsoft.com/en-us/library/bb211395(v=office.12).aspx)). Only a single range expression is supported.
* **Timeout**: specify the timeout during lookup for the title operation.
#### Input Formats: 
The input data to be written to the spreradsheet is always provided as an array of arrays. This
				is expected to be a valid json. Use the below guidelines. A JSON formatter will be available in a later release.

* **Number** - Uses the simple JSON format
* **String** - Use column headers such A,B etc to index the data rather using Array of Array. Only for JSON mode
* **Boolean** - Removes Empty Rows fromm a JSON output. Only for JSON mode
* **Date** - Specified like a string with surrounding quotes. The list of date formats shown below are support and will be automatically parsed. Others maybe set as text. The list of supported formats will be configurable in a later release
#### Outputs:
`msg.error` When an error happens contains the error message from update operation

