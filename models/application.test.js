"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Application = require("./application.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

let username, id;
beforeAll(async()=>{
    username = (await db.query(`SELECT username FROM users LIMIT 1`)).rows[0].username
    id = (await db.query(`SELECT id FROM jobs LIMIT 1`)).rows[0].id
})

describe("create", ()=>{
    test("works: good data", async()=>{
        const jApp = { username, id }
        await Application.create(jApp)
        let allApplications = await db.query( `SELECT username, job_id FROM applications` )
        expect(allApplications.rows.length).toEqual(1)
        expect(allApplications.rows[0].username).toEqual(username)
        expect(allApplications.rows[0].job_id).toEqual(id)
    })

    test("bad request: dupe application", async()=>{
        const jApp = { username, id }
        try{
            await Application.create(jApp)
            await Application.create(jApp)
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    })
})

describe("remove", ()=>{
    test("works", async()=>{
        const jApp = { username, id }

        await Application.create(jApp)
        let delResult = await Application.remove(jApp)
        // .remove() returns undefined if successful
        expect(delResult).toEqual(undefined)
        // Ensure 0 applications after 1 was created & deleted
        let allApplications = await db.query( `SELECT username, job_id FROM applications` )
        expect(allApplications.rows.length).toEqual(0)
    })

    test("not found", async()=>{
        try{
            const jApp = { username, id }
            await Application.remove(jApp)
            fail()
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy()
        }
    })
})