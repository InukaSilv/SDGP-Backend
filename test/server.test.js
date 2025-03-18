const request = require("supertest");
const app = require("../src/server"); // Import the Express app
const mongoose = require("mongoose"); // Import mongoose

describe("Server Tests", () => {
  let server;

  // Start the server before tests
  beforeAll((done) => {
    server = app.listen(5001, done); // Use a different port for testing
  });

  // Stop the server and close MongoDB connection after tests
  afterAll(async () => {
    await mongoose.connection.close(); // Close MongoDB connection
    server.close(); // Close the server
  });

  test("GET /api/health-check should return 200", async () => {
    const response = await request(app).get("/api/health-check");
    expect(response.statusCode).toBe(200);
  });

  test("GET /api/nonexistent-route should return 404", async () => {
    const response = await request(app).get("/api/nonexistent-route");
    expect(response.statusCode).toBe(404);
  });
});