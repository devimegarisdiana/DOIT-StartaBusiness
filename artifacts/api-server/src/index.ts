import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import apiRouter from "./routes/index.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const BASE_PATH = process.env.BASE_PATH ?? "";

app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(`${BASE_PATH}/api`, apiRouter);

app.get(`${BASE_PATH}/api/healthz`, (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "Server listening");
});
