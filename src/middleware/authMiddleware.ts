import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const cookie = req.cookies.token;
  // console.log("cookie", cookie);
  if (!cookie) {
    return res.status(401).json({ message: "unauthorized" });
  }

  const userId = jwt.verify(cookie, process.env.JWT_SECRET as string);
  
  if (!userId) {
    return res.status(401).json({ message: "unauthorized" });
  }
  req.userId = (userId as JwtPayload).id;
  next();
};
