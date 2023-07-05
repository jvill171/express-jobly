"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
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

/************************************** create */

describe("create", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let companies = await Company.findAll();
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let company = await Company.get("c1");
    
    expect(company.jobs.length).toEqual(2)
    expect(company).toEqual(expect.objectContaining({
      handle: "c1",
      name: "C1",
      description: "Desc1",
      numEmployees: 1,
      logoUrl: "http://c1.img",
      jobs: expect.any(Array)
    }));
    
  });

  test("works: company w/o jobs", async function () {
    let company = await Company.get("c2");
    expect(company.jobs.length).toEqual(0)
    expect(company).toEqual({
      handle: "c2",
      name: "C2",
      description: "Desc2",
      numEmployees: 2,
      logoUrl: "http://c2.img",
      jobs: []
    });
  });

  test("not found if no such company", async function () {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Company.remove("c1");
    const res = await db.query(
        "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});



/************************************** filter */

describe("filter", ()=>{
  test("works: name, emin, emax", async()=>{
    const res = await Company.filter({
      name: 'c1',
      emin: '1',
      emax: '10'
    });
    expect(res.length).toEqual(1);
    expect(res[0].name).toBe("C1")
  })
    
  test("works: partial name only", async()=>{
    const res = await Company.filter({
      name: 'c'
    });
    expect(res.length).toEqual(3);
    expect(res[0].name).toBe("C1")
  });

  test("works: emin only", async()=>{
    const res = await Company.filter({
      emin: '2'
    });
    expect(res.length).toEqual(2);
    expect(res[0].name).toBe("C2")
  });

  test("works: emax only", async()=>{
    const res = await Company.filter({
      emax: '2'
    });
    expect(res.length).toEqual(2);
    expect(res[0].name).toBe("C1")
  });
  
  test("works: ignores irrelevant query item", async()=>{
    const res = await Company.filter({
      name: 'C2',
      baddata:'extra query item'
    });
    expect(res.length).toEqual(1);
    expect(res[0].name).toBe("C2")
  });

  test("bad request: emin > emax", async()=>{
    try{
      await Company.filter({ emin: 20, emax: 1 });
      fail();
    } catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request: emin/emax isNaN", async()=>{
    try{
      await Company.filter({ emin: "notANumber", emax: "but text"});
      fail();
    } catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("not found: no company meets criteria", async()=>{
    try{
      await Company.filter({ name: 'z' });
      fail();
    } catch(err){
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});