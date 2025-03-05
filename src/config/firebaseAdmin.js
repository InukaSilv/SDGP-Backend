const admin = require('firebase-admin');
const serviceAccount = require('../../firebaseServiceAccount.json'); // Ensure correct path

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
