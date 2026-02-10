const db = require('../database/dbcon');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SignIn = async (req, res) => {
    console.log("SignIn request received");
    const { email, password } = req.body; 
    try {
       console.log("Checking credentials for email:", email);
        const result = await db.query(
            'SELECT * FROM student WHERE email = $1', 
            [email]
        );
        console.log("Database query executed");

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid Credentials" });
            console.log("No user found with that email");
        }

        const student = result.rows[0];

       
        const validPassword = await bcrypt.compare(password, student.password);
        console.log("Password validation completed");
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }
        console.log("User authenticated successfully");
        const token = jwt.sign(
            { id: student.id, name: student.name }, // Payload
            process.env.JWT_SECRET,                 // Secret Key
            { expiresIn: '5h' }                     
        );
        console.log("JWT token generated");
      
        res.json({ token:token,id:student.id });
    } catch (err) {
        console.log('in err')
        console.log(err);
        res.status(500).send("Server Error");
    }
};
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("166943264625-em1456pb12r7ebvof9548b35os24obch.apps.googleusercontent.com");

const GoogleSignIn = async (req, res) => {
    const { token } = req.body;

    try {
        // 1. Verify the Google Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: "166943264625-em1456pb12r7ebvof9548b35os24obch.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        
        const { email, given_name, family_name, picture } = payload;

        // 2. Check if user exists in DB
        const result = await db.query('SELECT * FROM student WHERE email = $1', [email]);
        
        let student;

        if (result.rows.length === 0) {
            // 3. User does NOT exist -> Register them automatically
            // We set a default password and semester=1 since Google doesn't provide these
            console.log("Creating new Google user...");
            
            const defaultPassword = await bcrypt.hash("google-auth-user", 10);
            
            const newStudent = await db.query(
                `INSERT INTO student (name, last_name, email, password, semester, image) 
                 VALUES ($1, $2, $3, $4, 1, $5) RETURNING *`,
                [given_name, family_name || "", email, defaultPassword, picture]
            );
            
            student = newStudent.rows[0];
        } else {
            // 4. User EXISTS -> Just log them in
            student = result.rows[0];
        }

        // 5. Generate JWT Token (Same as your normal SignIn)
        const appToken = jwt.sign(
            { id: student.id, name: student.name },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
        );

        res.json({ token: appToken, id: student.id });

    } catch (err) {
        console.error("Google Auth Error:", err);
        res.status(500).send("Google Login Failed");
    }
};

// Don't forget to export it!

const SignUp = async (req, res) => {
    const { name, lastname, email, password, interests, lessons, semester } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await db.query(
            'INSERT INTO student (name, last_name, email, password, semester) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, lastname, email, hashedPassword, semester]
        );
        console.log("successfull insert to student")
        const studentId = result.rows[0].id;
        for (const interestId of interests) {
            await db.query(
                'INSERT INTO student_interests (student_id, interest_id) VALUES ($1, $2)',
                [studentId, interestId]
            );
        }
        console.log("successfull insert to student_interests")
        for (const lesson of lessons) {
            // 1. Get the lesson details
            const lessonSemesters = await db.query(`SELECT semester FROM lessons WHERE id=$1`, [lesson]);
            
            // SAFETY CHECK: Does this lesson actually exist?
            if (lessonSemesters.rows.length === 0) {
                return res.status(400).send(`Lesson ID ${lesson} not found in database.`);
            }

            const lessonSemester = lessonSemesters.rows[0].semester;

            // 2. Validate the semester
            if (lessonSemester > semester) {
                return res.status(400).send(`Lesson ID ${lesson} is not available for semester ${semester}`);
            }

            
            await db.query(
                'INSERT INTO student_lessons (student_id, lesson_id) VALUES ($1, $2)',
                [studentId, lesson]
            );
        }

        res.status(201).json("User registered successfully (Logic pending)");

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const SignOut = async (req, res) => {

};

module.exports = {
    SignUp,
    SignIn,
    GoogleSignIn
};