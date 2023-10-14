class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // we need also to capture the stack trace which shows where the error happend
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
