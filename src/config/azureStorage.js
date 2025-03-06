const { BlobServiceClient } = require("@azure/storage-blob");

// Azure Storage connection string
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = "listings"; 

// Initialize BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Function to upload an image to Azure Blob Storage
const uploadImage = async (file) => {
  try {
    const blobName = `${Date.now()}_${file.originalname}`; 
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the file
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    // Return the public URL of the uploaded image
    return blockBlobClient.url;
  } catch (err) {
    throw new Error(`Failed to upload image: ${err.message}`);
  }
};

module.exports = { uploadImage };