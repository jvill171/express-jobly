"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForFiltering } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {

    /** Create a job (from data), update db, return new job data.
     * 
     * data should be { title, salary, equity, company_handle }
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Ensure companyHandle is valid & exists in DB before creation
     * 
     * Duplicate jobs allowed
     */
    static async create({ title, salary, equity, companyHandle }){
        let exists = await db.query(
            `SELECT handle
             FROM companies
             WHERE handle = $1`,
             [companyHandle]
        )
        if(exists.rows.length === 0){
            throw new NotFoundError(`CompanyHandle not found: ${companyHandle}`)
        }

        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title, 
                salary, 
                equity, 
                companyHandle
            ],
        );

        const job = result.rows[0];
        return job;
    }

    /**Find all jobs
     * 
     * return [{id,  title, salary, equity, companyHandle }, ...]
     */
    static async findAll(){
        const jobsRes = await db.query(
            `SELECT
                id,
                title, 
                salary, 
                equity, 
                company_handle AS "companyHandle"
            FROM jobs
            ORDER BY title`);
        return jobsRes.rows;

    }

    /** Given a job title, return data about that job
     * 
     * Returns {id,  title, salary, equity, companyHandle }
     * 
     * Throws NotFoundError if not found.
     */
    static async get(id){
        const jobRes = await db.query(
            `SELECT 
                id,
                title, 
                salary, 
                equity, 
                company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id]);
        const job = jobRes.rows[0];

        if(!job) throw new NotFoundError(`No job found: ${id}`);

        return job;
    }
    
    /** Updata job data with `data`.
     * 
     * This is a "partial update" --- it's fine if data doesn't contain all the fields; this only changes provided ones.
     * 
     * Data can include: { title, salary, equity }
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Throws NotFoundError if not found.
     */
    static async update(id, data){
        const { setCols, values } = sqlForPartialUpdate(
            data,
            { }
        )
        const handeVarIdx = "$" + (values.length + 1);

        const querySql = 
            `UPDATE jobs
             SET ${setCols}
             WHERE id = ${handeVarIdx}
             RETURNING id,
                       title, 
                       salary, 
                       equity, 
                       company_handle AS "companyHandle"`;

        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if(!job) throw new NotFoundError(`No job with id of ${id}`)

        return job;
    }

    /** Delete given job from database; returns undefined.
     * 
     * Throws NotFoundError if job not found.
     **/
    static async remove(id){
        const result = await db.query(
            `DELETE FROM jobs
            WHERE id = $1
            RETURNING id`,
            [id]);
        const job = result.rows[0]

        if(!job) throw new NotFoundError(`No job with id of ${id}`);
    }

    /** Find all jobs that meet filtered criteria.
     * 
     * Filtered criteria includes: title, salary (minimum), equity (does it have equity)
     *  represented by t, smin, eq.
     * 
     * data can include: { t, smin, eq }
     * note: any items not listed in the example above is ignored
     * 
     * Returns  { id, title, salary, equity, companyHandle } for each company found
     * 
     * Throws NotFoundError if no company meets criteria.
     */


    static async filter({t, smin, eq}){
        let colNames = {};
        let action = {};

        if(t){
             colNames["t"] = "title";
             action["t"] = "ILIKE";
        }
        if(smin){
             colNames["smin"] = "salary";
             action["smin"] = ">=";
        }
        if(eq){
            // Validate eq is boolean value "true" or "false"
            if (eq.toLowerCase() === 'true' || eq.toLowerCase() === 't' ){
                colNames["eq"] = "equity";
                eq = '0';
                action["eq"] = ">";
            }
            else if (eq.toLowerCase() === 'false' || eq.toLowerCase() === 'f' ){
                // pretend eq wasnt received
                eq = undefined
            }
            else
                throw new BadRequestError(`Invalid equity '${eq}': equity may only be 'true' or 'false'`)
        }
        
        let filterData = {t, smin, eq}
        const {filterCols, values} = sqlForFiltering(colNames, filterData, action)

        const baseQuery =
        `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
         FROM jobs`

        // Needed due to the fact eq can be modified to be undefined,
        // thus breaking the query when using sqlForFiltering()
        // By having empty filterCols & values
        let queryFilters = '';
        if(t || smin || eq){
            queryFilters = ` WHERE ${filterCols}`
        }
        const endQuery = baseQuery + queryFilters;

        const jobRes = await db.query( endQuery, [...values]);
        const jobs = jobRes.rows;

        if(jobs.length == 0) throw new NotFoundError(`No job found matching criteria.`);

        return jobs
    }

}


module.exports = Job;
