const { sqlForPartialUpdate, companyFiltering }= require("./sql")
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

describe("companyFiltering", ()=>{
    // All cols
    const cols1 = { name: 'name', emin: 'num_employees', emax: 'num_employees' }
    const data1 = { name: 'test', emin: '1', emax: '100' }
    // emin & emax only
    const cols2 = { emin: 'num_employees', emax: 'num_employees' }
    const data2 = { emin: '1', emax: '100' }
    // name only
    const cols3 = { name: 'name'}
    const data3 = { name: 'test'}

    test("works: All colums", ()=>{
        let c = Object.assign({}, cols1);
        let d = Object.assign({}, data1);
        
        const result = companyFiltering(c, d);
        expect(result).toEqual({
            filterCols: '"name" ILIKE $1 AND "num_employees">=$2 AND "num_employees"<=$3',
            values: [ '%test%', '1', '100' ]
          })
    })
    test("works: emin & emax only", ()=>{
        let c = Object.assign({}, cols2);
        let d = Object.assign({}, data2);
        
        const result = companyFiltering(c, d);
        expect(result).toEqual({
            filterCols: '"num_employees">=$1 AND "num_employees"<=$2',
            values: [ '1', '100' ]
          })
    })
    test("works: name only", ()=>{
        let c = Object.assign({}, cols3);
        let d = Object.assign({}, data3);
        
        const result = companyFiltering(c, d);
        expect(result).toEqual({
            filterCols: '"name" ILIKE $1',
            values: [ '%test%' ]
          })
    })
    test("works: no data - should never happen", ()=>{
        const result = companyFiltering({}, {});
        expect(result).toEqual({
            filterCols: '',
            values: []
          })
    })
    test("works: more cols than data - should never happen", ()=>{
        let c = Object.assign({}, cols1);
        let d = Object.assign({}, data3);
        
        const result = companyFiltering(c, d);
        expect(result).toEqual({
            filterCols: '"name" ILIKE $1',
            values: [ '%test%' ]
        })
    })
    test("works: more data than cols - should never happen", ()=>{
        let c = Object.assign({}, cols3);
        let d = Object.assign({}, data1);
        const result = companyFiltering(c, d);
        expect(result).toEqual({
            filterCols: '"name" ILIKE $1 AND "undefined">=$2 AND "undefined"<=$3',
            values: [ '%test%', '1', '100' ]
        })
    })
})
