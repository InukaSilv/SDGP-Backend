const mongoose = require('mongoose');
const { type } = require('os');
const propertySchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    residents:{
        type: Number,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    housingType:{
        type:String,
        required:true
    },
    roomType:[{
        type:String, 
        required:true}],
    SingleRoom:{
        type:Number,
        default:0
    },
    doubleRoom:{
        type:Number,
        default:0
    },
    address:{
        type:String,
        required:true
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    description:{
        type:String,
        required:true
    },
    Contact:{
        type:String,
        required:true
    },
    facilities:[{
        type:String
    }],
    images:[{
        type:String
    }],
    landlord:{type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    CreatedAt:{
        type:Date,
        default:Date.now
    },
});
module.export = mongoose.model('Property', propertySchema);