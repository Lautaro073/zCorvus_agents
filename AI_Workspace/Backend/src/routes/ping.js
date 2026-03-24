import { Router } from "express";

export const pingRouter = Router();

pingRouter.get("/ping", (_request, response) => {
  response.json({
    ok: true,
    message: "pong",
  });
});
