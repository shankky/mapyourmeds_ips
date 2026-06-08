var express = require('express');
var router = express.Router();

const odbc = require('odbc');


async function connectODBC() {
    try {
//        const connection = await odbc.connect('DSN=mymd;UID=pelham;PWD=pelham');
        const connection = await odbc.connect('DSN=pelmeds_prod;UID=pelham;PWD=pelham');
		
         const result = await connection.query('SELECT * FROM dba.facility_fill_type'); // Change table name
		//const result = await connection.query("call sp_mym_getprescriptiondetailbyrxno('50078646')"); // Change table name
		
        console.log('Query Results:', result[128]);
        await connection.close();
    } catch (error) {
        console.error('ODBC Connection Error:', error);
    }
}

// DSN=ias_prod;UID=officer;PWD=officer

/*

CREATE TABLE "DBA"."PEM_MONO_MST" (
	"PEMONO" NUMERIC(4,0) NOT NULL,
	"PEMONOE_SN" NUMERIC(3,0) NOT NULL,
	"PEMTXTEI" VARCHAR(1) NULL,
	"PEMTXTE" VARCHAR(76) NULL,
	"PEMGNDR" VARCHAR(1) NULL,
	"PEMAGE" VARCHAR(1) NULL,
	PRIMARY KEY ( "PEMONO" ASC, "PEMONOE_SN" ASC )
) IN "system";


async function connectODBC() {
    try {
        const connection = await odbc.connect('DRIVER={SQL Anywhere 17};Server=pelmedsdb2024;DBN=ips;UID=pelham;PWD=pelham;HOST=pelmedsdb2024S');
        const result = await connection.query('SELECT * FROM my_table');
        console.log('Query Results:', result);
        await connection.close();
    } catch (error) {
        console.error('ODBC Connection Error:', error);
    }
}
*/

/* GET home page. */
router.get('/', function(req, res, next) {
	connectODBC();
  res.render('index', { title: 'Express' });
});

module.exports = router;
