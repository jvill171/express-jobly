"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");
const { BadRequestError } = require("../expressError");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// /************************************** POST /jobs */

describe("POST /jobs", ()=>{
    const newJob = {
        title: "NewJob",
        salary: 100,
        equity: 1,
        companyHandle:"c2",
    }

    test("ok for admin", async()=>{
        const resp = await request(app)
            .post('/jobs')
            .send(newJob)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(201);

        // Explicitly converts equity from 
        // NUMERIC to STR, which is returned by query 
        let numericJob = {
            ...newJob,
            id: resp.body.job.id,
            equity: String(newJob.equity)
        }
        numericJob.equity = String(newJob.equity)
        expect(resp.body).toEqual({ job: numericJob })
    })
    
    test("unauth for non-admin", async()=>{
        const resp = await request(app)
            .post('/jobs')
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    })

    test("bad request missing required data", async()=>{
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "NewJob",
                salary: 100,
                equity: 1,
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400)
    })

    test("bad request with invalid data", async()=>{
        
        const badJob = {
            title: "NewJob",
            salary: "WRONG",
            equity: "BAD",
            companyHandle:"c2",
        }
        const resp = await request(app)
            .post("/jobs")
            .send({ ...badJob })
            .set("authorization", `Bearer ${u2Token}`);
            expect(resp.statusCode).toEqual(400);
    })
})

// /************************************** GET /jobs */

describe("GET /jobs", ()=>{
    test("ok for anon", async()=>{
        const resp = await request(app).get("/jobs");
        expect(resp.body.jobs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j1',
                    salary: 150000,
                    equity: '0',
                    companyHandle: 'c1',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j2',
                    salary: 100000,
                    equity: '1',
                    companyHandle: 'c1',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j3',
                    salary: 50000,
                    equity: null,
                    companyHandle: 'c2',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j4',
                    salary: 60000,
                    equity: '0.5',
                    companyHandle: 'c3',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j5',
                    salary: null,
                    equity: null,
                    companyHandle: 'c3',
                }),
            ])
        );    
    })

    test("fails: test next() handler", async()=>{
        // there's no normal failure event which will cause this route to fail ---
        // thus making it hard to test that the error-handler works with it. This
        // should cause an error, all right :)
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(500)
    })

    //----------------- GET /jobs (with query strings) -----------------
    test("works: query string", async()=>{
        const resp = await request(app).get("/jobs?t=j&smin=120000");
        expect(resp.body).toEqual({
            jobs: [
              {
                id: expect.any(Number),
                title: 'j1',
                salary: 150000,
                equity: '0',
                companyHandle: 'c1'
              },
            ]
          })
    })

    test("works: query string, includes extra query item (ignored)", async()=>{
        const resp = await request(app).get("/jobs?smin=100000&baddata=notgood")
        expect(resp.body).toEqual({
            jobs: [
              {
                id: expect.any(Number),
                title: 'j1',
                salary: 150000,
                equity: '0',
                companyHandle: 'c1'
              },
              {
                id: expect.any(Number),
                title: 'j2',
                salary: 100000,
                equity: '1',
                companyHandle: 'c1'
              },
            ]
          })
    })

    test("works: query string, eq = false", async()=>{
        const resp = await request(app).get("/jobs?eq=false")
        expect(resp.body.jobs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j1',
                    salary: 150000,
                    equity: '0',
                    companyHandle: 'c1',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j2',
                    salary: 100000,
                    equity: '1',
                    companyHandle: 'c1',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j3',
                    salary: 50000,
                    equity: null,
                    companyHandle: 'c2',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j4',
                    salary: 60000,
                    equity: '0.5',
                    companyHandle: 'c3',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j5',
                    salary: null,
                    equity: null,
                    companyHandle: 'c3',
                }),
            ])
        ); 
    })

    test("works: query string, eq = true", async()=>{
        const resp = await request(app).get("/jobs?eq=true")
        expect(resp.body.jobs.length).toEqual(2)
        expect(resp.body.jobs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j2',
                    salary: 100000,
                    equity: '1',
                    companyHandle: 'c1',
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: 'j4',
                    salary: 60000,
                    equity: '0.5',
                    companyHandle: 'c3',
                }),
            ])
        ); 
    })

    test("bad request: query string, eq is invalid", async()=>{
        try{
            const resp = await request(app).get("/jobs?eq=baddata")
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy()
        }
    })

    test("query string, ONLY extra query item (ignored)", async()=>{
        const resp = await request(app).get("/jobs?baddata=notgood");
        expect(resp.body).toEqual({
            jobs: [
              {
                id: expect.any(Number),
                title: 'j1',
                salary: 150000,
                equity: '0',
                companyHandle: 'c1'
              },
              {
                id: expect.any(Number),
                title: 'j2',
                salary: 100000,
                equity: '1',
                companyHandle: 'c1'
              },
              {
                id: expect.any(Number),
                title: 'j3',
                salary: 50000,
                equity: null,
                companyHandle: 'c2'
              },
              {
                id: expect.any(Number),
                title: 'j4',
                salary: 60000,
                equity: '0.5',
                companyHandle: 'c3'
              },
              {
                id: expect.any(Number),
                title: 'j5',
                salary: null,
                equity: null,
                companyHandle: 'c3'
              }
            ]
          })
    })

    test("error: query string, empty item", async()=>{
        try{
            await request(app).get("/companies?smin=&t=j");
            // fail()
        } catch(err){
            console.log(err)
            expect(err instanceof ExpressError).toBeTruthy()
        }
    })
})

