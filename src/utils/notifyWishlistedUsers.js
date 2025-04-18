const { transporter, renderTemplate } = require("../config/email");
const User = require("../models/User");
const Listing = require("../models/Listing");

const notifyWishlistedUsers = async (listingId) => {
  try {
    const listing = await Listing.findById(listingId).populate("landlord");
    if (!listing) {
      throw new Error("Listing not found");
    }

    // Find users who have wishlisted this listing and are premium
    const users = await User.find({ wishlist: listingId, isPremium: true });

    // Send email to each user
    for (const user of users) {
      const emailHtml = await renderTemplate("wishlist-notification", {
        name: user.firstName,
        listing: {
          title: listing.title,
          description: listing.description,
          address: listing.address,
        },
        listingUrl: `https://website.com/listings/${listing._id}`,
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "New Opening in Your Wishlisted Listing!",
        html: emailHtml,
      };

      await transporter.sendMail(mailOptions);
    }
  } catch (err) {
    console.error("Error notifying wishlisted users:", err);
  }
};

module.exports = notifyWishlistedUsers;