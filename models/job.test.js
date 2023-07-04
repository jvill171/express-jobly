"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");
const { sqlForPartialUpdate, sqlForFiltering } = require("../helpers/sql.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** create */

describe("create", function () {

    const newJob = {
        title: 'NewJob' ,
        salary: 50000 ,
        equity: '0.2' ,
        companyHandle: "c1",
    };

    test("works", async ()=>{
        let job = await Job.create(newJob);
        expect(job).toEqual({
            id: job.id,
            ...newJob
        });
        
        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE title = 'NewJob'
            `);
        expect(result.rows).toEqual([
            {id: job.id, title: 'NewJob' , salary: 50000 , equity: '0.2' , companyHandle: 'c1', }
        ]);
    })
    
    test("works: create dupe opening", async ()=>{
        try{
            await Job.create(newJob)
            await Job.create(newJob)
        } catch(err){
            expect(err).toBeFalsy()
        }
    })
    test("notfound: bad companyHandle", async()=>{
        let badJob = newJob;
        badJob.companyHandle = 'bad';
        try{
            await Job.create(badJob);
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy()
        }
    })
});
    
/************************************** findAll */

describe("findAll", ()=>{
    test("works: no filter", async ()=>{
        let jobs = await Job.findAll();

        expect(jobs.length).toEqual(5)
    } )
})

/************************************** get */

describe("get", ()=>{
    let myID;

    beforeAll(async()=>{
        myID = (await db.query(  `SELECT id FROM jobs LIMIT 1` )).rows[0].id
    })
    test("works", async()=>{
        let job = await Job.get(myID);

        expect(job).toEqual({
            id:myID, title: 'J1', salary: 100000, equity: null, companyHandle: 'c1'
        })
    })

    test("not found if no such job", async()=>{
        try{
            await Job.get(myID - 1);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    })
})

/************************************** update */

describe("update", ()=>{
    
    let myID;

    beforeAll(async()=>{
        myID = (await db.query(  `SELECT id FROM jobs LIMIT 1` )).rows[0].id
    })

    const updateData = {
        title: 'NewJob' ,
        salary: 100 ,
        equity: '1'
    };

    test("works", async()=>{
        let job = await Job.update(myID, updateData);

        expect(job).toEqual({
            id:myID,
            companyHandle:'c1',
            ...updateData
        })
    })

    test("works: null fields", async()=>{
         const updateDataSetNulls = {
            title: 'NewJob' ,
            salary: null ,
            equity: null
         }

         let job = await Job.update(myID, updateDataSetNulls)
         expect(job).toEqual({
            id:myID,
            companyHandle:'c1',
            ...updateDataSetNulls
         })
    })

    test("not found if no such job", async()=>{
        try{
            await Job.update(myID - 1, updateData);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    })

    test("bad request with no data", async()=>{
        try{
            await Job.update(myID - 1, {});
            fail();
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    })
})
    
/************************************** remove */

describe("remove", ()=>{
    let myID;

    beforeAll(async()=>{
        myID = (await db.query(  `SELECT id FROM jobs LIMIT 1` )).rows[0].id
    })

    test("works", async()=>{
        await Job.remove(myID);
        const res = await db.query(
            `SELECT id FROM jobs WHERE id=${myID}`);
        expect(res.rows.length).toEqual(0);
    })

    test("not found if no such job", async()=>{
        try{
            await Job.remove(myID)
            await Job.remove(myID)
            fail()
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    })
})

/************************************** filter */

describe("filter", ()=>{
    test("works: t, smin, eq", async()=>{
        const res = await Job.filter({
            t:'J1',
            smin:'1000',
            eq: 'false',
        })
        expect(res.length).toEqual(1)
        expect(res[0].title).toBe("J1")
    })

    test("works: title case-insensetive", async()=>{
        const res = await Job.filter({
            t:'j2'
        })
        expect(res.length).toEqual(1)
        expect(res[0].title).toBe("J2")
    })

    test("works: partial title only", async()=>{
        const res = await Job.filter({
            t:'j'
        })
        expect(res.length).toEqual(5)
        expect(res).toEqual([
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J1',
                    salary: 100000,
                    equity: null,
                    companyHandle: 'c1'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J2',
                    salary: 120000,
                    equity: '0',
                    companyHandle: 'c1'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J3',
                    salary: 60000,
                    equity: '0.5',
                    companyHandle: 'c2'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J4',
                    salary: 40000,
                    equity: '1.0',
                    companyHandle: 'c3'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J5',
                    salary: 70000,
                    equity: '0.025',
                    companyHandle: 'c3'
                }),
            ]
        )
    })
    
    test("works: smin only", async()=>{
        const res = await Job.filter({
            smin:'100000'
        })
        expect(res.length).toEqual(2)
        expect(res).toEqual([
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J1',
                    salary: 100000,
                    equity: null,
                    companyHandle: 'c1'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J2',
                    salary: 120000,
                    equity: '0',
                    companyHandle: 'c1'
                }),
            ]
        )
    })
    
    test("works: eq only, true", async()=>{
        const res = await Job.filter({
            eq:'true'
        })
        expect(res.length).toEqual(3)
        expect(res).toEqual([
            expect.objectContaining({
                id: expect.any(Number),
                title: 'J3',
                salary: 60000,
                equity: '0.5',
                companyHandle: 'c2'
            }),
            expect.objectContaining({
                id: expect.any(Number),
                title: 'J4',
                salary: 40000,
                equity: '1.0',
                companyHandle: 'c3'
            }),
            expect.objectContaining({
                id: expect.any(Number),
                title: 'J5',
                salary: 70000,
                equity: '0.025',
                companyHandle: 'c3'
            }),
            ]
        )
    })

    test("works: eq only, false", async()=>{
        const res = await Job.filter({
            eq:'false'
        })
        expect(res.length).toEqual(5)
        expect(res).toEqual([
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J1',
                    salary: 100000,
                    equity: null,
                    companyHandle: 'c1'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J2',
                    salary: 120000,
                    equity: '0',
                    companyHandle: 'c1'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J3',
                    salary: 60000,
                    equity: '0.5',
                    companyHandle: 'c2'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J4',
                    salary: 40000,
                    equity: '1.0',
                    companyHandle: 'c3'
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'J5',
                    salary: 70000,
                    equity: '0.025',
                    companyHandle: 'c3'
                }),
            ]
        )
    })

    test("bad request: invalid eq", async()=>{
        try{
            const res = await Job.filter({
                eq:'badData'
            })
            fail();
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy()
        }
    })

    test("works: ignores irrelevante query item", async()=>{
        const res = await Job.filter({
            t:'5',
            baddata:'extra query item'
        })
        expect(res.length).toEqual(1)
        expect(res[0].title).toBe("J5")
    })

    test("not found: no job meets criteria", async()=>{
        try{
            await Job.filter({ t: 'z' });
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }

    })
})