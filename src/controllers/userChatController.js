const User = require("../models/userChatModel");
const bcrypt = require("bcrypt");

// module.exports.register = async (req,res,next) => {
//     try{
//         const {username, email, password} = req.body;
//         const usernameCheck = await User.findOne({ username });
//         if(usernameCheck)
//             return res.json({msg:"Username already in use", status: false});
//         const emailCheck = await User.findOne({ email });
//         if (emailCheck)
//             return res.json({msg:"Email already in use", status: false});
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = await User.create({
//             email, username, password: hashedPassword,
//         });
//         delete user.password;
//         return res.json({ status: true, user});
//     } catch(ex) {
//         next(ex);
//     }
// }; 

module.exports.login = async (req, res, next) => {
    try {
        const { username } = req.body; // Now we only need email (sent as username)
        
        // Find user by email
        const user = await User.findOne({ email: username });
        
        if (!user) {
            console.log("User not found");
            return res.json({ msg: "User with this email not found", status: false });
        }
        
        // No password check needed - success
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
        // First get the current user to determine their role
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