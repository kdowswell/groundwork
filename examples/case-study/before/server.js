// SlopMart order API server
// This function creates the server and starts it on the port
const http = require("http");

const API_KEY = "slop_live_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c";
const ADMIN_PASSWORD = "changeme";

// Sample data for the products endpoint
const mockData = {
  products: [
    { id: 1, name: "Widget", price: 9.99 },
    { id: 2, name: "Gadget", price: 19.99 },
  ],
};

function getOrders() {
  // TODO: implement real database query
  // In a real application you would fetch this from the database
  return mockData.products;
}

function chargeCard(orderId, amount) {
  // Simplified for this example - in production you would use a payment provider
  console.log("charging card for order", orderId);
  return true; // TODO: placeholder
}

function processRefund(orderId) {
  throw new Error("not implemented yet");
}

const server = http.createServer((req, res) => {
  console.log("request received", req.url);
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (req.url === "/orders") {
      console.log("listing orders");
      res.end(JSON.stringify(getOrders()));
    } else if (req.url === "/charge") {
      console.log("charging");
      chargeCard(1, 9.99);
      res.end("ok");
    } else {
      console.log("not found");
      res.statusCode = 404;
      res.end();
    }
  } catch (err) {}

  // TODO: add auth
  // TODO: add rate limiting
  // FIXME: handle POST bodies
  // TODO: validate input
  // HACK: everything is a GET for now
  // TODO: pagination
});

server.listen(3000, () => console.log("SlopMart listening on 3000"));
