const { BadRequestError, ExpressError } = require("../expressError");

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
 * colNames is a dictionary object:     { name1: "DB_col_1", name2: "DB_col_2", ... }
 * dataToFilter is a dictionary object: { name1: "value1", name2: "value2", ... }
 * action is a dictionary object: { name1: "LIKE", name2: "=", ... }
 * 
 * NOTE: All 3 objects MUST have keys that match. (parallel keys)
 * 
 * Returns an object like:
 *      {
 *          filterCols: '"name" ILIKE $1 AND "num_employees"<=$2 AND "num_employees">=$3',
 *          values: ['%value1%', 'value2', 'value3']
 *      }
*/

function sqlForFiltering(colNames, dataToFilter, action){
  const supported = ["ILIKE", "=", "<>", "<", ">", "<=", ">="]
  const keys = Object.keys(colNames);

  const filterCols = keys.map((curCol, idx) => {
    const curAction = action[keys[idx]];
    // In case of coder error, but not too much info given for security
    if(!supported.includes(curAction)){
      throw new ExpressError(`Internal Error: Invalid action on ${keys[idx]}`, 500)
    }
    // Ensure partial matching
    if(["ILIKE"].includes(curAction)){
      dataToFilter[keys[idx]] = `%${ dataToFilter[ keys[idx] ] }%` 
    }

    return `"${colNames[curCol]}" ${curAction} $${idx + 1}`;
  });
  
  const values = Object.keys(colNames).map(key=>dataToFilter[key]);

  return {
    filterCols: filterCols.join(" AND "),
    values
  }
}

module.exports = { sqlForPartialUpdate, sqlForFiltering };
