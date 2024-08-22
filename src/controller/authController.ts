import { NextFunction, Request, Response } from "express";
import User, { UserSchemaType } from "../models/user";
import crypto from "crypto";
import randomize from "randomatic";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { sendEmail } from "../utils/sendEmail";
import { verificationHtml } from "../html/confirmation-code.email";
import { authToken } from "../utils/getSignedToken";
import Invitation from "../models/invitation";
import { generateVerificationCode } from "../utils/getVerificationCode";
import { workspaceConfirmationEmail } from "../html/workspace-confirmation-email";
dotenv.config();

//Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `/api/v1/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken: string, refreshToken: string, profile: any, done) => {
      //console.log("profile", profile);
      try {
        // Find or create a user based on the Google profile information
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          console.log("profile", profile.emails[0].value);
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, lT } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, data: { email: "email is required" } });
    }

    const user = await User.findOne({ email });
    console.log("user", user);
    if (user) {
      console.log("chito");
      try {
        let verificationCode = "";
        if (user?.getVerificationCode) {
          verificationCode = user.getVerificationCode();
          sendEmail(
            email,
            "Slack confirmation code",
            verificationHtml(verificationCode)
          );
          console.log("verification", verificationCode);
          user.save();
        }

        return res
          .status(200)

          .json({ message: "login successfully", verificationCode });
      } catch (error) {
        user.loginVerificationCode = undefined;
        user.loginVerificationCodeExpires = undefined;
        await user.save({ validateBeforeSave: false });
        next(error);
      }
    } else {
      return res
        .status(404)

        .json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const checkInviation = async (token: string, email: string) => {
  const invitation = await Invitation.findOne({ token, email });
  return invitation;
};

export const workspaceLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, LT, N } = req.body;
    console.log("LT", LT);
    if (!email) {
      return res.status(400).json({
        success: false,
        data: {
          name: "Please provide your email address",
        },
      });
    }
    const invitation = await checkInviation(LT, email);
    if (invitation?.verificationCode) {
      return res.status(400).json({
        success: false,
        message: "this link is expired",
      });
    }
    //console.log("invitation", invitation);
    //console.log("invitation", invitation);
    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "invitation has not been sent to this email",
      });
    }
    const emailExist = await User.findOne({ email });
    if (!emailExist) {
      const user = await User.create({
        email,
      });
    }
    try {
      const verificationCode = generateVerificationCode();
      invitation.verificationCode = verificationCode.hash;
      invitation.verificationCodeExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );
      invitation.save();
      const verificationLink = `${process.env.CLIENT_URL}/workspace/verify/${verificationCode.random_string}`;
      sendEmail(
        email,
        "confirmation link",
        workspaceConfirmationEmail(verificationLink)
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    console.log("email", email);
    if (!email) {
      return res.status(400).json({
        success: false,
        data: {
          name: "Please provide your email address",
        },
      });
    }
    const emailExist = await User.findOne({ email });
    if (emailExist) {
      return res.status(400).json({
        success: false,
        data: {
          name: "User already exists",
        },
      });
    }

    const user = await User.create({
      email,
    });

    try {
      let verificationCode = "";
      if (user?.getVerificationCode) {
        verificationCode = user.getVerificationCode();
        sendEmail(
          email,
          "Slack confirmation code",
          verificationHtml(verificationCode)
        );
        console.log("verification", verificationCode);
        user.save();
      }
      return res
        .status(200)
        .json({ message: "register succesfully", verificationCode });
    } catch (error) {
      user.loginVerificationCode = undefined;
      user.loginVerificationCodeExpires = undefined;
      await user.save({ validateBeforeSave: false });
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

export const verify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { loginVerificationCode } = req.body;
    console.log("loginVerificationCode", loginVerificationCode);
    if (!loginVerificationCode) {
      return res.status(400).json({
        success: false,
        data: {
          name: "Please provide verification token",
        },
      });
    }
    // Get hashed token
    const loginVerificationCodeToCompare = crypto
      .createHash("sha256")
      .update(req.body.loginVerificationCode)
      .digest("hex");

    console.log("aa", loginVerificationCodeToCompare);

    const user = await User.findOne({
      loginVerificationCode: loginVerificationCodeToCompare,
      loginVerificationCodeExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        data: {
          name: "Invalid verification token",
        },
      });
    }
    if (user) {
      const token = authToken(user._id.toString());
      res
        .status(200)
        .cookie("token", token, {
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .json({
          success: true,
          data: {
            username: user.username,
            email: user.email,
          },
        });

      user.loginVerificationCode = undefined;
      user.loginVerificationCodeExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth Callback
// @route   GET /auth/google/callback
// @access  Public
export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    "google",
    async (
      err: any,
      user: { googleId: string; username: string; email: string }
    ) => {
      if (err) {
        // Handle error
        return next(err);
      }

      if (!user) {
        console.log("user", user);
        // Handle user not found
        return res.status(401).json({ message: "Authentication failed" });
      }
      const userData = await User.findOne({ googleId: user.googleId }); //const token = user.getSignedJwtToken();
      if (userData) {
        const token = authToken(userData._id.toString());
        res.cookie("token", token, {
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          httpOnly: true,
          secure: true,
          sameSite: "none",
        });
        return res.redirect(`${process.env.CLIENT_URL}`);
      } else {
        res
          .json({ message: "something went wrong" })
          .redirect(`${process.env.CLIENT_URL}`);
      }

      res.redirect(`${process.env.CLIENT_URL}`);
    }
  )(req, res, next);
};

export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  return res.status(200).json({ message: "succces", user });
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("Before clearing:", req.cookies.token);
    res.clearCookie("token", {
      path: "/",
      domain: process.env.COOKIE_DOMAIN, // or the appropriate domain for your frontend
      secure: true,
      sameSite: "none",
    });
    console.log("After clearing:", req.cookies.token);
    return res
      .status(200)
      .json({ success: "true", message: "logout succcessfully" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
