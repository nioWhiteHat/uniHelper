const db = require("../database/dbcon");

const ViewProfile = async (req, res) => {
  const { studentId } = req.params;
  const currentUserId =  req.user.id;
  console.log("Viewing profile for student ID:", studentId, "by user ID:", currentUserId);
    const query = `
            SELECT 
            s.id, s.name, s.last_name, s.email, s.semester, s.image, s.bio,
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
                        'interests_labels', (select COALESCE(array_agg(i.name), '{}') from interests i where i.id = ANY(p.interests)),
                        'lesson_labels', (select COALESCE(array_agg(l.name), '{}') from lessons l where l.id = ANY(p.lessons)),
                        'total_likes', pr.total_likes,
                        'total_dislikes', pr.total_dislikes,
                        -- New field: the latest comment text
                        'latest_comment', (
                            SELECT comment 
                            FROM post_ratings 
                            WHERE post_id = p.id 
                              AND comment IS NOT NULL 
                            ORDER BY date DESC 
                            LIMIT 1
                        )
                    )
                ), '[]'::json)
                FROM posts p
                LEFT JOIN (
                    SELECT 
                        post_id, 
                        COALESCE(SUM("like"), 0) AS total_likes,     -- FIXED: "like" in quotes
                        COALESCE(SUM("dislike"), 0) AS total_dislikes -- FIXED: "dislike" in quotes for consistency
                    FROM post_ratings 
                    GROUP BY post_id
                ) AS pr ON p.id = pr.post_id
                
                WHERE p.student_id = s.id 
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
    try{
      let chatId = null;
      const chatIdResult = await db.query(`
      SELECT c.id FROM chats c 
      WHERE c.is_personal = true 
      AND ARRAY[$1, $2]::int[] <@ c.members_id`, [studentId,currentUserId]);
      console.log(`chatid:${chatIdResult}`)
      if (chatIdResult.rowCount === 0){
        chatId = null
      }else{
        chatId = chatIdResult.rows[0].id ;
      }
      console.log(chatId)

      

      const Total_friends = await db.query(
        `SELECT COUNT(*) AS friend_count
            FROM friend_list
            WHERE accepted = true AND (sender = $1 OR receiver = $1)`,
      [studentId],
      );
    
      const resultF = await db.query(
        `SELECT sender, receiver, accepted 
            FROM friend_list 
            WHERE (sender = $1 AND receiver = $2) 
                OR (sender = $2 AND receiver = $1)`,
      [currentUserId, studentId],
      );
    
      let relationshipStatus = 'none';
      if (resultF.rows.length > 0 && resultF.rows[0].accepted){
        relationshipStatus = 'friends';
      } else if (resultF.rows.length > 0 && !resultF.rows[0].accepted && resultF.rows[0].sender === currentUserId){
        relationshipStatus = 'request_sent';
      } else if (resultF.rows.length > 0 && !resultF.rows[0].accepted && resultF.rows[0].receiver === currentUserId){ // FIXED: 'reciever' -> 'receiver'
        relationshipStatus = 'request_received';
      }
      let visibilityParam = 'public';
      if (relationshipStatus === 'friends'){
        visibilityParam = 'private';
      }
    
      const profile = await db.query(query, [studentId, visibilityParam]);
     
      if (profile.rows.length === 0) {
        return res.status(404).json({ message: "Student not found" });
      }

      const profileData = profile.rows[0];
      profileData.relationshipStatus = relationshipStatus;
      if (relationshipStatus !== 'friends'){
      
        delete profileData.email;
      }
      profileData.NumberOfFriends = parseInt(Total_friends.rows[0].friend_count, 10);
      res.json({profileData:profileData, chatId:chatId});
    }
    catch (err) {
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
      [postId, userId, commentText],
    );
    res.json({ message: "Comment added" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const likeDislikePost = async (req, res) => {
  const userId = req.user.id;
  const { postId, like = 0, dislike = 0 } = req.body;

  try {
    await db.query(
      `INSERT INTO post_ratings(post_id, student_id, "like", "dislike") VALUES ($1, $2, $3, $4)`,
      [postId, userId, like, dislike],
    );
    res.json({ message: "Like/Dislike added" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};


module.exports = {
  ViewProfile,
  commentOnPost,
  likeDislikePost,
};
