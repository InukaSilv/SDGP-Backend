const Property = require('../models/Property');
const User = require('../models/User');

const postProperty = async(req, res) => {
    try{
        // Step 1: Get token from the request headers
        const token = req.header('Authorization')?.replace('Bearer ', '');  // Extract token from header

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        // Step 2: Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify token

        // Step 3: Find the user associated with the token
        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        const{title,residents,price,housingType,roomType, singleRoom, doubleRoom, address, coordinates,description,contact,facilities,images} = req.body;

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
        console.log(newProperty);

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