const Listing = require("../models/Listing");
const EligibleUser = require("../models/EligibleUser");
const Review = require("../models/Reviews")
const User = require("../models/User");


const getData = async (req, res, next) => {
    try{
const userCount = await User.countDocuments();
const studentCount = await User.countDocuments({role:"Student"});
const LandlordCount = await User.countDocuments({role:"Landlord"});
res.status(200).json({ 
    totalUsers: userCount,
    studentUsers: studentCount,
    Landlords:LandlordCount,
});

    }catch(error){
        console.error("Error getting counts:", error);
        res.status(500).json({ message: "Error retrieving counts", error: error.message });
    }
}

const getUserData = async (req, res, next) => {
    try{
        const users = await User.find(); 
        console.log(users);
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
};

const deleteUser = async (req, res, next) =>{
    const{id}= req.body;
    if (!id) {
        return res.status(400).json({ message: "User ID is required." });
    }
    const user = await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully." });

}


module.exports = {
getData,
getUserData,
deleteUser,
};