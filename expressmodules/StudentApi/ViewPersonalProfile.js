const ViewPersonalProfile = async (req, res) => {
    const userId = req.user.id;
    console.log("Fetching profile for user:", userId);
    const db = require('../database/dbcon');
    try {
        // 1. Get Basic User Info & Friend Count
        // We use a subquery to count friends where accepted = true
        const studentQuery = db.query(`
            SELECT 
                s.id, s.name, s.last_name, s.email, s.semester, s.image,
                (
                    SELECT COUNT(*) 
                    FROM friend_list fl 
                    WHERE fl.accepted = true 
                    AND (fl.sender = s.id OR fl.receiver = s.id)
                )::int as friend_count
            FROM student s
            WHERE s.id = $1
        `, [userId]);

        // 2. Get User's Interest Labels
        const interestsQuery = db.query(`
            SELECT i.id, i.name 
            FROM student_interests si
            JOIN interests i ON si.interest_id = i.id
            WHERE si.student_id = $1
        `, [userId]);

        // 3. Get User's Lesson Labels
        const lessonsQuery = db.query(`
            SELECT l.id, l.name, l.semester
            FROM student_lessons sl
            JOIN lessons l ON sl.lesson_id = l.id
            WHERE sl.student_id = $1
        `, [userId]);

        // 4. Get User's Posts (Reusing your Feed logic structure for consistency)
        const postsQuery = db.query(`
            SELECT 
                p.id, p.title, p.description, p.image, p.date,
                p.interactions as total_interactions, -- Simplified for now
                json_build_object('id', s.id, 'name', s.name, 'image', s.image) AS student,
                (SELECT COALESCE(array_agg(i.name), '{}') FROM interests i WHERE i.id = ANY(p.interests)) AS interests_labels,
                (SELECT COALESCE(array_agg(l.name), '{}') FROM lessons l WHERE l.id = ANY(p.lessons)) AS lessons_labels,
                (SELECT COUNT(*) FROM post_ratings pr WHERE pr.post_id = p.id AND pr."like" = 1)::int as total_likes,
                (SELECT COUNT(*) FROM post_ratings pr WHERE pr.post_id = p.id AND pr.dislike = 1)::int as total_dislikes
            FROM posts p
            JOIN student s ON p.student_id = s.id
            WHERE p.student_id = $1
            ORDER BY p.date DESC
        `, [userId]);

        // Execute all in parallel for speed
        const [studentRes, interestsRes, lessonsRes, postsRes] = await Promise.all([
            studentQuery, 
            interestsQuery, 
            lessonsQuery, 
            postsQuery
        ]);

        if (studentRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const profileData = {
            details: studentRes.rows[0],
            interests: interestsRes.rows,
            lessons: lessonsRes.rows,
            posts: postsRes.rows
        };

        res.json(profileData);

    } catch (err) {
        console.error("Profile Error:", err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { ViewPersonalProfile };