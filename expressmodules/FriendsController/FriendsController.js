const db = require("../database/dbcon");

const GetFriends = async (req, res) => {
  const userId = req.user.id;

  try {
    const friendsResult = await db.query(
      `
            SELECT 
                s.id, s.name, s.last_name, s.semester, s.image
            FROM student s
            JOIN friend_list fl ON 
                ( (fl.sender = $1 AND fl.receiver = s.id) OR (fl.receiver = $1 AND fl.sender = s.id) )
            WHERE fl.accepted = true
        `,
      [userId],
    );
    res.json(friendsResult.rows);
  } catch (err) {
    console.error("Get Friends Error:", err.message);
    res.status(500).send("Server Error");
  }
};

const GetFriendRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const requestsResult = await db.query(
      `
            SELECT
                s.id, s.name, s.last_name, s.semester, s.image
            FROM student s
            JOIN friend_list fl ON fl.sender = s.id
            WHERE fl.receiver = $1 AND fl.accepted = false
        `,
      [userId],
    );
    res.json(requestsResult.rows);
  } catch (err) {
    console.error("Get Friend Requests Error:", err.message);
    res.status(500).send("Server Error");
  }
};

const GetCadidateFriends = async (req, res) => {
  const {
    interests,
    lessons,
    semestermin,
    semestermax,
    searchText = "",
  } = req.body.filters || {};

  const userId = req.user.id;

  const parts = searchText.split(" ");
  const name = parts[0] || "";
  const lastname = parts[1] || "";

  let qstring = `
        WITH FilteredLessons AS (
            SELECT s.id, s.name, s.last_name, s.semester, s.image
            FROM student_lessons AS sl
            RIGHT JOIN student AS s ON s.id = sl.student_id
            WHERE s.semester <= $2 AND s.semester >= $3
            GROUP BY s.id 
            HAVING ($1::int[] IS NULL OR array_agg(sl.lesson_id) @> $1)
        ),
        FilteredInterests AS ( 
            SELECT s.id, s.name, s.last_name, s.semester, s.image
            FROM student_interests AS si 
            RIGHT JOIN student AS s ON s.id = si.student_id 
            WHERE s.semester <= $2 AND s.semester >= $3
            GROUP BY s.id
            HAVING ($4::int[] IS NULL OR array_agg(si.interest_id) @> $4)
        )
        SELECT fl.id, fl.name, fl.last_name, fl.semester, fl.image
        FROM FilteredLessons AS fl 
        JOIN FilteredInterests AS fi ON fl.id = fi.id 
        WHERE 
            ($5::text IS NULL OR fl.name ILIKE $5 || '%')
            AND
            ($7::text IS NULL OR fl.last_name ILIKE $7 || '%')
            
            -- FIX STARTS HERE
            AND NOT (fl.id = ANY (
                SELECT 
                    CASE 
                        WHEN frl.sender = $6 THEN frl.receiver
                        ELSE frl.sender 
                    END
                FROM friend_list as frl
                WHERE $6 IN (frl.sender, frl.receiver) and frl.accepted = true
            ))
            -- FIX ENDS HERE

            AND fl.id != $6;
        `;

  let values = [
    lessons,
    semestermax,
    semestermin,
    interests,
    name || null,
    userId,
    lastname || null,
  ];

  try {
    const result = await db.query(qstring, values);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const SendFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const friendId = req.body.id;
  try {
    const db = require("../database/dbcon");
    await db.query(
      "INSERT INTO friend_list (sender, receiver, accepted) VALUES ($1, $2, $3)",
      [userId, friendId, false],
    );
    res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const AcceptFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.body;
  try {
    await db.query(
      "UPDATE friend_list SET accepted = $1 WHERE sender = $2 AND receiver = $3",
      [true, friendId, userId],
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
      "DELETE FROM friend_list WHERE sender = $1 AND receiver = $2",
      [friendId, userId],
    );
    res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
module.exports = {
  GetFriends,
  GetFriendRequests,
  GetCadidateFriends,
  SendFriendRequest,
  AcceptFriendRequest,
  RejectFriendRequest,
};
