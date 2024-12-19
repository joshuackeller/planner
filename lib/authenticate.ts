import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { createClient } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    db: LibSQLDatabase;
  };
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

      const url = `libsql://${tokenData.userId}-${process.env.TURSO_ORGANIZATION_SLUG}.turso.io`;

      try {
        const client = createClient({
          url,
          authToken: process.env.TURSO_TASK_GROUP_AUTH_TOKEN,
        });

        (req as AuthenticatedRequest).user = {
          db: drizzle(client),
        };
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
