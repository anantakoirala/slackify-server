import express, { Response } from "express";

import dotenv from "dotenv";
dotenv.config();
import connectDB from "./utils/db";
import cookieParser from "cookie-parser";
import errorResponse from "./middleware/errorResponse";
import authRoutes from "./routes/auth";
import workspaceRoutes from "./routes/workspace";
import channleRoutes from "./routes/channel";
import chatRoutes from "./routes/chat";
import cors from "cors";
import cookie from "cookie";
import passport from "passport";
import { Server } from "socket.io";
import { createServer } from "http";
import { NEW_MESSAAGE } from "./constants";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "./models/user";
import { getSockets } from "./utils/getSockets";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

const userSocketIds = new Map();

const userRoomSocketId = new Map();

app.use(cookieParser());

// Store users' sockets by their user IDs
const users: any = {};

// console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET);
// console.log("Client URL:", process.env.CLIENT_URL);

// cookie-parser configuration

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
//app.use(passport.session());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

declare module "socket.io" {
  interface Socket {
    user?: any; // Adjust the type as per your user model
  }
}

io.use(async (socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie;

  if (!cookieHeader) {
    return next(new Error("Authentication error: No cookies present"));
  }

  // Parse the cookies using the 'cookie' module
  const cookies = cookie.parse(cookieHeader);

  // Extract the auth_token from the parsed cookies
  const token = cookies.token;

  if (!token) {
    return next(new Error("Authentication error: auth_token cookie not found"));
  }

  // Use the token for your authentication logic

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    const user = await User.findById((decoded as jwt.JwtPayload).id);

    //console.log("ananta", user);
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }
    // Attach the user to the socket
    socket.user = user;

    next();
  } catch (err) {
    console.log("error", err);
    return next(new Error("Authentication error: Invalid token"));
  }
});

connectDB();
app.use("/", (req, res: Response) => {
  res.json("hello");
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspace", workspaceRoutes);
app.use("/api/v1/channel", channleRoutes);
app.use("/api/v1/chat", chatRoutes);

app.use(errorResponse);

io.on("connection", (socket) => {
  const user = socket.user;

  userSocketIds.set(user._id.toString(), socket.id);
  socket.on(NEW_MESSAAGE, async ({ chatId, members, message }) => {
    const messageForRealTIme = {
      content: message,
      attachments: [],
      sender: {
        _id: user._id,
        username: user.username,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    // console.log("emmiting message for real time", messageForRealTIme);

    const membersSockets = getSockets(members);

    io.to(membersSockets).emit(NEW_MESSAAGE, {
      chatId,
      message: messageForRealTIme,
    });

    // console.log("new message", messageForRealTIme);
  });

  socket.on("online", (data) => {});
  // Event handler for joining a room
  socket.on("join-room", ({ roomId, userId, targetUserId }) => {
    console.log("room_id", roomId);
    console.log("userId", userId);
    // Join the specified room
    socket.join(roomId);
    // Store the user's socket by their user ID
    users[userId] = socket;
    // Broadcast the "join-room" event to notify other users in the room
    socket.to(roomId).emit("join-room", { roomId, otherUserId: userId });

    console.log(`User ${userId} joined room ${roomId}`);
  });

  // Event handler for sending an SDP offer to another user
  socket.on("offer", ({ offer, targetUserId }) => {
    // Find the target user's socket by their user ID
    const targetSocket = users[targetUserId];
    if (targetSocket) {
      targetSocket.emit("offer", { offer, senderUserId: targetUserId });
    }
  });

  // Event handler for sending an SDP answer to another user
  socket.on("answer", ({ answer, senderUserId }) => {
    socket.broadcast.emit("answer", { answer, senderUserId });
  });

  // Event handler for sending ICE candidates to the appropriate user (the answerer)
  socket.on("ice-candidate", ({ candidate, senderUserId }) => {
    // Find the target user's socket by their user ID
    const targetSocket = users[senderUserId];
    if (targetSocket) {
      targetSocket.emit("ice-candidate", candidate, senderUserId);
    }
  });

  // Event handler for leaving a room
  socket.on("room-leave", ({ roomId, userId }) => {
    console.log("roomleave", roomId);
    console.log("roomleacve-userId", userId);
    socket.leave(roomId);
    // Remove the user's socket from the users object
    delete users[userId];
    // Broadcast the "room-leave" event to notify other users in the room
    socket.to(roomId).emit("room-leave", { roomId, leftUserId: userId });
    console.log(`User ${userId} left room ${roomId}`);
  });
});

httpServer.listen("7000", () => {
  console.log("app listening in port 7000");
});

export { userSocketIds };
