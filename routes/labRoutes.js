const express = require('express');
const router = express.Router();
const { provisionLab } = require('../controllers/labController');

router.post('/provision', provisionLab);

module.exports = router;
