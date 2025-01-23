import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends NextApiRequest {
  userId: string;
}

export const withAuthentication =
  (handler: Function) => async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization;
      if (!token) return res.status(401).json({ error: "Invalid auth token" });

      const tokenData = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
      };

      if (!tokenData.userId)
        return res.status(401).json({ error: "Invalid auth token" });

      try {
        (req as AuthenticatedRequest).userId = tokenData.userId;
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Could not create database client" });
      }

      await handler(req, res);
    } catch (error) {
      console.error("API ERROR", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Invalid auth token",
      });
    }
  };
