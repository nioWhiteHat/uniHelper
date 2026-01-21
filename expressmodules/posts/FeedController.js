const db = require('../database/dbcon');

const GetPostDropDown = async (req, res) => {
    
    const userId = req.user.id; 
    const { GeneralFeed, InterestLabels, LessonLabels, SearchText } = req.body;

    try {
        let userLessons = LessonLabels || [];
        let userInterests = InterestLabels || [];

        
        if (GeneralFeed) {
            const labels = await db.query(`
                SELECT 
                (SELECT COALESCE(array_agg(lesson_id), '{}') FROM student_lessons WHERE student_id = $1) AS lessons,
                (SELECT COALESCE(array_agg(interest_id), '{}') FROM student_interests WHERE student_id = $1) AS interests
            `, [userId]);
            
            userLessons = labels.rows[0].lessons;
            userInterests = labels.rows[0].interests;
        }

        const result = await db.query(`
            SELECT 
                p.id, 
                p.title, 
                p.interactions
            FROM posts p
            WHERE 
                -- A. VISIBILITY CHECK (Public OR Private + Friend)
                (
                    p.visibility = 'public'
                    OR p.student_id = $1
                    OR (
                        p.visibility = 'private'
                        AND EXISTS (
                            SELECT 1 FROM friend_list fl
                            WHERE fl.accepted = true
                            AND (
                                (fl.sender = $1 AND fl.receiver = p.student_id) OR 
                                (fl.sender = p.student_id AND fl.receiver = $1)
                            )
                        )
                    )
                )

                -- B. SEARCH TEXT FILTER
                -- If SearchText ($4) is provided, title must match. If NULL, ignore this line.
                AND (
                    $4::text IS NULL 
                    OR p.title ILIKE '%' || $4 || '%'
                )

                -- C. INTEREST/LESSON FILTERS (Reusing your Feed Logic)
                AND (
                    -- OPTION 1: "Loose Match" (GeneralFeed = true)
                    -- Check if post has at least 2 matching tags with user's interests
                    (
                        $5 = true 
                        AND (
                            (SELECT COUNT(*) FROM unnest(p.interests) AS i_id WHERE i_id = ANY($2::int[])) >= 2
                            OR 
                            (SELECT COUNT(*) FROM unnest(p.lessons) AS l_id WHERE l_id = ANY($3::int[])) >= 2
                        )
                    )

                    OR 

                    -- OPTION 2: "Strict Match" (GeneralFeed = false)
                    -- Used when searching specific tags manually
                    (
                        $5 = false
                        AND (
                            (cardinality($2::int[]) = 0 OR $2::int[] <@ p.interests)
                            AND -- Changed OR to AND for strict search usually, but kept to your logic if preferred
                            (cardinality($3::int[]) = 0 OR $3::int[] <@ p.lessons)
                        )
                    )
                )

            ORDER BY p.interactions DESC
            LIMIT 10;
        `, [
            userId,         // $1
            userInterests,  // $2
            userLessons,    // $3
            SearchText || null, // $4 (Convert empty string to null for SQL safety)
            GeneralFeed     // $5
        ]);

        res.json(result.rows);

    } catch (err) {
        console.error("Dropdown Search Error:", err.message);
        res.status(500).send("Server Error");
    }
};

