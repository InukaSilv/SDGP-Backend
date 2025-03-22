const request = require("supertest");
const { app, server } = require("../src/server"); // Import the Express app and server
const mongoose = require("mongoose"); // Import mongoose
jest.mock("node-cron"); 

describe("Server Tests", () => {
  // Start the server before tests
  beforeAll(async () => {
    await new Promise((resolve) => {
      server.listen(0, resolve); // Use port 0 to dynamically assign an available port
    });
  }, 15000); 

  // Stop the server and close MongoDB connection after tests
  afterAll(async () => {
    await mongoose.connection.close(); // Close MongoDB connection
    await new Promise((resolve) => {
      server.close(resolve); // Close the server
    });
  }, 15000); 

  test("GET /api/health-check should return 200", async () => {
    const response = await request(app).get("/api/health-check");
    expect(response.statusCode).toBe(200);
  });

  test("GET /api/nonexistent-route should return 404", async () => {
    const response = await request(app).get("/api/nonexistent-route");
    expect(response.statusCode).toBe(404);
  });
});