const { addMessage, getAllMessage } = require("../controllers/messagesChatController");

const router = require("express").Router();

router.post("/addmsg", addMessage);
router.post("/getmsg", getAllMessage);

module.exports = router;