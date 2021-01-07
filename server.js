const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const Msg = require('./models/messages')
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const mongoDB = 'mongodb+srv://admin:adm1n1234@cluster0.85ax8.mongodb.net/message-database?retryWrites=true&w=majority'
mongoose.connect(mongoDB,{useNewUrlParser: true, useUnifiedTopology: true}).then(()=>{
  console.log('DB connected');
}).catch(err => console.log(err))
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

const bot = 'Bot';

// Run when user connects
io.on('connection', socket => {

  Msg.find().then(()=>{
    socket.emit('output-message')
  })
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(bot, `Hey ${user.username}, Welcome to Chat App!`));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(bot, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    const message = new Msg({msg})
    message.save().then(()=>{
      io.to(user.room).emit('message', formatMessage(user.username, msg));
    })
    
  });

  // Runs when user disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(bot, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
