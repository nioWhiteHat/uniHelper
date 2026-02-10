const db = require('../database/dbcon');


const UpdateProfileTags = async (req, res) => {
    const userId = req.user.id;
    // Expecting arrays of IDs, e.g., { interestIds: [1, 2], lessonIds: [5, 8] }
    const { interestIds, lessonIds } = req.body; 

    try {
        await db.query('BEGIN'); // Start Transaction

        // --- 1. Update Interests ---
        // A. Remove ALL existing interests for this user
        await db.query('DELETE FROM student_interests WHERE student_id = $1', [userId]);
        
        // B. Insert NEW interests (if any provided)
        if (interestIds && interestIds.length > 0) {
            // Create placeholders: ($1, $2), ($1, $3), etc.
            const interestValues = interestIds.map((_, idx) => `($1, $${idx + 2})`).join(",");
            const interestParams = [userId, ...interestIds];
            await db.query(
                `INSERT INTO student_interests (student_id, interest_id) VALUES ${interestValues}`,
                interestParams
            );
        }

        // --- 2. Update Lessons ---
        // A. Remove ALL existing lessons
        await db.query('DELETE FROM student_lessons WHERE student_id = $1', [userId]);

        // B. Insert NEW lessons
        if (lessonIds && lessonIds.length > 0) {
            const lessonValues = lessonIds.map((_, idx) => `($1, $${idx + 2})`).join(",");
            const lessonParams = [userId, ...lessonIds];
            await db.query(
                `INSERT INTO student_lessons (student_id, lesson_id) VALUES ${lessonValues}`,
                lessonParams
            );
        }

        await db.query('COMMIT'); // Save changes
        res.status(200).json({ message: "Tags updated successfully" });

    } catch (err) {
        await db.query('ROLLBACK'); // Revert if error
        console.error("Update Tags Error:", err.message);
        res.status(500).send("Server Error");
    }
};



module.exports = { UpdateProfileTags };