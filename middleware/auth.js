"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError, ForbiddenError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}


/** Middleware to use when they must be logged in AS AN ADMIN.
 *
 * If not, raises Unauthorized.
 */
function ensureAdminLoggedIn(req, res, next) {
  try {
    if (!res.locals.user || !res.locals.user.isAdmin) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when they must be logged in as the Owner OR Admin.
 *
 * If not, raises Unauthorized.
 */
function ensureOwnerOrAdmin(req, res, next) {
  try {
    // If not NOT (owner || admin) 
    if(!(req.params.username === res.locals.user.username || res.locals.user.isAdmin)){
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when preventing privilege escalation. 
 *
 * Prvents regular user from updating their privilages to have admin rights
 * 
 * If not, raises Unauthorized.
 */
function preventGainAdmin(req, res, next){
  try{
    // If is owner (non-admin) and attempting to gain admin rights, prevent it.
    if((!res.locals.user.isAdmin) && req.body.isAdmin === true){
      throw new ForbiddenError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdminLoggedIn, 
  ensureOwnerOrAdmin,
  preventGainAdmin,
};
