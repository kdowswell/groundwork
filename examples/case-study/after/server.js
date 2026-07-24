"use strict";
const http = require("http");
const logger = require("pino")();

const config = {
  port: Number(process.env.PORT ?? 3000),
  apiKey: process.env.SLOPMART_API_KEY,
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "https://app.slopmart.example.com",
};

if (!config.apiKey) {
  logger.fatal("SLOPMART_API_KEY is required");
  process.exit(1);
}

const orders = require("./orders");

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);

  try {
    if (req.url === "/healthz") {
      res.end(JSON.stringify({ status: "ok" }));
    } else if (req.url === "/orders") {
      res.end(JSON.stringify(await orders.list()));
    } else {
      res.statusCode = 404;
      res.end();
    }
  } catch (err) {
    logger.error({ err, url: req.url }, "request failed");
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "internal" }));
  }
});

server.listen(config.port, () => {
  logger.info({ port: config.port }, "slopmart api listening");
});
