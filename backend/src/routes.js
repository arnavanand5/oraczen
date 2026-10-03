const express = require('express');
const controller = require('./controllers/quoteController');

const router = express.Router();

router.get('/catalog', controller.catalog);
router.post('/quotes/calculate', controller.calculate);
router.post('/quotes', controller.create);
router.get('/quotes', controller.list);
router.get('/quotes/:id', controller.getById);
router.patch('/quotes/:id/status', controller.updateStatus);

module.exports = router;
