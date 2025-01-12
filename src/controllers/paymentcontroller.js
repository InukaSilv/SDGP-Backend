const Payment = require('../models/Payment');

// @desc    Process a payment
// @route   POST /api/payments
// @access  Private
const processPayment = async (req, res, next) => {
    const { amount, method, userId } = req.body;

    if (!amount || !method || !userId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const payment = await Payment.create({
            user: userId,
            amount,
            method,
            status: 'Pending', // Default status
        });

        // Simulate a payment process (e.g., calling a payment gateway)
        payment.status = 'Completed';
        await payment.save();

        res.status(201).json(payment);
    } catch (err) {
        next(err);
    }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Admin
const getPayments = async (req, res, next) => {
    try {
        const payments = await Payment.find().populate('user', 'name email');
        res.json(payments);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    processPayment,
    getPayments,
};
