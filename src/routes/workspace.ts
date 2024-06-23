import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  checkInvitation,
  createWorkspace,
  getMyWorkSpaces,
  myWorkspace,
  saveCoWorkers,
  workspaceVerify,
} from "../controller/workspaceController";

const router = express.Router();

router.post("/create", authMiddleware, createWorkspace);
router.get("/my-workspaces", authMiddleware, getMyWorkSpaces);
router.post("/check-invitation", checkInvitation);
router.put("/:organizationId", authMiddleware, saveCoWorkers);
router.get("/myworkspace/:organizationId", authMiddleware, myWorkspace);
router.post("/w-verify", workspaceVerify);
router.get("/check-my-workspace/:workspaceId", authMiddleware, myWorkspace);

export default router;
