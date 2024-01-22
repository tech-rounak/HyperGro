const mongoose = require('mongoose');

const FavouriteSchema = new mongoose.Schema({ 
    SC_CODE:{
        type:String,
        required:true,
    },
    isFav :{
        type:Boolean,
        default:false,
    }
})
module.exports = mongoose.model('Favourite', FavouriteSchema);
