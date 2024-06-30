import { NextFunction, Request, Response } from "express";
import Channel from "../models/chanel";
import WorkSpace from "../models/workspace";
import { ObjectId } from "mongoose";
import Chat from "../models/chat";

interface User {
  _id: ObjectId;
  username: string;
  email: string;
}

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, organisationId } = req.body;
    console.log("organizationId", organisationId);
    if (!name || !organisationId) {
      return res
        .status(400)
        .json({ success: false, message: "Name field is required" });
    }

    const workspace = await WorkSpace.findOne({
      _id: organisationId,
    });
    if (!workspace) {
      return res
        .status(404)
        .json({ success: true, message: "organization not found" });
    }

    const channel = await Channel.create({
      name,
      collaborators: [req.userId],
      organisation: organisationId,
    });

    return res
      .status(200)
      .json({ success: true, message: "channel created successfuly" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getChannels = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const channels = await Channel.find({ organization: organizationId });
    return res.status(200).json({ success: true, channels });
  } catch (error) {}
};

export const addMembersToChanel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //console.log("req", req.body);
    const { channelId, organizationId, tags } = req.body;
    console.log(tags);
    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organisation ID is required" });
    }
    const organization = await WorkSpace.findById(organizationId);
    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const channel = await Channel.findOne({
      _id: channelId,
      organisation: organizationId,
    });

    console.log("channel", channel);

    if (!channel) {
      return res
        .status(404)
        .json({ success: false, message: "Channel not found" });
    }

    // Extract the existing collaborator IDs as strings
    const existingCollaborators = channel.collaborators.map((id: ObjectId) =>
      id.toString()
    );

    // Filter out tags that are already collaborators
    const newCollaborators = tags
      .map((tag: { value: string }) => tag.value)
      .filter((id: string) => !existingCollaborators.includes(id));

    console.log(newCollaborators);

    // Add new collaborators to the channel
    channel.collaborators.push(...newCollaborators);

    // Save the updated channel
    await channel.save();

    const chat = await Chat.findOne({
      channel: channel._id,
      organisation: organizationId,
    });

    if (chat) {
      chat.collaborators = channel.collaborators;
      await chat.save();
    }

    return res
      .status(200)
      .json({ success: true, message: "succeffully added" });
  } catch (error) {
    next(error);
  }
};

export const getChannelUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { channelId, organisationId } = req.body;

    if (!organisationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organisation ID is required" });
    }

    const organization = await WorkSpace.findById(organisationId).populate<{
      coWorkers: User[];
    }>("coWorkers", "username email");

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const channel = await Channel.findOne({
      _id: channelId,
      organisation: organisationId,
    }).populate<{ collaborators: User[] }>("collaborators", "username email");

    if (!channel) {
      return res
        .status(404)
        .json({ success: false, message: "Channel not found" });
    }

    const organizationUser = organization.coWorkers;

    const channelUser = channel.collaborators;

    const usersNotInChannel = organizationUser.filter(
      (orgUser) =>
        !channelUser.some(
          (chanUser) => chanUser._id.toString() === orgUser._id.toString()
        )
    );

    return res.status(200).json({
      success: true,
      usersNotInChannel,
    });
  } catch (error) {
    next(error);
  }
};
