const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const app = express();
const port = 3000;
const { SignUp,SignIn } = require('../StudentApi/StudentController');
const { Authentication } = require('./auth');
const { Logs } = require('./logs');
const cors = require('cors');
const db = require('../database/dbcon');
const {
  GetCadidateFriends,
    ViewProfile,
    SendFriendRequest,
    AcceptFriendRequest,
    RejectFriendRequest,
    
    commentOnPost,
    likeDislikePost} =  require('../StudentApi/PossibleActions');
const {GetPostDropDown,GetFeed,CreatePost} = require('../posts/FeedController');
const jwt = require('jsonwebtoken');
const { SendMessage,
    getChatLog,
    CreateChat,
    GetChatInbox } = require('../StudentApi/chats');

app.use(express.json());
app.use(cors(
    {
        origin: '*',
        credentials: true,
        methods: ['GET','POST','PUT','DELETE']
    }
));
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
}); 
app.set('socketio', io);
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, "YOUR_SECRET_KEY", (err, decoded) => {
        if (err) {
            return next(new Error("Authentication error: Invalid token"));
        }

        
        socket.user = decoded; 

        next();
    });
});

io.on('connection', (socket) => {
    const myUserId = socket.user.id; 

    console.log(`User Authenticated and Connected: ${myUserId}`);
    socket.join(`user_${myUserId}`);

    socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`User ${myUserId} joined chat ${chatId}`);
    });
    
    socket.on('disconnect', () => {
        
        console.log(`User Disconnected: ${myUserId}`);
    });
});

app.post('/api/SignUp', SignUp);
app.post('/api/SignIn', SignIn);

app.get('/api/FindPotentialFriends', Authentication, Logs, GetCadidateFriends);
app.get('/api/ViewProfile/:studentId', Authentication, Logs, ViewProfile);

app.post('/api/SendFriendRequest', Authentication, Logs, SendFriendRequest);
app.post('/api/AcceptFriendRequest', Authentication, Logs, AcceptFriendRequest);
app.post('/api/RejectFriendRequest', Authentication, Logs, RejectFriendRequest);

app.post('/api/GetFeed', Authentication, Logs, GetFeed);
app.post('/api/GetPostDropDown', Authentication, Logs, GetPostDropDown);
app.post('/api/CreatePost', Authentication, Logs, CreatePost);
app.post('/api/CommentOnPost', Authentication, Logs, commentOnPost);
app.post('/api/LikeDislikePost', Authentication, Logs, likeDislikePost);

app.post('/api/SendMessage', Authentication, Logs, SendMessage);
app.get('/api/GetChatLog/:chatId/:offset', Authentication, Logs, getChatLog);
app.post('/api/CreateChat', Authentication, Logs, CreateChat);
app.get('/api/GetChatInbox/:offset', Authentication, Logs, GetChatInbox);
app.get('/api/interests', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name FROM interests ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.get('/api/lessons', async (req, res) => {
    try {
        // We order by semester so the frontend can group them easily
        const result = await db.query('SELECT id, name, semester FROM lessons ORDER BY semester ASC, name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
