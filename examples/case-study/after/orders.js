"use strict";
const logger = require("pino")();

async function list() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(process.env.ORDERS_SERVICE_URL, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`orders service responded ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    logger.error({ err }, "orders lookup failed");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { list };
