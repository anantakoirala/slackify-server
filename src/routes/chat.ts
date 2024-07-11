import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getMessages, newChat } from "../controller/chatController";

const router = express.Router();

router.post("/new", authMiddleware, newChat);
router.get("/message/:id", authMiddleware, getMessages);

export default router;
