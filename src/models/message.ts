import mongoose, { Types } from "mongoose";
import { UserSchemaType } from "./user";
import { ConversationSchemaType } from "./chat";

interface MessageSchema {
  content: string;
  sender: Types.ObjectId & UserSchemaType;
  chat: Types.ObjectId & ConversationSchemaType;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
    },

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
