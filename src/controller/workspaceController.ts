import { NextFunction, Request, Response } from "express";
import WorkSpace from "../models/workspace";
import { sendEmail } from "../utils/sendEmail";
import User from "../models/user";
import { joinTeammatesEmail } from "../html/join-teammates-email";
import { generateRandomString } from "../utils/generateRandomString";
import Invitation from "../models/invitation";
import crypto from "crypto";
import randomize from "randomatic";
import Channel from "../models/chanel";

export const createWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organization_name } = req.body;
    if (!organization_name) {
      return res
        .status(400)
        .json({ success: false, message: "organization name is required" });
    }
    const workspace = new WorkSpace({
      owner: req.userId,
      name: organization_name,
      coWorkers: [req.userId],
    });

    await workspace.save();

    return res.status(200).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWorkSpaces = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("ii", req.userId);
    const myWorkspaces = await WorkSpace.find({ coWorkers: req.userId }).select(
      "name coWorkers _id"
    );
    return res.status(200).json({ success: true, myWorkspaces });
  } catch (error) {
    next(error);
  }
};

export const saveCoWorkers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { data } = req.body;
    console.log("data", data);
    const { organizationId } = req.params;

    const creator = await User.findById(req.userId);
    console.log("creator", creator);
    const workspace = await WorkSpace.findById(organizationId);
    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, message: "workspace not found" });
    }

    if (!creator) {
      return res
        .status(404)
        .json({ success: false, message: "workspace not found" });
    }

    if (creator._id.toString() === workspace.owner?.toString()) {
      const invitationData = data.map((data: string) => ({
        email: data,
        workspace_id: workspace._id,
        token: generateRandomString(),
      }));

      for (let i = 0; i < data.length; i++) {
        const isDuplicate = await checkDuplicateInvitation(
          invitationData[i].email,
          invitationData[i].workspace_id.toString()
        );

        if (!isDuplicate) {
          const invitation = new Invitation(invitationData[i]);
          await invitation.save();

          const invitationLink = `${process.env.CLIENT_URL}/join/invite/${
            invitationData[i].token
          }/${workspace?.name?.split(" ").join("-")}`;
          sendEmail(
            data[i],
            `${creator?.email} has invited you to work with them in Slack`,
            joinTeammatesEmail(
              creator?.username as string,
              creator?.email as string,
              workspace.name as string,
              "",
              invitationLink,
              "url"
            )
          );
        }
      }
    }

    res.status(200).json({ success: true, message: "coworkers addedd" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const checkDuplicateInvitation = async (
  email: string,
  workspace_id: string
) => {
  const result = await Invitation.find({
    email: email,
    workspace_id: workspace_id,
  });
  return result.length > 0;
};

export const checkInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { params } = req.body;
    console.log("params", params);
    const workspace = await WorkSpace.findOne({
      name: params.workspacename.split("-").join(" "),
    });

    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, message: "workspace not found" });
    }
    const invitation = await Invitation.findOne({
      token: params.token,
      workspace_id: workspace._id,
    });

    if (!invitation) {
      return res
        .status(404)
        .json({ success: false, message: "invitation not found" });
    }
    return res.status(200).json({ success: true, message: "success" });
  } catch (error) {}
};

export const workspaceVerify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { loginVerificationCode } = req.body;

    const verificationCodeToCompare = crypto
      .createHash("sha256")
      .update(req.body.loginVerificationCode)
      .digest("hex");
    console.log("verificationCodeToCompare", verificationCodeToCompare);
    const invitation = await Invitation.findOne({
      verificationCode: verificationCodeToCompare,
    });
    console.log("invitation", invitation);

    if (!invitation) {
      return res.status(400).json({
        success: false,
        data: {
          name: "Invalid verification token",
        },
      });
    }

    const myWorkSpace = await WorkSpace.findById(invitation.workspace_id);

    if (!myWorkSpace) {
      return res.status(404).json({
        success: false,
        data: {
          name: "Workspace not found",
        },
      });
    }
    const user = await User.findOne({ email: invitation.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        data: {
          name: "User not found",
        },
      });
    }
    // Check if the user's ID is already in the coWorkers array
    const userId = user._id;
    if (!myWorkSpace.coWorkers.includes(userId)) {
      myWorkSpace.coWorkers.push(userId);
      await myWorkSpace.save();
    } else {
      console.log("User is already a coworker.");
    }

    //Delete the invitation after adding the coworker
    await Invitation.deleteOne({ _id: invitation._id });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const myWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await WorkSpace.findById(workspaceId).populate(
      "coWorkers",
      "_id username"
    );
    console.log("id", workspaceId);
    const channelsOfWorkSpace = await Channel.find({
      organisation: workspaceId,
      collaborators: req.userId,
    }).select("name");

    console.log("chanels", channelsOfWorkSpace);

    const modifiedData = {
      _id: workspace?._id,
      owner: workspace?.owner,
      name: workspace?.name,
      coWorkers: workspace?.coWorkers,
      channels: channelsOfWorkSpace,
    };

    console.log("workspace", workspace);
    return res.status(200).json({ success: true, workspace: modifiedData });
  } catch (error) {
    next(error);
  }
};
