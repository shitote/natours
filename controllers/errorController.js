const { render } = require('pug');
const AppError = require('../utilities/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  console.log(value);

  const message = `Duplicate field value: ${value}.Please use another value`;
  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const error = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data ${errors.jion('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token, please try again', 404);

const handleJWTExpiredError = () =>
  new AppError('The token you are using has expired please log in again', 401);

const sendErrorDev = (err, req, res) => {
  // api
  if (req.originalUrl.startsWith('/api')) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  console.error('Error ✳✴', err);

  // the rendered site
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // for the Api
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      err.statusCode = err.statusCode || 500;
      err.status = err.status || 'error';
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // program or other unknown errors: don't leak the details to the client
    // log the error
    console.error('Error ✳✴', err);

    // send generic err
    return res.status(500).json({
      status: 'error',
      message: 'Something wend wrong',
    });
  }
  // b). for the rendered website

  if (err.isOperational) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    return res.status(err.statusCode).render('error', {
      status: err.status,
      message: err.message,
    });
  }
  // program or other unknown errors: don't leak the details to the client
  // log the error
  console.error('Error ✳✴', err);

  // send generic err
  return res.status(500).json({
    status: 'error',
    message: 'Something wend wrong',
  });
};

module.exports = (err, req, res, next) => {
  console.log(err.stack);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);

    sendErrorProd(error, req, res);
  }
};
