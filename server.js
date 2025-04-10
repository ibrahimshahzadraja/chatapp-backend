import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import webpush from 'web-push';
import cors from 'cors';
import Subscription from "./models/Subscription.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

webpush.setVapidDetails(
  'mailto:you@example.com',
  'BJN9tbqwGIV5lw6qwEsxFqeZFjOmJ3rBfPJay8RFZXgNJ0_KiIGrRMmvG3eQvV1ZTfIMnzjamFJrRqoZs_R3kco',
  'GM8PGwwA7KQn4EF9S_uxhtFFerRdSajk_eXm3wbPO1w'
);

const app = express();

app.use(express.json());

app.use(cors({
  origin: "https://chatapp-test-ashy.vercel.app/",
  methods: ['GET', 'POST'],
  credentials: true
}));

let connection = await mongoose.connect(process.env.MONGO_DB_URL)

if(connection.connection.readyState){
  console.log('MongoDB connected successfully')
}

const sendNotification = async (title, message, icon, allUsers) => {
  
  const subs = await Subscription.find({ username: { $in: allUsers } });

  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: sub.keys
      }, JSON.stringify({ title, message, icon }));
      
    } catch (err) {
      console.error('Push Notification Error:', err);
    }
  }
};


const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "https://chatapp-test-ashy.vercel.app/",
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.send("Socket.io server is running.");
});

app.post("/api/subscribe", async (req, res) => {
  const {subscription, username} = req.body;

  if (!subscription || !username) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await Subscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { ...subscription, username },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Subscription saved.' });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Subscription failed.' });
  }
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

  socket.on("sendMessage", ({ chatname, profilePicture, allUsers, username, message, replyObj }) => {
    socket.to(chatname).emit("message", username, message, replyObj);
    sendNotification(chatname, `${username}: ${message}`, profilePicture, allUsers);
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
