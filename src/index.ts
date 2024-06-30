import express from "express";

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
app.use(cookieParser());

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
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspace", workspaceRoutes);
app.use("/api/v1/channel", channleRoutes);
app.use("/api/v1/chat", chatRoutes);

app.use(errorResponse);

io.on("connection", (socket) => {
  const user = socket.user;

  userSocketIds.set(user._id.toString(), socket.id);
  console.log(userSocketIds);
  socket.on(NEW_MESSAAGE, async ({ chatId, members, message }) => {
    const messageForRealTIme = {
      content: message,
      attachments: [],
      sender: {
        _id: user._id,
        name: user.name,
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
    console.log("member_sockets", membersSockets);
    io.to(membersSockets).emit(NEW_MESSAAGE, {
      chatId,
      message: messageForRealTIme,
    });

    // console.log("new message", messageForRealTIme);
  });
});

httpServer.listen("7000", () => {
  console.log("app listening in port 7000");
});

export { userSocketIds };
