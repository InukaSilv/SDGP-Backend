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

const deleteImage = async (imageUrl) => {
  try {
    // Extract blob name and decode it
    const urlParts = imageUrl.split("/");
    const blobName = decodeURIComponent(urlParts[urlParts.length - 1]); 

    console.log(`Attempting to delete blob: "${blobName}"`);

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Delete the blob and snapshots
    const deleteResponse = await blockBlobClient.deleteIfExists({ deleteSnapshots: "include" });

    console.log(`Delete response for "${blobName}": ${deleteResponse}`);
    
    return deleteResponse;
  } catch (err) {
    console.error(`Failed to delete image: ${err.message}`);
    throw new Error(`Failed to delete image: ${err.message}`);
  }
};


module.exports = { uploadImage,deleteImage };