import express, { Response, Request } from "express";
import {
  googleCallback,
  login,
  logout,
  me,
  register,
  verify,
  workspaceLogin,
} from "../controller/authController";
import passport from "passport";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();
router.get("/test", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "hello test" });
});
router.post("/login", login);
router.post("/w-login", workspaceLogin);
router.post("/verify", verify);
router.post("/register", register);
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);
//router.get('/google', passport.authenticate('google', ['profile', 'email']))

router.get("/google/callback", googleCallback);
router.get("/me", authMiddleware, me);
router.get("/logout", authMiddleware, logout);

export default router;
