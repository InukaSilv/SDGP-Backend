const User = require("../models/User");


module.exports.login = async (req, res, next) => {
    try {
        const { username } = req.body; 
        
        // Find user by email
        const user = await User.findOne({ email: username });
        
        if (!user) {
            console.log("User not found");
            return res.json({ msg: "User with this email not found", status: false });
        }
        
        
        // Create a user object without the password field for security
        const userResponse = user.toObject();
        delete userResponse.password;
        
        return res.json({ status: true, user: userResponse });
    } catch (ex) {
        console.error("Login function error:", ex);
        next(ex);
    }
};

module.exports.getAllUsers = async (req, res, next) => {
    try {
        //Get the current user to determine their role
        const currentUser = await User.findById(req.params.id);
        
        if (!currentUser) {
            return res.json({ msg: "User not found", status: false });
        }
        
        let query = { _id: { $ne: req.params.id } };
        
        // If user is a Student, only show Landlords
        if (currentUser.role === "Student") {
            query.role = "Landlord";
        }
        // If user is a Landlord, only show Students
        else if (currentUser.role === "Landlord") {
            query.role = "Student";
        }
        
        const users = await User.find(query).select([
            "email", "username", "_id", "firstName", "lastName", "role"
        ]);
        
        return res.json(users);
    } catch (ex) {
        next(ex);
    }
};