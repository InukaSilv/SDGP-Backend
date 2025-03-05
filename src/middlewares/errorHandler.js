const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode; // Default to 500 if status code not set
    const message = err.message || 'An unexpected error occurred';

    // Customize for specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
    } else if (err.name === 'CastError') {
        statusCode = 400;
        err.message = `Resource not found with ID: ${err.value}`;
    } else if (err.code === 11000) {
        statusCode = 400;
        err.message = 'Duplicate field value entered';
    }

    // Log error (use logger if implemented)
    console.error(`[ERROR] ${message}`, err.stack);

    res.status(statusCode).json({
        message,
        // Optionally include stack trace in development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;
