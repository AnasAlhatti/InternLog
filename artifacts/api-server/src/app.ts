import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Reject malformed/oversized input without logging journal text or raw parser
// errors, which can contain fragments of the submitted notes.
const errors: ErrorRequestHandler = (error, req, res, _next) => {
  const status = error?.type === "entity.too.large" ? 413 : error?.type === "entity.parse.failed" ? 400 : 500;
  req.log.warn({ status }, "Request rejected");
  res.status(status).json({ error: status === 413 ? "Request is too large." : status === 400 ? "Invalid JSON request." : "The request could not be completed." });
};
app.use(errors);

export default app;
