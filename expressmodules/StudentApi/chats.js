const db = require("../database/dbcon");

const SendMessage = async (req, res) => {
  senderId = req.user.id;
  const {
    chatId,
    messageText,
    postId = null,
    replyId = null,
    reaction = null,
  } = req.body;

  try {
    const result = await db.query(
      `
            WITH inserted_message AS (
                INSERT INTO messages (student_id, chat_id, text, post_id, reply_id, reactions, date)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id, chat_id, date, text, post_id, reply_id, reactions -- Return whatever message data you need
            ),
            student_info AS (
                SELECT name, image
                FROM student
                WHERE id = $1
            ),
            updated_chat AS (
                UPDATE chats
                SET last_message_id = (SELECT id FROM inserted_message),
                    updated_at = NOW()
                WHERE id = $2
                RETURNING members_id,name,image 
            )
            SELECT 
                i.id as message_id,
                i.text,
                i.date,
                u.members_id,
                i.post_id,
                i.reply_id,
                i.reactions,
                u.name as chat_name,
                u.image as chat_image,
                s.name as sender_name,
                s.image as sender_image


            FROM inserted_message i, updated_chat u, student_info s
            `,
      [senderId, chatId, messageText, postId, replyId, reaction],
    );
    console.log("query executed");
    const io = req.app.get("socketio");
    const messageData = result.rows[0];
    const chatRoomName = `chat_${chatId}`;
    io.to(chatRoomName).emit("new_message", {
      senderId: senderId,
      senderName: messageData.sender_name,
      senderImage: messageData.sender_image,
      messageId: messageData.message_id,
      text: messageData.text,
      date: messageData.date,
      postId: messageData.post_id,
      replyId: messageData.reply_id,
      reaction: messageData.reaction,
    });
    const socketsInRoom = await io.in(chatRoomName).fetchSockets();
    const activeUserIds = new Set(socketsInRoom.map((s) => s.data.userId));
    //updateSeenStatus(chatId, messageData.message_id, Array.from(activeUserIds));
    const membersToNotify = messageData.members_id.filter((memberId) => {
      const isSender = memberId === senderId;
      const isWatchingChat = activeUserIds.has(memberId.toString());
      return !isSender && !isWatchingChat;
    });
    membersToNotify.forEach((memberId) => {
      const userRoomName = `user_${memberId}`;
      io.to(userRoomName).emit("chat_notification", {
        chatName: messageData.chat_name,
        chatId: chatId,
        senderId: senderId,
        senderName: messageData.sender_name,
        senderImage: messageData.sender_image,
        messageText: messageData.text,
        date: messageData.date,
        messageId: messageData.message_id,
        postId: messageData.post_id,
        replyId: messageData.reply_id,
        reaction: messageData.reaction,
      });
    });
    res.json({ message: "Message sent successfully" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
};

const updateSeenStatus = async (chatId, messageId, memberIdsWhoSawIt) => {
  try {
    const io = req.app.get("socketio");
    const patchData = {};
    memberIdsWhoSawIt.forEach((id) => {
      patchData[id] = messageId;
    });

    io.to(`chat_${chatId}`).emit("messages_seen_update", {
      chatId: chatId,
      messageId: messageId,
      memberIds: memberIdsWhoSawIt,
    });
    await db.query(
      `UPDATE chats 
             SET read_status = read_status || $1::jsonb 
             WHERE id = $2`,
      [JSON.stringify(patchData), chatId],
    );

    console.log("Atomic update successful");
  } catch (err) {
    console.error(err);
  }
};

const getChatLog = async (req, res) => {
  const { chatId, lastMessageId } = req.params;
  console.log("in chatlog");

  const userId = req.user.id;

  //updateSeenStatus(chatId, lastMessageId, [userId]);

  const offset = parseInt(req.params.offset) || 0;
  const pageOffset = offset * 40;

  try {
    let queryText = `
        SELECT 
            m.*, 
            s.name, 
            s.image, 
            s.id as student_id, 
            
            (
                CASE WHEN m.post_id IS NOT NULL THEN (
                    SELECT json_build_object(
                        'image', p.image,
                        'title', p.title,
                        'description', p.description,
                        'creator_id', p.student_id,
                        'date', p.date,
                        'creator', post_author.name,
                        'creator_image', post_author.image,
                        'total_likes', (SELECT COALESCE(SUM("like"), 0) FROM post_ratings pr WHERE pr.post_id = p.id), 
                        'total_dislikes', (SELECT COALESCE(SUM("dislike"), 0) FROM post_ratings pr WHERE pr.post_id = p.id),
                        'interest_labels', (SELECT array_agg(i.name) FROM interests i WHERE i.id = ANY(p.interests)),
                        'lesson_labels', (SELECT array_agg(l.name) FROM lessons l WHERE l.id = ANY(p.lessons)),
                        'last_comment', (
                            SELECT pr.comment 
                            FROM post_ratings pr 
                            WHERE pr.post_id = p.id 
                            AND pr.comment IS NOT NULL 
                            ORDER BY pr.date DESC      
                            LIMIT 1                    
                        )
                    )
                    FROM posts p 
                    JOIN student post_author ON post_author.id = p.student_id
                    WHERE p.id = m.post_id
                )
                ELSE NULL END
            ) as post_content
        FROM messages as m 
        LEFT JOIN student as s on m.student_id = s.id
        WHERE m.chat_id = $1
        ORDER BY m.id desc
        LIMIT 40 OFFSET $2
        `;

    const result1 = await db.query(queryText, [chatId, pageOffset]);

    if (offset === 0) {
      const chatInfoQuery = `
            SELECT 
                c.members_id,
                c.name AS chat_name,
                c.image AS chat_image,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'image', s.image,
                            'lastname', s.last_name
                        )
                    )
                    FROM student s 
                    WHERE s.id = ANY(c.members_id)
                ) AS student_data
            FROM chats AS c
            WHERE c.id = $1;
            `;

      const result2 = await db.query(chatInfoQuery, [chatId]);

      res.json({ messages: result1.rows, chatInfo: result2.rows[0] });
      return;
    }

    res.json({ messages: result1.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const CreateChat = async (req, res) => {
  console.log("in create chat_id");
  const { memberIds, chatName = "", image = "" } = req.body;
  let personal = true;
  const creatorId = req.user.id;
  let allMemberIds = memberIds.concat([creatorId]);
  let leadersId = [];
  if (allMemberIds.length > 2) {
    leadersId = [creatorId];
    personal = false;
  } else {
    personal = true;
    leadersId = allMemberIds;
  }

  try {
    const result = await db.query(
      `
            INSERT INTO chats (members_id, name, is_personal, updated_at, leaders_id, image)
            VALUES ($1, $2, $3, NOW(), $4, $5)
            RETURNING id, members_id, name, is_personal, updated_at
            `,
      [allMemberIds, chatName, personal, leadersId, image],
    );
    const chatData = result.rows[0];
    console.log(`created chatId:${chatData.id},${chatData.members_id}`);
    res.json({ chat: chatData });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
};

const GetChat = async (req, res) => {
  const { chatId } = req.params;

  try {
    const query = `
    SELECT
    c.id AS chat_id,
    c.name AS chat_name,
    c.updated_at, -- Crucial for sorting the sidebar
    
    c.is_personal AS is_personal,
    CASE 
        WHEN m.id IS NULL THEN NULL 
        ELSE jsonb_build_object(
            'id', m.id,
            'text', m.text, 
            'post_id', m.post_id,
            'sender_id', m.student_id,
            'date', m.date, -- Added missing comma
            'last_message_reaction', m.reactions, -- Added missing comma
            'last_student', (
                SELECT jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'image', s.image
                )
                FROM student s 
                WHERE s.id = m.student_id
            )
        ) 
    END AS last_message_info,
    CASE 
        WHEN c.is_personal = true THEN (
            SELECT s.image 
            FROM student s 
            WHERE s.id = ANY(c.members_id) 
            AND s.id != $1                 
            LIMIT 1                        
        )
        ELSE c.image 
    END AS chat_image,
    (
        SELECT jsonb_agg(                  
            jsonb_build_object(            
                'id', s.id,
                'name', s.name,
                'image', s.image
            )
            ORDER BY s.name ASC
        )
        FROM student s
        WHERE s.id = ANY(c.members_id)
    ) AS member_details

    FROM chats c
    LEFT JOIN messages m ON c.last_message_id = m.id
    WHERE c.id=$2`;
    const result = await db.query(query, [req.user.id, chatId]);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

const GetChatInbox = async (req, res) => {
  const userId = req.user.id;
  const { offset = 0 } = req.params;
  const chatOffset = offset * 20;
  try {
    let query = `
        SELECT
        c.id AS chat_id,
        c.name AS chat_name,
        c.updated_at, -- Crucial for sorting the sidebar
        
        c.is_personal AS is_personal,
        CASE 
            WHEN m.id IS NULL THEN NULL 
            ELSE jsonb_build_object(
                'id', m.id,
                'text', m.text, 
                'post_id', m.post_id,
                'sender_id', m.student_id,
                'date', m.date, -- Added missing comma
                'last_message_reaction', m.reactions, -- Added missing comma
                'last_student', (
                    SELECT jsonb_build_object(
                        'id', s.id,
                        'name', s.name,
                        'image', s.image
                    )
                    FROM student s 
                    WHERE s.id = m.student_id
                )
            ) 
        END AS last_message_info,
        CASE 
            WHEN c.is_personal = true THEN (
                SELECT s.image 
                FROM student s 
                WHERE s.id = ANY(c.members_id) 
                AND s.id != $1                 
                LIMIT 1                        
            )
            ELSE c.image 
        END AS chat_image,
        (
            SELECT jsonb_agg(                  
                jsonb_build_object(            
                    'id', s.id,
                    'name', s.name,
                    'image', s.image
                )
                ORDER BY s.name ASC
            )
            FROM student s
            WHERE s.id = ANY(c.members_id)
        ) AS member_details

        FROM chats c
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE $1 = ANY(c.members_id)
        ORDER BY c.updated_at DESC 
        limit 20 offset $2
        `;
    const result = await db.query(query, [userId, chatOffset]);

    res.json({ chats: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
module.exports = {
  SendMessage,
  getChatLog,
  CreateChat,
  GetChatInbox,
  GetChat,
};