const GetFeed = async (req, res) => {
    const offset = parseInt(req.body.scroller) || 0;
    const postoffset = offset * 30;
    const userId = req.user.id;
    const{GeneralFeed,InterestLabels,LessonLabels,SearchText,postId}=req.body;
     

    try {
        let userLessons = LessonLabels || [];
        let userInterests = InterestLabels || [];
        if (GeneralFeed) {
            const labels = db.query(
            `
            SELECT 
            (SELECT COALESCE(array_agg(lesson_id), '{}') 
            FROM student_lessons 
            WHERE student_id = $1) AS lessons,

            (SELECT COALESCE(array_agg(interest_id), '{}') 
            FROM student_interests 
            WHERE student_id = $1) AS interests;
            `,[userId]);
            userLessons = (await labels).rows[0].lessons;
            userInterests = (await labels).rows[0].interests;
        }
        
        
        
        const postRes = await db.query(
            `
            SELECT 
            p.id, p.title, p.description, p.image, p.date,

            -- 1. NESTED STUDENT OBJECT
            json_build_object(
                'id', s.id, 
                'name', s.name, 
                'image', s.image
            ) AS student,

            -- 2. LABELS
            (SELECT COALESCE(array_agg(i.name), '{}') FROM interests i WHERE i.id = ANY(p.interests)) AS interests_labels,
            (SELECT COALESCE(array_agg(l.name), '{}') FROM lessons l WHERE l.id = ANY(p.lessons)) AS lessons_labels,

            -- 3. COUNTS
            COALESCE(SUM(pr."like"), 0)::int AS total_likes,
            COALESCE(SUM(pr.dislike), 0)::int AS total_dislikes,

            -- 4. LAST COMMENT
            CASE WHEN COUNT(pr.comment) > 0 THEN
                json_build_object(
                    'text', (array_agg(pr.comment ORDER BY pr.date DESC) FILTER (WHERE pr.comment IS NOT NULL))[1],
                    'date', MAX(pr.date)
                )
            ELSE NULL END AS "lastComment"

            FROM posts p
            JOIN student s ON p.student_id = s.id
            LEFT JOIN post_ratings pr ON p.id = pr.post_id

            WHERE 
                -- A. VISIBILITY (Must always apply)
                (
                    p.visibility = 'public'  
                    OR p.student_id = $4
                    OR (
                        p.visibility = 'private'
                        AND EXISTS (
                            SELECT 1 FROM friend_list fl
                            WHERE fl.accepted = true
                            AND ((fl.sender = $4 AND fl.receiver = p.student_id) OR (fl.sender = p.student_id AND fl.receiver = $4))
                        )
                    )
                )

                -- B. SEARCH TEXT FILTER (New Logic)
                -- If $7 is NULL, this whole block is TRUE (ignored).
                -- If $7 is NOT NULL, the title must match.
                AND (
                    $7::text IS NULL 
                    OR p.title ILIKE '%' || $7::text || '%'
                )

                -- C. TAG & PIN FILTER LOGIC
                AND (
                    -- OPTION 1: IT IS THE TARGET POST ($6)
                    ($6::int IS NOT NULL AND p.id = $6::int)

                    OR

                    -- OPTION 2: Loose Match ($5 = true)
                    (
                        $5 = true 
                        AND (
                            (SELECT COUNT(*) FROM unnest(p.interests) AS i_id WHERE i_id = ANY($1::int[])) >= 2
                            OR 
                            (SELECT COUNT(*) FROM unnest(p.lessons) AS l_id WHERE l_id = ANY($2::int[])) >= 2
                        )
                    )

                    OR 

                    -- OPTION 3: Strict Match ($5 = false)
                    (
                        $5 = false
                        AND (
                            (cardinality($1::int[]) > 0 AND $1::int[] <@ p.interests)
                            OR 
                            (cardinality($2::int[]) > 0 AND $2::int[] <@ p.lessons)
                            )
                        )
                    )

            GROUP BY p.id, s.id

            ORDER BY 
                (CASE WHEN p.id = $6::int THEN 0 ELSE 1 END) ASC,
                p.interactions DESC,
                p.id DESC

            LIMIT 30 OFFSET $3;
            `,[userInterests,userLessons,postoffset,userId,GeneralFeed,postId,SearchText]);
        //console.log("Feed Query Executed: ", (postRes).rows, (postRes).rowCount);
        res.json(postRes.rows);
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    };
};


const CreatePost = async (req, res) => {
    const { title, description, image, interests, lessons, visibility } = req.body;
    const studentId = req.user.id;
    try {
        await db.query(
            `
            INSERT INTO posts (student_id, title, description, image, interests, lessons, visibility, date, interactions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 0)
            `,
            [studentId, title, description, image, interests, lessons, visibility]
        );
        res.status(201).send("Post created successfully");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
}

module.exports = {
    GetFeed,
    CreatePost,
    GetPostDropDown
};