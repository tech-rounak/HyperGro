const express = require('express')
const {  
        GetShareByName,
        GetShareHistory,
        AddFavourite,
        GetFavourite,
        DeleteFavourite,
        GetTopStocks,
        Refresh,
        GetLatest
     } = require('../controller/shareController');
const router = express.Router();

router.get('/topStock',GetTopStocks)
router.get('/search',GetShareByName)
router.get('/history',GetShareHistory)
router.get('/latestBestStock',GetLatest);

router.post('/favourite/create',AddFavourite)
router.get('/favourite',GetFavourite)
router.delete('/favourite/:sc_code',DeleteFavourite)

router.get('/refresh',Refresh)
module.exports = router