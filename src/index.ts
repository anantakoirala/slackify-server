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
import User, { UserSchemaType } from "./models/user";
import { getSockets, getMultipleSockets } from "./utils/getSockets";
import WorkSpace from "./models/workspace";
import Chat from "./models/chat";
import Message from "./models/message";
import { checkUserStatus } from "./utils/checkUserStatus";
const { ExpressPeerServer } = require("peer");

const app = express();

const httpServer = createServer(app);

httpServer.listen("7000", () => {
  console.log("app listening in port 7000");
});

const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});
// Create a PeerJS server
const peerServer = ExpressPeerServer(httpServer, {
  debug: true,
  allow_discovery: true,
});

app.use("/peerjs", peerServer);
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
// app.use("/", (req, res: Response) => {
//   res.json("hello");
// });
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspace", workspaceRoutes);
app.use("/api/v1/channel", channleRoutes);
app.use("/api/v1/chat", chatRoutes);

app.use(errorResponse);

const onlineUsers = new Map();
const videoChatRoom = new Map();
const chatIdList = new Map();
const rooms: {
  [roomId: string]: {
    [userId: string]: string[];
  };
} = {};

io.on("connection", (socket) => {
  const { organizationId } = socket.handshake.query;

  const user = socket.user;

  userSocketIds.set(user._id.toString(), socket.id);

  // When a user logs in or joins, store their userId or username
  socket.on("userJoined", ({ organizationId }) => {
    if (!organizationId) return;

    socket.join(organizationId);
    // Add user to the organization-specific list
    if (!onlineUsers.has(organizationId)) {
      onlineUsers.set(organizationId, new Map());
    }

    const orgUsers = onlineUsers.get(organizationId);

    // Check if the user already has an array of socket IDs
    if (!orgUsers.has(user._id.toString())) {
      orgUsers.set(user._id.toString(), []);
    } else {
      console.log("cha");
    }

    const onLineUserSocketIds = orgUsers.get(user._id.toString());

    // Add the new socket ID to the user's array of socket IDs
    if (!onLineUserSocketIds.includes(socket.id)) {
      onLineUserSocketIds.push(socket.id);
    }

    io.to(organizationId).emit(
      "updateUserList",
      Array.from(onlineUsers.get(organizationId).keys())
    );
  });
  socket.on(
    NEW_MESSAAGE,
    async ({ chatId, members, message, organizationId }) => {
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

      const membersSockets = getSockets(organizationId, members);

      io.to(membersSockets).emit(NEW_MESSAAGE, {
        chatId,
        message: messageForRealTIme,
      });

      // console.log("new message", messageForRealTIme);
      await Message.create(messageForDB);
    }
  );

  // Event handler for joining a room
  socket.on("join-room", ({ roomId, userId, peerId }) => {
    console.log("roomId", roomId);
    //const videoChatRoomUsers = videoChatRoom.get(roomId);

    // Join the specified room
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }

    // Ensure the user exists in the room
    if (!rooms[roomId][userId]) {
      rooms[roomId][userId] = [];
    }

    // Add the socket id to the user's array
    rooms[roomId][userId].push(socket.id);
    //console.log("rooms", rooms);
    // Broadcast the "join-room" event to notify other users in the room
    socket.to(roomId).emit("join-room", { roomId, newUserId: userId, peerId });

    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on("incomming-call", async ({ chatId }) => {
    console.log("incomming-call chatId", chatId);
    console.log("incomming-call");
    const userId = user._id.toString();

    // console.log("result", result);
    // console.log("roomof my", rooms[chatId]);
    if (chatId) {
      const result = checkUserStatus(userId, rooms);
      console.log("############################################");
      console.log("result", result);
      console.log("############################################");
      if (!result.isCompletePair) {
        const chat = await Chat.findById(chatId).populate(
          "collaborators",
          "username _id"
        );

        console.log("############################################");
        console.log("chat", chat);
        console.log("############################################");

        let newTargetId;
        if (!chat) {
          return;
        } else {
          const chatMembers = chat.collaborators as UserSchemaType[];
          const res = chatMembers.map((chat) => chat._id.toString());

          newTargetId = res.filter(
            (chatUser) => chatUser !== user._id.toString()
          );
        }
        // Add user to the organization-specific list
        if (!videoChatRoom.has(chatId)) {
          videoChatRoom.set(chatId, new Map());
        }
        const videoChatRoomUsers = videoChatRoom.get(chatId);

        chatIdList.set(`${organizationId}-${user._id}`, chatId);
        videoChatRoomUsers.set(user._id.toString(), socket.id);

        const messageForRealTIme = {
          attachments: [],
          sender: {
            _id: user._id,
            username: user.username,
          },
          chat: chatId,
          organizationId,
          createdAt: new Date().toISOString(),
        };

        const socketIds = onlineUsers.get(organizationId);

        const membersSockets = getSockets(
          organizationId as string,
          newTargetId
        );
        const multiplemembersSockets = getMultipleSockets(
          organizationId as string,
          newTargetId
        );

        const userInChatRoom = Array.from(videoChatRoom.get(chatId).keys());

        const isThere = newTargetId.some((targetId) =>
          userInChatRoom.includes(targetId)
        );
        //console.log("isThere", isThere);
        if (!isThere) {
          console.log("isthere", isThere);
          if (multiplemembersSockets.length > 0) {
            console.log("multiplemembersSockets", multiplemembersSockets);
            io.to(multiplemembersSockets).emit("incomming-call", {
              chatId,
              message: messageForRealTIme,
            });
          }
        }
      }
    } else {
      return;
    }
  });

  // Event handler for leaving a room
  socket.on("room-leave", ({ roomId, userId }) => {
    socket.leave(roomId);
    // Remove the user's socket from the users object
    delete users[userId];
    //removing user from chatRoomList
    const key = `${organizationId}-${user._id}`;

    const chatId = chatIdList.get(key);

    videoChatRoom.delete(chatId);
    // Broadcast the "room-leave" event to notify other users in the room
    socket.to(roomId).emit("room-leave", { roomId, leftUserId: userId });
    //console.log(`User ${userId} left room ${roomId}`);
  });

  socket.on("end-call", async ({ roomId }) => {
    const userId = user._id.toString();
    if (Array.from(videoChatRoom).length > 0) {
      const chat = await Chat.findById(roomId).populate(
        "collaborators",
        "username _id"
      );
      if (chat) {
        const chatMembers = chat.collaborators as UserSchemaType[];

        const res = chatMembers.map((chat) => chat._id.toString());

        const newTargetId = res.filter(
          (chatUser) => chatUser !== user._id.toString()
        );

        if (newTargetId.length > 0) {
          const multiplemembersSockets = getMultipleSockets(
            organizationId as string,
            newTargetId
          );

          io.to(multiplemembersSockets).emit("end-call");
        }

        const key = `${organizationId}-${user._id}`;

        const chatId = chatIdList.get(key);

        videoChatRoom.delete(chatId);
        //delete roomId from rooms
        if (rooms[roomId]) {
          delete rooms[roomId];
          // Check if the user exists in the room
          // if (rooms[roomId][userId]) {
          //   // Remove the user's sockets
          //   delete rooms[roomId][userId];

          //   // Check if the room is now empty (no users left)
          //   if (Object.keys(rooms[roomId]).length === 0) {
          //     // Remove the room if it is empty
          //     delete rooms[roomId];
          //   }
          // } else {
          //   console.log(`User ${userId} not found in room ${roomId}.`);
          // }
        } else {
          //console.log(`Room ${roomId} does not exist.`);
        }
      }
    }
  });

  socket.on("disconnect", async (reason) => {
    console.log("disconnected", socket.id);
    const organizationId = socket.handshake.query.organizationId as string;
    const userId = user._id.toString();

    // Check if the organization ID and user ID are available
    if (organizationId && userId) {
      // Retrieve the organization-specific users map
      const orgUsers = onlineUsers.get(organizationId);

      if (orgUsers) {
        // Retrieve the array of socket IDs for the user
        const userSocketIds = orgUsers.get(userId);

        if (userSocketIds) {
          // Remove the current socket ID from the user's array of socket IDs
          const index = userSocketIds.indexOf(socket.id);
          if (index > -1) {
            userSocketIds.splice(index, 1);
          }

          // If the user has no more connected sockets, remove the user entry
          if (userSocketIds.length === 0) {
            orgUsers.delete(userId);

            // If no users are left in the organization, remove the organization entry
            if (orgUsers.size === 0) {
              onlineUsers.delete(organizationId);
            }
          }
        }

        // Emit updated user list to all clients in the organization
        io.to(organizationId).emit(
          "updateUserList",
          Array.from(orgUsers.keys())
        );
      }
    }

    //removing user from chatRoomList
    const key = `${organizationId}-${user._id}`;

    const chatId = chatIdList.get(key);

    const chat = await Chat.findById(chatId).populate(
      "collaborators",
      "username _id"
    );
    if (chat) {
      const chatMembers = chat.collaborators as UserSchemaType[];

      const res = chatMembers.map((chat) => chat._id.toString());

      const newTargetId = res.filter(
        (chatUser) => chatUser !== user._id.toString()
      );

      if (newTargetId.length > 0) {
        const multiplemembersSockets = getMultipleSockets(
          organizationId as string,
          newTargetId
        );

        io.to(multiplemembersSockets).emit("connection-lost");
      }
    }

    videoChatRoom.delete(chatId);
    for (const roomId in rooms) {
      for (const userId in rooms[roomId]) {
        const index = rooms[roomId][userId].indexOf(socket.id);
        if (index !== -1) {
          // Remove the socket ID from the user's array
          rooms[roomId][userId].splice(index, 1);

          // If the user's array is empty, remove the user from the room
          if (rooms[roomId][userId].length === 0) {
            delete rooms[roomId][userId];
          }

          // If the room is empty (no users left), delete the room
          if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId];
          }

          socket.to(roomId).emit("user-left", { userId, socketId: socket.id });
          break;
        }
      }
    }

    // Remove the user's socket ID from the global userSocketIds map
    userSocketIds.delete(userId);
    socket.to(socket.id).emit("connection-lost", () => {
      // console.log("connection lost");
    });
  });
});

export { userSocketIds, onlineUsers };
