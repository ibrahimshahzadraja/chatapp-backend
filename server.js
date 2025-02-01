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
    socket.join(chatname);
    console.log(`User joined room: ${chatname}`);
  });

  socket.on("leaveRoom", (chatname) => {
    socket.leave(chatname);
    console.log(`User left room: ${chatname}`);
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

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});


const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
