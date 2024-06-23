import mongoose, { Types, Document } from "mongoose";
import crypto from "crypto";
import randomize from "randomatic";
import jwt from "jsonwebtoken";

export interface UserSchemaType extends Document {
  _id: Types.ObjectId;
  username?: string;
  email?: string;
  role?: string;
  phone?: string;
  profilePicture?: string;
  isOnline?: boolean;
  loginVerificationCode?: string;
  loginVerificationCodeExpires?: Date;
  googleId?: string;
  getVerificationCode?: () => string;
}
const userSchema = new mongoose.Schema<UserSchemaType>(
  {
    username: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },
    googleId: String,
    isOnline: Boolean,
    role: String,
    phone: String,
    profilePicture: String,
    loginVerificationCode: String,
    loginVerificationCodeExpires: Date,
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("email")) {
    this.username = this.email?.split("@")[0];
  }
  next();
});

// userSchema.methods.getSignedJwtToken = function () {
//   return jwt.sign({ id: this._id }, process.env.JWT_SECRET as string, {
//     expiresIn: process.env.JWT_EXPIRE,
//   });
// };

// Generate login verification code
userSchema.methods.getVerificationCode = function () {
  const verificationCode = randomize("Aa0", 6);

  this.loginVerificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");

  this.loginVerificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return verificationCode;
};

const User = mongoose.model("User", userSchema);

export default User;
