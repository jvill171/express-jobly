"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdminLoggedIn,
  ensureOwnerOrAdmin,
  preventGainAdmin,
} = require("./auth");


const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");


describe("authenticateJWT", function () {
  test("works: via header", function () {
    expect.assertions(2);
     //there are multiple ways to pass an authorization token, this is how you pass it in the header.
    //this has been provided to show you another way to pass the token. you are only expected to read this code for this project.
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    expect.assertions(2);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});


describe("ensureLoggedIn", function () {
  test("works", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", is_admin: false } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureLoggedIn(req, res, next);
  });
});

describe("ensureAdminLoggedIn", function () {
  test("works: isAdmin = true", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureAdminLoggedIn(req, res, next);
  });

  test("unauth isAdmin = false", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureAdminLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureAdminLoggedIn(req, res, next);
  });
});


describe("ensureOwnerOrAdmin", function () {
  test("works: is owner, is admin", function () {
    expect.assertions(1);
    const req = { params:{ username: "Me" } };
    const res = { locals:{ user:{ username: "Me", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureOwnerOrAdmin(req, res, next);
  });

  test("works: not owner, is admin", function () {
    expect.assertions(1);
    const req = { params:{ username: "NotMe" } };
    const res = { locals:{ user:{ username: "Me", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureOwnerOrAdmin(req, res, next);
  });
  
  test("works: is owner, not admin", function () {
    expect.assertions(1);
    const req = { params:{ username: "Me" } };
    const res = { locals:{ user:{ username: "Me", isAdmin: false } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureOwnerOrAdmin(req, res, next);
  });
  
  test("unauthorized: not owner, not admin", function () {
    expect.assertions(1);
    const req = { params:{ username: "NotMe" } };
    const res = { locals:{ user:{ username: "Me", isAdmin: false } } };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureOwnerOrAdmin(req, res, next);
  });
});

describe("preventGainAdmin", function () {
  test("works: admin, NOT modifying isAdmin", function () {
    expect.assertions(1);
    const req = { body:{ } };
    const res = { locals:{ user:{ username: "Me", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    preventGainAdmin(req, res, next);
  });

  test("works: admin, modifying isAdmin", function () {
    expect.assertions(1);
    const req = { body:{ isAdmin: true } };
    const res = { locals:{ user:{ username: "Me", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    preventGainAdmin(req, res, next);
  });

  test("works: NOT admin, NOT modifying isAdmin", function () {
    expect.assertions(1);
    const req = { body:{ } };
    const res = { locals:{ user:{ username: "Me", isAdmin: false } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    preventGainAdmin(req, res, next);
  });

  test("forbidden: NOT admin, modifying isAdmin", function () {
    expect.assertions(1);
    const req = { body:{ isAdmin: true } };
    const res = { locals:{ user:{ username: "Me", isAdmin: false } } };
    const next = function (err) {
      expect(err instanceof ForbiddenError).toBeTruthy();
    };
    preventGainAdmin(req, res, next);
  });
});