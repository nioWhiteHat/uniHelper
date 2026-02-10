const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
require("dotenv").config();
const port = 3000;
const {
  SignUp,
  SignIn,
  GoogleSignIn,
} = require("../StudentApi/StudentController");
const { UpdateProfileTags } = require("../StudentApi/UpdateLabels");
const { Authentication } = require("./auth");
const { Logs } = require("./logs");
const cors = require("cors");
const db = require("../database/dbcon");
const { ViewPersonalProfile } = require("../StudentApi/ViewPersonalProfile");
const { UpdateProfileImage } = require("../StudentApi/ProfileImage");
const {
  ViewProfile,
  commentOnPost,
  likeDislikePost,
} = require("../StudentApi/PossibleActions");
const {
  GetCadidateFriends,
  GetFriends,
  GetFriendRequests,
  SendFriendRequest,
  AcceptFriendRequest,
  RejectFriendRequest,
} = require("../FriendsController/FriendsController");
const {
  GetPostDropDown,
  GetFeed,
  CreatePost,
} = require("../posts/FeedController");
const jwt = require("jsonwebtoken");
const {
  SendMessage,
  getChatLog,
  CreateChat,
  GetChatInbox,
  GetChat,
} = require("../StudentApi/chats");

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("socketio", io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) return next(new Error("No token provided"));
  console.log("asked for connection ");
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    console.log(`thats the possible error:${err}`);
    if (err) return next(new Error("Invalid token"));

    socket.user = decoded;
    socket.data.userId = decoded.id;

    next();
  });
});

io.on("connection", (socket) => {
  const myUserId = socket.user.id;
  console.log("----------------------trying to connect");
  console.log(`User Authenticated and Connected: ${myUserId}`);
  socket.join(`user_${myUserId}`);

  socket.on("join_chat", async (chatId) => {
    try {
      const result = await db.query(
        "SELECT 1 FROM chats WHERE id = $1 AND $2 = ANY(members_id)",
        [chatId, socket.user.id],
      );

      if (result.rowCount > 0) {
        for (const room of socket.rooms) {
          if (room.startsWith("chat_")) socket.leave(room);
        }

        socket.join(`chat_${chatId}`);
        console.log(`User ${socket.user.id} authorized for chat ${chatId}`);
      } else {
        console.error(
          `Unauthorized join attempt by ${socket.user.id} for chat ${chatId}`,
        );
        socket.emit("error", "You are not a member of this chat.");
      }
    } catch (err) {
      console.error("Join chat error:", err);
    }
  });
  socket.on("leave_chat", (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User ${socket.user.id} left chat ${chatId}`);
  });
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${myUserId}`);
  });
});

app.post("/api/SignUp", SignUp);
app.post("/api/GoogleSignIn", GoogleSignIn);
app.post("/api/SignIn", SignIn);
app.get("/api/getID", Authentication, Logs, async (req, res) => {
  const id = req.user.id;
  res.json(id);
});

app.post("/api/UpdateProfileImage", Authentication, Logs, UpdateProfileImage);

app.get("/api/ViewProfile/:studentId", Authentication, Logs, ViewProfile);

app.post("/api/FindPotentialFriends", Authentication, Logs, GetCadidateFriends);
app.post("/api/SendFriendRequest", Authentication, Logs, SendFriendRequest);
app.post("/api/AcceptFriendRequest", Authentication, Logs, AcceptFriendRequest);
app.post("/api/RejectFriendRequest", Authentication, Logs, RejectFriendRequest);
app.post("/api/UpdateProfileTags", Authentication, Logs, UpdateProfileTags);
app.get("/api/GetFriends", Authentication, Logs, GetFriends);
app.get("/api/GetFriendRequests", Authentication, Logs, GetFriendRequests);

app.get("/api/GetPost/:postId", Authentication, Logs, async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await db.query(
      `
      SELECT 
        p.image,
        p.title,
        p.description,
        p.student_id AS creator_id,   
        p.date,
        s.name AS creator,            
        s.image AS creator_image,     
        
        (SELECT COALESCE(SUM("like"), 0) FROM post_ratings pr WHERE pr.post_id = p.id) as total_likes, 
        (SELECT COALESCE(SUM("dislike"), 0) FROM post_ratings pr WHERE pr.post_id = p.id) as total_dislikes,
        
        (SELECT array_agg(i.name) FROM interests i WHERE i.id = ANY(p.interests)) as interest_labels,
        (SELECT array_agg(l.name) FROM lessons l WHERE l.id = ANY(p.lessons)) as lesson_labels,
        (
          SELECT pr.comment 
          FROM post_ratings pr 
          WHERE pr.post_id = p.id 
          AND pr.comment IS NOT NULL 
          ORDER BY pr.date DESC      
          LIMIT 1                    
        ) as last_comment
      FROM posts p 
      JOIN students s ON s.id = p.student_id
      WHERE p.id = $1
    `,
      [postId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
app.post("/api/GetFeed", Authentication, Logs, GetFeed);
app.post("/api/GetPostDropDown", Authentication, Logs, GetPostDropDown);
app.post("/api/CreatePost", Authentication, Logs, CreatePost);
app.post("/api/CommentOnPost", Authentication, Logs, commentOnPost);
app.post("/api/LikeDislikePost", Authentication, Logs, likeDislikePost);

app.post("/api/SendMessage", Authentication, Logs, SendMessage);
app.get("/api/GetChatLog/:chatId/:offset", Authentication, Logs, getChatLog);
app.post("/api/CreateChat", Authentication, Logs, CreateChat);
app.get("/api/GetChat/:chatId", Authentication, Logs, GetChat);
app.get("/api/GetChatInbox/:offset", Authentication, Logs, GetChatInbox);
app.get("/api/ViewPersonalProfile", Authentication, Logs, ViewPersonalProfile);

app.get("/api/interests", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM interests ORDER BY name ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/api/lessons", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, semester FROM lessons ORDER BY semester ASC, name ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
