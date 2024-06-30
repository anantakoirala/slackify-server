import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  addMembersToChanel,
  create,
  getChannelUser,
  getChannels,
} from "../controller/channelController";
const router = express.Router();

router.post("/create", authMiddleware, create);
router.post("/add-members", authMiddleware, addMembersToChanel);
router.post("/get-channel-user", authMiddleware, getChannelUser);
router.post("/:organizationId", authMiddleware, getChannels);

export default router;
