"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdminLoggedIn } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();



/** POST / { job } => { job }
 * 
 * job should be { title, salary, equity, companyHandle }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: Admin
*/

router.post("/", ensureAdminLoggedIn, async(req, res, next)=>{
    try{
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if(!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch(err){
        return next(err)
    }
})

/**GET / =>
 *    { jobs: [ { id, title,  salary,  equity, companyHandle }, ...] }
 * 
 *  Can filter on provided search filters:
 *  - t     (job title)
 *  - smin  (minimum salary)
 *  - eq    (Boolean: has equity )
 *  
 * Authorization required: none
 */

router.get("/", async(req, res, next)=>{
    let {t, smin, eq} = req.query;
    try{
        // Ensure only Job.filter() if includes these fields in query
        if(t || smin || eq){
            const jobs = await Job.filter(req.query);
            return res.json({ jobs })
        }

        const jobs = await Job.findAll();
        return res.json({ jobs })
    }catch(err){
        return next(err)
    }
})

/** GET /[id] => { job }
 * 
 * job is { id, title,  salary,  equity, companyHandle }
 * 
 * Authorization required: none
 */

router.get("/:id", async(req, res, next)=>{
    try{
        const job = await Job.get(req.params.id);
        return res.json({ job })
    } catch(err){
        return next(err);
    }
})

/** PATCH /[id] { fld1, fld2, ...} => { job }
 * 
 * Patches job data
 * 
 * fields can be: { title, salary, equity }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: Admin
*/

router.patch("/:id", ensureAdminLoggedIn, async(req, res, next)=>{
    try{
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if(!validator.valid){
            const errs = validator.errors.map(e=> e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    } catch(err){
        return next(err)
    }
})

/** DELETE /[id] => { deleted: id }
 * 
 * Authorization: Admin
 */
router.delete("/:id",ensureAdminLoggedIn, async(req, res, next)=>{
    try{
        await Job.remove(req.params.id);
        return res.json({ deleted: req.params.id })
    } catch(err){
        return next(err)
    }
})

module.exports = router;
