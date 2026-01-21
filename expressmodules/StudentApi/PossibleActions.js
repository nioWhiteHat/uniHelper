const db = require('../database/dbcon');

const GetCadidateFriends = async (req, res) => {
    
    const { interests, lessons, semestermin, semestermax, searchText = "" } = req.body.filters || {};

    
    const parts = searchText.split(" ");
    const name = parts[0] || ""; 
    const lastname = parts.slice(1).join(" ") || "";

    
    let qstring = `
        WITH FilteredLessons AS (
            SELECT s.id, s.name, s.last_name, s.semester, s.image
            FROM lessons AS l 
            JOIN student_lessons AS sl ON l.id = sl.lesson_id 
            JOIN student AS s ON s.id = sl.student_id
            WHERE l.name = ANY($1) 
            AND s.semester <= $2 
            AND s.semester >= $3
        ),
        FilteredInterests AS ( 
            SELECT s.id, s.name, s.last_name, s.semester, s.image
            FROM interests AS i 
            JOIN student_interests AS si ON i.id = si.interest_id 
            JOIN student AS s ON s.id = si.student_id 
            WHERE i.name = ANY($4) 
            AND s.semester <= $2 
            AND s.semester >= $3
        )
        SELECT DISTINCT fl.id, fl.name, fl.last_name, fl.semester, fl.image
        FROM FilteredLessons AS fl 
        INNER JOIN FilteredInterests AS fi ON fl.id = fi.id`;

   
    let values = [lessons, semestermax, semestermin, interests];


    if (name && lastname) {
      
        qstring += ` WHERE fl.name ILIKE $5 || '%' AND fl.last_name ILIKE $6 || '%'`;
        values.push(name, lastname);

    } else if (name) {
    
        qstring += ` WHERE fl.name ILIKE $5 || '%'`;
        values.push(name);

    } else if (lastname) {
    
        qstring += ` WHERE fl.last_name ILIKE $5 || '%'`;
        values.push(lastname);
    }

    try {
        const result = await db.query(qstring, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const ViewProfile = async (req, res) => {
    const studentId = req.params.id;
    const currentUserId = req.user ? req.user.id : null; 

    try {
        const query = `
            SELECT 
            s.name, s.last_name, s.email, s.semester, s.image, s.bio,
            ARRAY_AGG(DISTINCT i.name) AS interests,
            ARRAY_AGG(DISTINCT l.name) AS lessons,
            
            (
                SELECT COALESCE(JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'post_id', p.id,
                        'title', p.title,
                        'description', p.description,
                        'image', p.image,
                        'date', p.date,
                        'interests_labels', p.interests_labels,
                        'lesson_label', p.lessons_labels,
                        'total_likes', pr.total_likes,
                        'total_dislikes', pr.total_dislikes
                    )
                ), '[]'::json)
                FROM posts p
                LEFT JOIN (
                    SELECT 
                        post_id, 
                        COALESCE(SUM(likes), 0) AS total_likes,
                        COALESCE(SUM(dislikes), 0) AS total_dislikes
                    FROM post_ratings 
                    GROUP BY post_id
                ) AS pr ON p.id = pr.post_id
                
                WHERE p.student_id = s.id 
                -- Logic: Show if Public OR matches the passed visibility (e.g., 'friends')
                AND (p.visibility = 'public' OR p.visibility = $2)
            ) AS posts

            FROM student s 
            LEFT JOIN student_interests si ON s.id = si.student_id 
            LEFT JOIN interests i ON si.interest_id = i.id 
            LEFT JOIN student_lessons sl ON s.id = sl.student_id 
            LEFT JOIN lessons l ON sl.lesson_id = l.id 
            WHERE s.id = $1
            GROUP BY s.id;
        `;
          
        const resultF = await db.query(
            `SELECT sender, reciever, accepted 
             FROM friend_list 
             WHERE (sender = $1 AND reciever = $2) 
                OR (sender = $2 AND reciever = $1)`, 
            [currentUserId, studentId]
        );

        let profile; 

        if (resultF.rows.length > 0) {
            const relationship = resultF.rows[0];

            
            const visibilityParam = relationship.accepted ? 'private' : 'public';

            const profileResult = await db.query(query, [studentId, visibilityParam]);
            profile = profileResult.rows[0];

            if (relationship.accepted) {
                profile.friend_request_status = "friends";
            } else {
                profile.email = null;
                
                if (relationship.sender == currentUserId) {
                    profile.friend_request_status = "pending_sent";
                } else {
                    profile.friend_request_status = "pending_received";   
                }
            }
        } else {
            
            const profileResult = await db.query(query, [studentId, 'public']);
            profile = profileResult.rows[0];
            
            if (profile) {
                profile.friend_request_status = "none"; 
                profile.email = null;
            }
        }

       
        if (!profile) {
            return res.status(404).json({ msg: "Student not found" });
        }

        res.json(profile);
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const SendFriendRequest = async (req, res) => {
    const userId = req.user.id;
    const friendId = req.params.id;
    try {
        await db.query(
            'INSERT INTO friend_list (sender, receiver, accepted) VALUES ($1, $2, $3)',
            [userId, friendId, false]
        );
        res.json({ message: "Friend request sent" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const AcceptFriendRequest = async (req, res) => {
    const userId = req.user.id;
    const friendId = req.params.id;
    try {
        await db.query(
            'UPDATE friend_list SET accepted = $1 WHERE sender = $2 AND receiver = $3',
            [true, friendId, userId]
        );
        res.json({ message: "Friend request accepted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const RejectFriendRequest = async (req, res) => {
    const userId = req.user.id;
    const friendId = req.params.id;
    try {
        await db.query(
            'DELETE FROM friend_list WHERE sender = $1 AND receiver = $2',
            [friendId, userId]
        );
        res.json({ message: "Friend request rejected" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const commentOnPost = async (req, res) => {
    const userId = req.user.id;
    const { postId, commentText } = req.body;
    try {
        await db.query(
            `INSERT INTO post_ratings (post_id, student_id, comment, date) VALUES ($1, $2, $3, NOW())`,
            [postId, userId, commentText]
        );
        res.json({ message: "Comment added" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
}
const likeDislikePost = async (req, res) => {
    const userId = req.user.id;
    const { postId, like=0, dislike=0 } = req.body;
    try {
        await db.query(
            `INSERT INTO post_ratings (post_id, student_id, like, dislike) VALUES ($1, $2, $3, $4)`,
            [postId, userId, like, dislike]
        );
        res.json({ message: "Like/Dislike added" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};


module.exports = {
    GetCadidateFriends,
    ViewProfile,
    SendFriendRequest,
    AcceptFriendRequest,
    RejectFriendRequest,
    
    commentOnPost,
    likeDislikePost
};

