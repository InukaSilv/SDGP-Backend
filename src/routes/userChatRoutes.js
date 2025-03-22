const { login, getAllUsers } = require("../controllers/userChatController");

const router = require("express").Router();

//router.post("/register",register);
router.post("/login",login);
router.get("/allusers/:id", getAllUsers);

module.exports = router;
