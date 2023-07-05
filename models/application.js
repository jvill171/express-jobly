"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");

/** Related functions for applications. */

class Application {

    /** Create an application (from data), update db, return
     * 
     * data should be { username, job ID}
     * 
     * Returns  {applied: job ID}
     */

    static async create({username, id}){
        const duplicateCheck = await db.query(
            `SELECT username
             FROM applications
             WHERE username = $1 AND job_id = $2`,
             [username, id]);
        
        if(duplicateCheck.rows.length !== 0){
            throw new BadRequestError(`Duplicate application: ${username} - ${id}`)
        }

        const result = await db.query(
            `INSERT INTO applications
            (username, job_id)
            VALUES ($1, $2)
            RETURNING job_id AS "jobId"`,
            [username, id]);
        
        const application = result.rows[0].jobId;
        return application;
    }

    /**Delete an application from database, returns undefined
     * 
     * Throws NotFoundError if application not found
     */
    static async remove({username, id}){
        const result = await db.query(
            `DELETE
             FROM applications
             WHERE username = $1 AND job_id = $2
             RETURNING job_id AS "jobId"`,
             [username, id]
        )
        
        const application = result.rows[0]
        if(!application) throw new NotFoundError(`Application Not Found: ${username} - ${id}`)
    }
}


module.exports = Application;
