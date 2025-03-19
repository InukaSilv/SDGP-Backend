const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwUtils');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const {getData,getUserData,deleteUser,getAdsData,getVerifies,verify,reject } = require("../controllers/admincontroller");
const {deleteListing} = require("../controllers/listingcontroller");

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

router.get("/get-Data", async(req,res)=>{
  getData(req,res);
})

router.get("/get-User-Data",async(req,res)=>{
  getUserData(req,res);
})

router.delete("/delete-user",async(req,res)=>{
  deleteUser(req,res);
})

router.get("/get-Ads-Data",async(req,res)=>{
  getAdsData(req,res);
})

router.delete("/delete-ad",async(req,res,next) =>{
  deleteListing(req,res,next);
})

router.get("/getVerify", async(req,res,next) =>{
  getVerifies(req,res,next);
})

router.put("/verify",async(req,res,next)=>{
  verify(req,res,next);
})

router.put("/reject",async(req,res,next)=>{
  reject(req,res,next);
})

module.exports = router;
