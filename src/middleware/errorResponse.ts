import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  name: string;
  errors?: Record<string, { message: string }>;
  path?: string;
  value?: string;
}

function errorResponse(
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("error", error);

  return res.status(500).json({ name: "Internal Server Error" });
}

export default errorResponse;
