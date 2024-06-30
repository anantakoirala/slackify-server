import mongoose from "mongoose";
import { UserSchemaType } from "./user";
import { ChannelSchemaType } from "./chanel";

export interface ConversationSchemaType {
  name: string;
  collaborators: mongoose.Schema.Types.ObjectId[] | UserSchemaType[];
  description: string;
  isSelf: boolean;
  organisation: mongoose.Schema.Types.ObjectId;
  createdBy: mongoose.Schema.Types.ObjectId;
  isGroup: Boolean;
  channel: mongoose.Schema.Types.ObjectId & ChannelSchemaType;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new mongoose.Schema<ConversationSchemaType>(
  {
    name: { type: String, default: "" },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    description: {
      type: String,
      require: false,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    isSelf: {
      type: Boolean,
      default: false,
    },
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
