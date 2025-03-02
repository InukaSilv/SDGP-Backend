const express = require('express');
const {postProperty} = require('../controllers/propertyController');
const router = express.Router();

router.post('/post-property',postProperty);
module.export = router ;