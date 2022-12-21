const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;
app.use(bodyParser.json());

const setConnection = async () => {
  return await mysql.createConnection({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "password",
    database: "assignment_api",
  });
};

app.get("/getdetails/:hospitalId", async (req, res) => {
  const hospitalId = req.params.hospitalId;
  try {
    const connection = await setConnection();
    const [result] = await connection.query(
      `SELECT h.id as "hospitalId", h.hospital_name as "hospitalName", psy.id as "psychId", psy.name as "psychName", count(p.id) as "patientCount"
      FROM assignment_api.hospital h
      left join psychiatrists psy on h.id = psy.hospital_id
      left join patients p on p.psychiatrists_id = psy.id
      where h.id = ${hospitalId}
      group by psy.id, h.id;`
    );

    const [{ hospitalName }] = result;
    const psychiatristCount = result.length;
    const totalPatientsCount = result.reduce((prev, current) => {
      return prev + current.patientCount;
    }, 0);
    const psychiatristsDetails = result.map((item) => {
      return {
        id: item.psychId,
        name: item.psychName,
        patientCount: item.patientCount,
      };
    });

    res.send({
      hospitalName,
      psychiatristCount,
      totalPatientsCount,
      psychiatristsDetails,
    });
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.get("/get", async (req, res) => {
  try {
    const connection = await setConnection();
    const [result] = await connection.query("select * from patients");
    res.send(result);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.listen(port, () => {
  console.log("The server is now started at port" + port);
});
