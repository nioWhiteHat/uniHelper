const db = require('../database/dbcon');

const SendMessage = async (req, res) => {
    senderId = req.user.id;
    const { chatId, messageText, postId = null, replyId = null, reaction = null } = req.body;
    try {
        const result = await db.query(
            `
            WITH inserted_message AS (
                INSERT INTO messages (student_id, chat_id, text, post_id, reply_id, reaction)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, chat_id, date, text, post_id, reply_id, reaction -- Return whatever message data you need
            ),
            student_info AS (
                SELECT name, image
                FROM students
                WHERE id = $1
            ),
            updated_chat AS (
                UPDATE chats
                SET last_message_id = (SELECT id FROM inserted_message),
                    updated_at = NOW()
                WHERE id = $2 -- We use $2 because it is the chatId
                RETURNING members_id,name -- Return the list of IDs to notify
            )
            SELECT 
                i.id as message_id,
                i.text,
                i.date,
                u.members,
                i.post_id,
                i.reply_id,
                i.reaction,
                u.name as chat_name,
                s.name as sender_name,
                s.image as sender_image


            FROM inserted_message i, updated_chat u, student_info s
            `,
            [senderId, chatId, messageText, postId, replyId, reaction]
        );
        const io = req.app.get('socketio');
        const messageData = result.rows[0];
        const chatRoomName = `chat_${chatId}`;
        io.to(chatRoomName).emit('new_message', {
            senderId: senderId,
            senderName: messageData.sender_name,
            senderImage: messageData.sender_image,
            messageId: messageData.message_id,
            text: messageData.text,
            date: messageData.date,
            postId: messageData.post_id,
            replyId: messageData.reply_id,
            reaction: messageData.reaction
        });
        const socketsInRoom = await io.in(chatRoomName).fetchSockets();
        const activeUserIds = new Set(socketsInRoom.map(s => s.data.userId));
        updateSeenStatus(chatId, messageData.message_id, Array.from(activeUserIds));
        const membersToNotify = messageData.members.filter(memberId => {
            const isSender = (memberId === senderId);
            const isWatchingChat = activeUserIds.has(memberId.toString()); // Ensure string/int matching
            return !isSender && !isWatchingChat;
        });
        membersToNotify.forEach(memberId => {
            const userRoomName = `user_${memberId}`;
            io.to(userRoomName).emit('chat_notification', {
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
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const updateSeenStatus = async (chatId, messageId, memberIdsWhoSawIt) => {
    try {
        
        const io = req.app.get('socketio');
        const patchData = {};
        memberIdsWhoSawIt.forEach(id => {
            patchData[id] = messageId;
        });

        io.to(`chat_${chatId}`).emit('messages_seen_update', {
            chatId: chatId,
            messageId: messageId,
            memberIds: memberIdsWhoSawIt
        });
        await db.query(
            `UPDATE chats 
             SET read_status = read_status || $1::jsonb 
             WHERE id = $2`,
            [JSON.stringify(patchData), chatId]
        );

        console.log("Atomic update successful");

    } catch (err) {
        console.error(err);
    }
};

const getChatLog = async (req, res) => {
    const { chatId, lastMessageId } = req.params;

    userId = req.user.id;
    updateSeenStatus(chatId, lastMessageId, [userId]);
    const offset = parseInt(req.params.offset) || 0;
    const pageOffset = offset * 20;
    try {
        let queryText = 
        `
        SELECT m.*,s.name,s.image
        FROM messages as m left join students as s on m.student_id=s.id
        where m.chat_id=$1
        order by m.date desc
        LIMIT 20 OFFSET $2
        `;
        const result1 = await db.query(queryText, [chatId, pageOffset]);
        if (offset === 0) {
            queryText = 
            `
            SELECT c.members_id,c.name,c.image,s.name,s.id,s.image,s.lastname
            FROM chats as c, students as s
            where c.id=$1 and s.id!= $2 and s.id=ANY (c.members_id)
            `;
            const result2 =  await db.query(queryText, [chatId, userId]);
            res.json({ messages: result1.rows, chatInfo: result2.rows });
            return;
        }
        
        res.json({ messages: result1.rows });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const CreateChat = async (req, res) => {
    const { memberIds, chatName = '' } = req.body;
    let personal = true;
    const creatorId = req.user.id;
    let allMemberIds = memberIds.concat([creatorId]);
    let leadersId = [];
    if (allMemberIds.length > 2) {
        leadersId = [creatorId];
        personal = false;
    }else{
        personal = true;
        leadersId = memberIds;
    }
    
    try {
        const result = await db.query(
            `
            INSERT INTO chats (members_id, name, personal, updated_at, leaders_id)
            VALUES ($1, $2, $3, NOW(), $4)
            RETURNING id, members_id, name, personal, updated_at
            `,
            [allMemberIds, chatName, personal, leadersId]);
        const chatData = result.rows[0];
        res.json({ chat: chatData });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
const GetChatInbox = async (req, res) => {
    const userId = req.user.id;
    const { offset = 0} = req.params;
    const chatOffset = offset * 20;
    try {
        let query = 
        `
        SELECT
        c.id AS chat_id,
        c.name AS chat_name,
        c.updated_at, -- Crucial for sorting the sidebar
        c.image AS chat_image,
        c.personal AS is_personal,
        CASE 
            WHEN m.id IS NULL THEN NULL 
            ELSE jsonb_build_object(
                'id', m.id,
                'text', m.message_text, -- Ensure this matches your actual column name
                'post_id', m.post_id,
                'sender_id', m.sender_id,
                'date', m.created_at
            ) 
        END AS last_message_info,
        (
            SELECT jsonb_agg(                  -- 3. Crush rows into one JSON Array [...]
                jsonb_build_object(            -- 2. Build {"id": x, "name": y} object per row
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
        ORDER BY c.updated_at DESC; -- Most recent chats at the top
        limit 20 offset $2
        `
        const result = await db.query(query, [userId, chatOffset]);
        let lastPersonWhoSentMessage = [];
        result.rows.forEach(chat => {
            if (chat.last_message_info) {
                const senderId = chat.last_message_info.sender_id;
                const sender = chat.member_details.find(member => member.id === senderId);
                lastPersonWhoSentMessage.push({
                    chatId: chat.chat_id,
                    senderName: sender ? sender.name : "Unknown",
                    senderImage: sender ? sender.image : null,
                    date: chat.last_message_info.date
                });
            } 
        });
        res.json({ chats: result.rows, lastPersonWhoSentMessage });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
module.exports = {
    SendMessage,
    getChatLog,
    CreateChat,
    GetChatInbox
};
        

