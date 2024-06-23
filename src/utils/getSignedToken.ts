import jwt from "jsonwebtoken";
export const authToken = (_id: string) => {
  return jwt.sign({ id: _id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};
