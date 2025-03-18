const request = require("supertest");
const app = require("../src/server"); 

describe("Server Tests", () => {
  let server;

  // Start the server before tests
  beforeAll(() => {
    server = app.listen(5001); // Use a different port for testing
  });

  // Stop the server after tests
  afterAll((done) => {
    server.close(done);
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