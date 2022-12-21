const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));

const emailRegex = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
const phoneRegex = /^\+?[0-9]{1,2}[0-9]{10}/;
const salt = "dhedr2tr43@5";

const setConnection = async () => {
  return await mysql.createConnection({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "password",
    database: "assignment_api",
  });
};

const validatePassword = (password, validationErrors) => {
  if (password.length < 8) {
    validationErrors.push({
      passwordMinLengthError: "Password needs a minimum of 8 characters",
    });
  }
  if (password.length > 15) {
    validationErrors.push({
      passwordMaxLengthError: "Password maximum length should be 15 characters",
    });
  }
  if (!/[0-9]+/.test(password)) {
    validationErrors.push({
      passwordNumberError: "Password should contain atleast one number",
    });
  }
  if (!/[A-Z]+/.test(password)) {
    validationErrors.push({
      passwordUpperCaseError:
        "Password should contain atleast one uppercase character",
    });
  }
  if (!/[a-z]+/.test(password)) {
    validationErrors.push({
      passwordLowerCaseError:
        "Password should contain atleast one lowercase character",
    });
  }
};

app.post("/register-patients", async (req, res) => {
  const psychiatristId = req.query.id;
  const validationErrors = [];
  const { name, address, email, phoneNumber, password } = req.body;
  if (!name) {
    validationErrors.push({ nameError: "Need a name" });
  }
  if (address.length < 10) {
    validationErrors.push({
      addressError: "Address needs a minimum of 10 characters",
    });
  }
  if (!emailRegex.test(email)) {
    validationErrors.push({ emailError: "Email address is not valid" });
  }
  if (phoneNumber && !phoneRegex.test(phoneNumber)) {
    validationErrors.push({
      phoneNumberError: "Phonenumber is not valid",
    });
  }
  validatePassword(password, validationErrors);

  if (validationErrors.length) {
    console.log(validationErrors);
    res.status(422);
    res.send(validationErrors);
    return;
  }

  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, `sha512`)
    .toString(`hex`);

  try {
    const connection = await setConnection();
    await connection.query(
      `INSERT INTO patients
      (
        name,
        address,
        email,
        phone,
        password,
        psychiatrists_id
      )
      VALUES
      (
        '${name}',
        '${address}',
        '${email}',
        '${phoneNumber || null}',
        '${hash}',
        ${psychiatristId}
      );`
    );
    res.send("Successfully registered patient");
  } catch (error) {
    console.log(error);
    res.status(400);
    res.send(error);
  }
});

app.get("/get-details/:hospitalId", async (req, res) => {
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
  } catch (error) {
    console.log(error);
    res.status(400);
    res.send(error);
  }
});

app.get("/get", async (req, res) => {
  try {
    const connection = await setConnection();
    const [result] = await connection.query("select * from patients");
    res.send(result);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.listen(port, () => {
  console.log("The server is now started at port" + port);
});
