const { sqlForPartialUpdate }= require("./sql")
const { BadRequestError } = require("../expressError");


describe("sqlForPartialUpdate", ()=>{

    const data = {
        firstName: "fTest",
        lastName:"lTest",
    }
    const toSql ={
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin"
    }

    test("works: valid data & values", ()=>{
        const result = sqlForPartialUpdate(data, toSql);
        expect(result).toEqual({
            setCols: '"first_name"=$1, "last_name"=$2',
            values: [ 'fTest', 'lTest' ]
        })
    })

    test("error: no data", ()=>{
        try{
            let result = sqlForPartialUpdate({}, toSql);
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    })
})
