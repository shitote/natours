const path = require('path');
const express = require('express');
const { del } = require('express/lib/application');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit'); // limit the amount of requests
// const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utilities/appError');
const globalErrorHundler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRouter');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)GLobal Middlewares
// set security http headers

app.use(express.static(path.join(__dirname, 'public')));

// app.use(helmet());

// development loging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// limit request from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP please try again in an hour',
});

app.use('/api', limiter);

// the body parser: reading the data from the body into req.body
app.use(express.json({ limit: '10kb' })); // a function that can modif the data from the bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSql query injection
app.use(mongoSanitize());

// Data sanitization against cross side scripting attack(xss)
app.use(
  xss({
    whiteList: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'defficulty',
      'price',
    ],
  }),
);

// prevent parameter polution
app.use(hpp());

// test middlewher
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  next();
});

//  ROUTES
app.use('/', viewRouter);
app.use('/api/v2/tours', tourRouter);
app.use('/api/v2/users', userRouter);
app.use('/api/v2/reviews', reviewRouter);
app.use('/api/v2/', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHundler);

module.exports = app;
