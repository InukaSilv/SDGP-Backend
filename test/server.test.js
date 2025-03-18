const request = require("supertest");
const app = require("../src/server"); 
const mongoose = require("mongoose"); 

describe("Server Tests", () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done); // Use port 0 to dynamically assign an available port
  }, 15000); 

  afterAll(async () => {
    await mongoose.connection.close(); // Close MongoDB connection
    server.close(); // Close the server
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