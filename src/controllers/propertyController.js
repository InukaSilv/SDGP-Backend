const Property = require('../models/Property');
const User = require('../models/User');

const postProperty = async(req, res) => {
    try{
        const{title,residents,price,housignType,roomType, singleRoom, doubleRoom, address, coordinates,description,contact,facilities,images} = req.body;

        const newProperty = new Property({
            title,
            residents,
            price,
            housingType,
            roomType,
            singleRoom,
            doubleRoom,
            address,
            coordinates,
            description,
            contact,
            facilities,
            images,
            landlord:req.user._id,
        })

        await newProperty.save();
        await User.findByIdAndUpdate(
            req.user._id,
            {$push:{properties:newProperty._id}},
            {new:true}
        );
        res.status(201).json({ message: 'Property uploaded successfully', property: newProperty });
    }catch (error) {
        res.status(500).json({ message: 'Error uploading property', error: error.message });
      }

};
module.export = {postProperty}