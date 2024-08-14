import { NextFunction, Request, Response } from "express";
import Channel from "../models/chanel";
import Chat from "../models/chat";
import User from "../models/user";
import Message from "../models/message";
import { me } from "./authController";
import mongoose from "mongoose";

export const newChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { _id, type, organizationId } = req.body;

    const userId = req.userId;

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid organizationId" });
    }
    if (type === "channel") {
      const channel = await Channel.findById(_id);

      if (!channel) {
        return res
          .status(404)
          .json({ success: false, message: "Channel not found" });
      }

      let channelChat = await Chat.findOne({ channel: _id }).populate(
        "collaborators",
        "username"
      );

      if (!channelChat) {
        channelChat = await Chat.create({
          name: channel.name,
          collaborators: channel.collaborators,
          description: "",
          isSelf: false,
          organisation: organizationId,
          createdBy: userId,
          isGroup: true,
          channel: channel._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await channelChat.populate("collaborators", "username");
      }
      // Additional logic for channels can be added here
      return res.status(200).json({ success: true, chat: channelChat });
    }

    if (type === "user") {
      const user = await User.findById(_id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      if (!_id) {
        return res.status(400).json({ success: false, message: "bad request" });
      }

      let chat = await Chat.findOne({
        collaborators: { $all: [userId, _id] },
        isGroup: false,
        organisation: organizationId,
      }).populate("collaborators", "username");

      if (!chat) {
        chat = await Chat.create({
          name: "",
          collaborators: [userId, _id],
          description: "",
          isSelf: false,
          organisation: organizationId,
          createdBy: userId,
          isGroup: false,
          channel: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await chat.populate("collaborators", "username");
      }

      const transformedData = {
        _id: chat._id,
        name: user.username,
        collaborators: chat.collaborators,
        description: chat.description,
        isSelf: chat.isSelf,
        organisation: chat.organisation,
        createdBy: chat.createdBy,
        isGroup: chat.isGroup,
        channel: chat.channel,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      };

      return res
        .status(200)
        .json({ success: true, chat: transformedData, tid: _id, type: type });
    }

    // If type is neither 'channel' nor 'user'
    return res.status(400).json({ success: false, message: "Invalid type" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const chatId = req.params.id;

    const page = Number(req.query.page) || 1;
    const resultPerPage = Number(req.query.limit) || 10;
    const [messages, totalNoOfMessages] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * resultPerPage)
        .limit(resultPerPage)
        .populate("sender", "username"),
      Message.countDocuments({ chat: chatId }),
    ]);

    const transformedMessages = messages.map((message) => ({
      content: message.content,
      attachments: [],
      sender: message.sender,
      chat: chatId,
      createdAt: message.createdAt,
    }));

    const totalPages = Math.ceil(totalNoOfMessages / resultPerPage) || 0;

    return res
      .status(200)
      .json({ success: true, messages: transformedMessages, totalPages, page });
  } catch (error) {
    next(error);
  }
};
