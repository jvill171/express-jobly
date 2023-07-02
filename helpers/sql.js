const { BadRequestError } = require("../expressError");

/** Creates a string for use in a query and an array of values
 * 
 * dataToUpdate is a dictionary object:   { name: "value", ... }
 * Each dataToUpdate's "value" is added to an array
 * 
 * jsToSql is a dictionary object:        { name: "col_name_in_DB", ... }
 * Each jsToSql item is mapped as:        "col_name_in_DB"=$<idx>
 *        where <idx> = the count/# of each column to be updated
 * 
 * Returns an object like:
 *      {
 *          setCols: '"col_X_in_DB"=$1,  "col_Y_in_DB"=$2',
 *          values: ['value1', 'value2']
 *      }
*/
  

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/** Creates a string of filter conditions and an array of values to query companies table
 * 
 * colNames is a dictionary object:     { name: "col_name_in_DB", ... }
 * dataToFilter is a dictionary object: { name: "value", ... }
 * 
 * Possible columns to filter by are:
 *  name - using ILIKE for case-insesetive filtering of company names
 *  emin - num_employees minimum
 *  emax - num_employees maximum
 * 
 * Returns an object like:
 *      {
 *          filterCols: '"name" ILIKE $1 AND "num_employees"<=$2 AND "num_employees">=$3',
 *          values: ['%value1%', 'value2', 'value3']
 *      }
*/

function companyFiltering(colNames, dataToFilter){
  const keys = Object.keys(colNames);

  if(keys.includes("name")) dataToFilter.name = `%${dataToFilter.name}%`

  const filterCols = keys.map((curCol, idx)=>{
    let action;
    if(keys[idx] === 'name') action = " ILIKE ";
    else if(keys[idx] === 'emin') action = ">=";
    else if(keys[idx] === 'emax') action = "<=";

    return `"${colNames[curCol]}"${action}$${idx+1}`
  })
  
  return {
    filterCols: filterCols.join(" AND "),
    values: Object.values(dataToFilter)
  }
}

module.exports = { sqlForPartialUpdate, companyFiltering };
