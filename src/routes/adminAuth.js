const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwUtils');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (username !== ADMIN_USERNAME) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid username or password" });
  }
  const token = generateToken({ username});
  res.json({ token });
});

module.exports = router;
