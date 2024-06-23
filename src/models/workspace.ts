import mongoose from "mongoose";
import { UserSchemaType } from "./user";

export interface WorkSpaceInterface {
  owner: mongoose.Schema.Types.ObjectId;
  name: string;
  coWorkers: mongoose.Schema.Types.ObjectId[] & UserSchemaType[];
  generateJoinLink: () => string;
  joinLink: string;
  url: string;
}

const workspaceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
    },
    coWorkers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    joinLink: String,
    url: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

workspaceSchema.methods.generateJoinLink = function () {
  const url =
    process.env.NODE_ENV === "development"
      ? process.env.STAGING_URL
      : process.env.PRODUCTION_URL;
  this.joinLink = `${url}/${this._id}`;
  this.url = `${url}/${this.name}`;
};
const WorkSpace = mongoose.model("Workspace", workspaceSchema);

export default WorkSpace;
