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
  });

  socket.on("userJoined", ({chatname, username, text, profilePicture}) => {
    io.to(chatname).emit("userJoin", username, text, profilePicture);
  });

  socket.on("leaveRoom", ({chatname, username}) => {
    socket.leave(chatname);
    io.to(chatname).emit("userLeft", username);
  });

  socket.on("sendMessage", ({ chatname, username, message, replyObj }) => {
    socket.to(chatname).emit("message", username, message, replyObj);
  });
  
  socket.on("sendImage", ({chatname, username, image, imageName, replyObj}) => {
    socket.to(chatname).emit("receiveImage", username, image, imageName, replyObj);
  })

  socket.on("chatChanged", ({chatname, text}) => {
    console.log(chatname, text);
    socket.to(chatname).emit("chatChanged", text);
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

  socket.on("kicked", ({chatname, username, userAdmin}) => {
    socket.to(chatname).emit("kicked", username, userAdmin);
  })
  socket.on("banned", ({chatname, username, type, userAdmin}) => {
    socket.to(chatname).emit("banned", username, type, userAdmin);
  })
  socket.on("admin", ({chatname, username, type}) => {
    socket.to(chatname).emit("admin", username, type);
  })

  socket.on('user-typing', (chatname) => {
    socket.to(chatname).emit('user-typing');
  });

  socket.on('user-stopped-typing', (chatname) => {
    socket.to(chatname).emit('user-stopped-typing');
  });

  socket.on("chatUpdated", ({chatname, profilePicture, prevChatname}) => {
    socket.to(prevChatname).emit("chatUpdated", chatname, profilePicture);
  });
  socket.on("backgroundImageChanged", ({chatname, backgroundImage}) => {
    socket.to(chatname).emit("backgroundImageChanged", backgroundImage);
  });

  socket.on('send-voice', ({username, chatname, audioBlob, replyObj}) => {
    socket.to(chatname).emit('receive-voice', username, audioBlob, replyObj);
  });

  socket.on('send-file', ({username, chatname, fileUrl, fileName, replyObj}) => {
    socket.to(chatname).emit('receive-file', username, fileUrl, fileName, replyObj);
  });

  socket.on('send-video', ({username, chatname, videoUrl, videoName, replyObj}) => {
    socket.to(chatname).emit('receive-video', username, videoUrl, videoName, replyObj);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});


const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
