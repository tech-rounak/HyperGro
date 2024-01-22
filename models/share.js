const mongoose = require('mongoose');

const ShareSchema = new mongoose.Schema({ 
    SHARE_ID:{
        type:String,
        required:true,
        unique:true,
    },
    SC_CODE:{
        type:String,
        required:true,
    },
    SC_NAME:{
        type:String,
        required:true,
    },
    SC_GROUP:{
        type:String,
    },
    SC_TYPE:{
        type:String,
    },
    OPEN:{
        type:Number
    },
    HIGH:{
        type:Number
    },
    LOW:{
        type:Number
    },
    CLOSE:{
        type:Number
    },
    PREVCLOSE:{
        type:Number
    },
    NO_TRADES:{
        type:Number
    },
    NO_OF_SHRS:{
        type:Number
    },
    NET_TURNOV:{
        type:Number
    },
    date:{
        type:Date
    },
})
module.exports = mongoose.model('Share', ShareSchema);
