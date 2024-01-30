const Share = require('../models/share')
const catchAsync = require('../utils/catchAsync.js')
const AppError = require('../utils/appError.js');
const dayjs = require('dayjs');
const Favourite = require('../models/favourite.js');
const { fetchBSEData } = require('../utils/script.js');

const GetShareByName = catchAsync(async(req,res,next)=>{
    const { name } = req.query
    const share = await Share.findOne({SC_NAME:name}).sort({ date: -1 });;
    if(!share){
        return next(new AppError('Share not found',400));
    }
    res.status(200).json({success: true, msg: 'Share fetched succesfully',result:share})
})
const GetShareHistory = catchAsync(async(req,res,next)=>{
    let {name,last} = req.query
    if(!isNaN(Number(last))){
        last = parseInt(last,10);
    }else{
        return next(new AppError('last field should be number'))
    }
    const targetDate = dayjs().subtract(last, 'day').format('YYYY-MM-DD');
    const share = await Share.find({
        $and: [
        { date: { $gte : targetDate } },
        { SC_NAME : name}
        ]}).sort({ date: -1 });;
    if(!share){
        return next(new AppError('Share not found',400));
    }
    res.status(200).json({success: true, msg: 'Share fetched succesfully',result:share})
})

const GetTopStocks = catchAsync(async(req,res,next)=>{
    let {count} = req.query
    if(!count)count = 10;

    if(!isNaN(Number(count))){
        count = parseInt(count,10);
    }
    if(isNaN(Number(count)) || count>50){
        return next(new AppError('count should be number less than 50'))
    }
    const pipeline = [
        {
            $group: {
                _id:null,
                minDate: { $min: "$date" },
                maxDate: { $max: "$date" }
            }
        },
        {
            $project: {
                minDate: 1,
                maxDate: 1
            }
        }
    ];
    
    const dateRange = await Share.aggregate(pipeline);
    let { minDate, maxDate } = dateRange[0];

    const stocksPipeline = [
        {
            $match: {
                $or: [
                    { date: { $eq: minDate} },  // Documents with the minimum date
                    { date: { $eq: maxDate} }   // Documents with the maximum date
                ]
            }
        },
        { $sort: { date: -1 } },
        {
            $group: {
                _id: "$SC_CODE",
                closeValues: { $push: "$CLOSE" },
                SC_NAME: { $first: "$SC_NAME" },
            }
        },
        { 
            $addFields: {
                "difference": {
                    $subtract: [
                        { $arrayElemAt: ["$closeValues", 0] }, // Last closing price
                        { $arrayElemAt: ["$closeValues", -1] }  // First closing price
                    ]
                }
            }
        },
        {
            $addFields: {
                "percentage": {
                    $multiply: [
                        {
                            $divide: [
                                "$difference",
                                { $arrayElemAt: ["$closeValues", -1] } 
                            ]
                        },
                        100
                    ]
                }
            }
        },
        { $sort : {percentage:-1} },
        { $limit : count },
        {
            $project:{
                "difference":0,
                "closeValues":0,
            }
        }
       
        
    ];
    const top = await Share.aggregate(stocksPipeline).allowDiskUse(true);
    res.status(201).json({success: true, msg: `Top ${count} Stocks fetched succesfully`,result:top})
})
const GetLatest = catchAsync(async(req,res,next)=> { 
    const pipeline = [
        {
            $group: {
                _id:null,
                maxDate: { $max: "$date" }
            }
        },
        {
            $project: {
                maxDate: 1
            }
        }
    ];
    
    const dateRange = await Share.aggregate(pipeline);
    const {maxDate } = dateRange[0];
    console.log(maxDate);
    const LatestPipeline = [
        {
            $match:{
                date:maxDate
            }
        },
        { 
            $addFields: {
                "difference": {
                    $subtract: ["$CLOSE","$OPEN"]
                }
            }
        },
        { $sort : {difference:-1} },
    ]
    const latestData = await Share.aggregate(LatestPipeline);
    console.log(latestData);
    const len = latestData.length;
    const resData = [{
        type:"best",
        stock:latestData[0],
    },
    {
        type:"worst",
        stock:latestData[len-1],    
    }
]
    res.status(201).json({success: true, msg: 'Latest Data fetched',result:resData})
})
// -------------------------------------- FAVOURITE --------------------------------------------------------------
const AddFavourite = catchAsync(async(req,res,next)=>{
    const {SC_CODE} = req.body;

    const present = await Share.findOne({SC_CODE:SC_CODE});
    if(!present){
       return next(new AppError('Please enter the correct code, Share not found',400));
    }
    const checkFav = await Favourite.findOne({SC_CODE:SC_CODE,isFav:true});
    if(checkFav){
        return next(new AppError('Share already added to favourites',400))
    }
    const fav = new Favourite({
        SC_CODE,
        isFav:true,
    })
    await fav.save();
    res.status(201).json({success: true, msg: 'Share added to favourite succesfully',result:fav})
})

const DeleteFavourite = catchAsync(async(req,res,next)=>{
    const {sc_code} = req.params;
    const present = await Share.findOne({SC_CODE:sc_code});
    if(!present){
       return next(new AppError('Please enter the correct code, Share not found',400));
    }
    const checkFav = await Favourite.findOne({SC_CODE : sc_code});
    if(!checkFav){
        return next(new AppError('Share Not Present in Favourites List !!',400));
    }
    if(checkFav.isFav){
       
        await Favourite.findOneAndUpdate({SC_CODE : sc_code,isFav:true},{isFav:false})
        res.status(201).json({success: true, msg: 'Share deleted succesfully'})
    }
    else{
        return next(new AppError('Share Not Present in Favourites List !!',400));
    }
})

const GetFavourite = catchAsync(async(req,res,next)=>{
    const pipeline = [
        {
          $match:{isFav:true}
        },
        {
            $lookup:{
                from:"shares",
                localField:"SC_CODE",
                foreignField:"SC_CODE",
                as:"favShares"
            }
        },
        {$unwind: "$favShares"},
        {$sort: { "favShares.date": -1 } },
        {
            $group: {
                _id: "$SC_CODE",
                latestShare: { $first: "$favShares" }
            },
        }, 
        {$replaceRoot: { newRoot: "$latestShare" } }
    ]
    const favList = await Favourite.aggregate(pipeline)
    res.status(201).json({success: true, msg: 'Favourite shares favourite succesfully',result:favList})
})

const Refresh = catchAsync(async(req,res,next)=>{
        await fetchBSEData();
        res.status(201).json({success: true, msg: 'Refresh Succesfull'})

})
module.exports = {GetShareHistory, GetLatest, GetShareByName, AddFavourite, GetFavourite, GetTopStocks, DeleteFavourite,Refresh}