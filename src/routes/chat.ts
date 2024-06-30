import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { newChat } from "../controller/chatController";

const router = express.Router();

router.post("/new", authMiddleware, newChat);

export default router;
