const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sql = require("mssql");
const jwt = require('jsonwebtoken');

const app = express();

const crypto = require('crypto');
const bcrypt = require('bcrypt');


// Generate a 64-character random secret key
const secretKey = crypto.randomBytes(64).toString('hex');
console.log(`Your JWT secret key: ${secretKey}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection configuration
const dbConfig = {
    user: "Abhi",
    password: "Abhi31",
    server: "ABHI",
    database: "Employees",
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// Connect to the database
sql.connect(dbConfig)
    .then(() => console.log("Connected to SQL Server"))
    .catch((err) => console.error("Database connection error:", err));

// Get all worksheets
app.get("/worksheets", async (req, res) => {
    try {
        const result = await sql.query("SELECT * FROM EmployeeDailyWorksheet");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new worksheet
app.post("/worksheets", async (req, res) => {
    const { Customer, Description, Module, StartDate, CompletedDate, Status, Comments } = req.body;
    try {
        const request = new sql.Request();
        request.input("Customer", sql.NVarChar, Customer);
        request.input("Description", sql.NVarChar, Description);
        request.input("Module", sql.NVarChar, Module);
        request.input("StartDate", sql.DateTime, StartDate);
        request.input("CompletedDate", sql.DateTime, CompletedDate);
        request.input("Status", sql.NVarChar, Status);
        request.input("Comments", sql.NVarChar, Comments);

        const result = await request.query(
            `INSERT INTO EmployeeDailyWorksheet (Customer, Description, Module, StartDate, CompletedDate, Status, Comments)
             VALUES (@Customer, @Description, @Module, @StartDate, @CompletedDate, @Status, @Comments);
             SELECT SCOPE_IDENTITY() AS ID;`
        );
        res.json({ ID: result.recordset[0].ID, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
  jk  }
});

// Update a worksheet
app.put("/worksheets/:id", async (req, res) => {
    const id = req.params.id;
    const { Customer, Description, Module, StartDate, CompletedDate, Status, Comments } = req.body;
    try {
        const request = new sql.Request();
        request.input("Customer", sql.NVarChar, Customer);
        request.input("Description", sql.NVarChar, Description);
        request.input("Module", sql.NVarChar, Module);
        request.input("StartDate", sql.DateTime, StartDate);
        request.input("CompletedDate", sql.DateTime, CompletedDate);
        request.input("Status", sql.NVarChar, Status);
        request.input("Comments", sql.NVarChar, Comments);
        request.input("ID", sql.Int, id);

        await request.query(
            `UPDATE EmployeeDailyWorksheet SET 
             Customer = @Customer, Description = @Description, Module = @Module, 
             StartDate = @StartDate, CompletedDate = @CompletedDate, 
             Status = @Status, Comments = @Comments WHERE ID = @ID`
        );
        res.json({ message: "Record updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a worksheet
app.delete("/worksheets/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const request = new sql.Request();
        request.input("ID", sql.Int, id);
        await request.query(`DELETE FROM EmployeeDailyWorksheet WHERE ID = @ID`);
        res.json({ message: "Record deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Register a new employee
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        console.log("Pool initialized:", !!pool);

        const passwordHash = await bcrypt.hash(password, 10);
        console.log("Password hashed successfully");

        const request = pool.request();
        console.log("Request object created:", !!request);

        const result = await request
            .input('Username', sql.NVarChar, username)
            .input('PasswordHash', sql.NVarChar, passwordHash)
            .input('Email', sql.NVarChar, email)
            .query(
                'INSERT INTO Employees (Username, PasswordHash, Email) VALUES (@Username, @PasswordHash, @Email)'
            );

        console.log("Query executed:", result);
        res.status(201).send({ message: 'User registered successfully' });
    } catch (err) {
        console.error("Error details:", err);
        res.status(500).send({ message: 'Error registering user' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool
            .request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT * FROM Employees WHERE Username = @Username');

        if (result.recordset.length === 0) {
            return res.status(404).send({ message: 'User not found' });
        }

        const user = result.recordset[0];

        console.log("Entered Password:", password);
        console.log("Stored Hash:", user.PasswordHash);

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        console.log("Password Match Result:", isMatch);

        if (!isMatch) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.Id, username: user.Username }, secretKey, { expiresIn: '1h' });

        res.send({ message: 'Login successful', token });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Error logging in' });
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// npm init -y
// npm install express body-parser cors mssql

// CREATE TABLE EmployeeDailyWorksheet (
//     ID INT IDENTITY(1,1) PRIMARY KEY,
//     Customer NVARCHAR(255),
//     Description NVARCHAR(255),
//     Module NVARCHAR(255),
//     StartDate DATE,
//     CompletedDate DATE,
//     Status NVARCHAR(50),
//     Comments NVARCHAR(MAX)
// );


// CREATE TABLE Employees (
//     Id INT IDENTITY(1,1) PRIMARY KEY,
//     Username NVARCHAR(50) NOT NULL UNIQUE,
//     PasswordHash NVARCHAR(255) NOT NULL,
//     FullName NVARCHAR(100),
//     Email NVARCHAR(100),
//     Role NVARCHAR(50),
//     CreatedAt DATETIME DEFAULT GETDATE()
// );