// /************************************** GET /jobs/:id */

describe("GET /jobs/:id", ()=>{
    let jobID;
    beforeAll(async()=>{
        jobID = (await db.query(  `SELECT id FROM jobs LIMIT 1` )).rows[0].id
    })
    test("works for anon", async()=>{
        const resp = await request(app).get(`/jobs/${jobID}`)
        expect(resp.body).toEqual({
            job: {
                id: jobID,
                title: 'j1',
                salary: 150000,
                equity: '0',
                companyHandle: 'c1',
            }
        })
    })

    test("not found: no such job", async()=>{
        const resp = await request(app).get(`/jobs/0`)
        expect(resp.statusCode).toEqual(404)
    })
})

// /************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", ()=>{
    let jobID;
    beforeAll(async()=>{
        jobID = (await db.query(  `SELECT id FROM jobs LIMIT 1` )).rows[0].id
    })
    test("works for admin", async()=>{
        const resp = await request(app)
            .patch(`/jobs/${jobID}`)
            .send({
                title: "J1-new"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.body).toEqual({
            job: {
                id: jobID,
                title: 'J1-new',
                salary: 150000,
                equity: '0',
                companyHandle: 'c1',
            }
        })
    })

    test("unauth for user", async()=>{
        const resp = await request(app)
            .patch(`/jobs/${jobID}`)
            .send({
                title: "J1-new"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401)
    })

    test("unauth for anon", async()=>{
        const resp = await request(app)
            .patch(`/jobs/${jobID}`)
            .send({
                title: "J1-new"
            })
        expect(resp.statusCode).toEqual(401)
    })

    test("not found: no such job", async()=>{
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: "new nope"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(404)
    })

    test("bad request: invalid data", async()=>{
        const resp = await request(app)
            .patch(`/jobs/${jobID}`)
            .send({
                salary: "Not a number"
            })
            .set("authorization", `Bearer ${u2Token}`);
    })
})

// /************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", ()=>{
    let jobID;
    beforeAll(async()=>{
        jobID = (await db.query(  `SELECT id FROM jobs LIMIT 1` )).rows[0].id
    })

    test("works for admin", async()=>{
        const resp = await request(app)
            .delete(`/jobs/${jobID}`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.body).toEqual({deleted: `${jobID}`})
    });


    test("unauth for user", async()=>{
        const resp = await request(app)
            .delete(`/jobs/${jobID}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async()=>{
        const resp = await request(app)
            .delete(`/jobs/${jobID}`)
        expect(resp.statusCode).toEqual(401);
    });

    test("not found: no such job", async()=>{
        const resp = await request(app)
            .delete(`/jobs/0`)
            .set("authorization", `Bearer ${u2Token}`);
            expect(resp.statusCode).toEqual(404);
    });
})