import mongoose, { Types } from "mongoose";

export type InvitationSchemaType = {
  email: string;
  workspace_id: Types.ObjectId;
  token: string;
  verificationCode?: string;
  verificationCodeExpires?: Date;
};

const invitationSchema = new mongoose.Schema(
  {
    email: String,
    workspace_id: { type: Types.ObjectId, ref: "Workspace" },
    token: String,
    verificationCode: String,
    verificationCodeExpires: Date,
  },
  { timestamps: true }
);

const Invitation = mongoose.model("Invitation", invitationSchema);

export default Invitation;
