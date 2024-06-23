import { NextFunction, Request, Response } from "express";
import Channel from "../models/chanel";
import WorkSpace from "../models/workspace";

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
  } catch (error) {
    next(error);
  }
};
