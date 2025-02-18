import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.send("Socket.io server is running.");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", (chatname) => {

    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }})
      
    socket.join(chatname);
    console.log(`User joined room: ${chatname}`);
  });

  socket.on("userJoined", ({chatname, username, text}) => {
    console.log(`User`, chatname, username);
    io.to(chatname).emit("userJoin", username, text);
  });

  socket.on("leaveRoom", ({chatname, username}) => {
    socket.leave(chatname);
    console.log(`User left room: ${chatname}`);
    io.to(chatname).emit("userLeft", username);
  });

  socket.on("sendMessage", ({ chatname, username, message }) => {
    console.log(`Message sent to room ${chatname}: ${message}`);
    socket.to(chatname).emit("message", username, message);
  });
  
  socket.on("sendImage", ({chatname, username, image}) => {
    socket.to(chatname).emit("receiveImage", username, image);
  })

  socket.on("deleteChat", (chatname) => {
    const socketsInRoom = io.sockets.adapter.rooms.get(chatname);
    if (socketsInRoom) {
      socket.to(chatname).emit("roomDeleted", `Room ${chatname} has been deleted.`);
      for (const socketId of socketsInRoom) {
        const socketToDisconnect = io.sockets.sockets.get(socketId);
        socketToDisconnect.leave(chatname);
      }
    }
  });

  socket.on("kicked", ({chatname, username}) => {
    io.to(chatname).emit("kicked", username);
  })
  socket.on("banned", ({chatname, username, type}) => {
    io.to(chatname).emit("banned", username, type);
  })

  socket.on('user-typing', (chatname) => {
    socket.to(chatname).emit('user-typing');
  });

  socket.on('user-stopped-typing', (chatname) => {
    socket.to(chatname).emit('user-stopped-typing');
  });

  socket.on("profilePictureChanged", ({chatname, profilePicture}) => {
    socket.to(chatname).emit("profilePictureChanged", profilePicture);
  });
  socket.on("backgroundImageChanged", ({chatname, backgroundImage}) => {
    socket.to(chatname).emit("backgroundImageChanged", backgroundImage);
  });

  socket.on('send-voice', ({username, chatname, audioBlob}) => {
    socket.to(chatname).emit('receive-voice', username, audioBlob);
  });

  socket.on('send-file', ({username, chatname, fileUrl, fileName}) => {
    socket.to(chatname).emit('receive-file', username, fileUrl, fileName);
  });

  socket.on('send-video', ({username, chatname, videoUrl, videoName}) => {
    socket.to(chatname).emit('receive-file', username, videoUrl, videoName);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});


const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
