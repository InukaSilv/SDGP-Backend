const express = require("express");
const AWS = require("aws-sdk");
require("dotenv").config();

const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

router.get("/get-presigned-url", async (req, res) => {
   
  try {
    const { fileName, fileType } = req.query;
    console.log("Generating pre-signed URL fora:", fileName);
    if (!fileName || !fileType) {
      return res.status(400).json({ error: "Missing fileName or fileType" });
    }

    const fileKey = `uploads/${Date.now()}-${fileName}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME, // Use the bucket name from .env
      Key: fileKey,
      Expires: 60, // URL expires in 60 seconds
      ContentType: fileType,
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);

    res.json({
      uploadUrl,
      fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

module.exports = router;
