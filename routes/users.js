"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureAdminLoggedIn, ensureOwnerOrAdmin, preventGainAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const Application = require("../models/application");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: Admin
 **/

router.post("/", ensureAdminLoggedIn, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: Admin
 **/

router.get("/", ensureAdminLoggedIn, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: login as Owner or Admin
 **/

router.get("/:username", ensureLoggedIn, ensureOwnerOrAdmin, async function (req, res, next) {
  
  try {
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login as either Owner or Admin
 * NOTE: only admin can change is_admin.
 **/

router.patch("/:username", ensureLoggedIn, ensureOwnerOrAdmin, preventGainAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** POST /[username]/jobs/[job_id] => { applied: jobId }
 * 
 * Authorization required: as either Owner or Admin
*/
router.post("/:username/jobs/:id", ensureLoggedIn, ensureOwnerOrAdmin, async(req, res, next)=>{
  try{
    let applied = await Application.create(req.params);

    return res.json({applied})
  } catch(err){
    return next(err)
  }
})

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login as either Owner or Admin
 **/

router.delete("/:username", ensureLoggedIn, ensureOwnerOrAdmin, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
