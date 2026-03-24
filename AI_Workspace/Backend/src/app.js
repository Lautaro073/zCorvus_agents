import cors from "cors";
import express from "express";

import { healthRouter } from "./routes/health.js";
import { pingRouter } from "./routes/ping.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.json({
      ok: true,
      service: "zcorvus-backend",
      version: "0.1.0",
    });
  });

  app.use(healthRouter);
  app.use("/api/v1", pingRouter);

  app.use((request, response) => {
    response.status(404).json({
      ok: false,
      error: "NOT_FOUND",
      path: request.path,
    });
  });

  return app;
}
