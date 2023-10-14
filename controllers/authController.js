const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utilities/catchAsync');
const User = require('../models/userModel');
const AppError = require('./../utilities/appError');
const Email = require('./../utilities/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) First we need to check if the email and the password exist.
  if (!email || !password) {
    return next(new AppError('Please provide the email and password', 400));
  }

  // 2) We need check if the user exist and the password is correct.
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      new AppError(
        'Please chekc if both the email and the password are correct',
        401,
      ),
    );
  }

  // console.log(user);

  // 3) If all this is correct we sent the token to the user.
  createSendToken(user, 200, res);
});

// logout function.
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) get the token and check if it is there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not loged in please log in to get access!', 401),
    );
  }

  // 2) Verification: We need to validate the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if the user still exists.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('THe User that blong to the token nolonger exist', 401),
    );
  }

  // 4) Check is user changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'The password was changed recently please log in again',
        401,
      ),
    );
  }

  // Grant access to the protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages and there will be no errors.
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 2) Verification: We need to validate the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 3) Check if the user still exists.
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // Check if the user change there password.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a loged in user.
      // res.locals will enable our pug templets to have access to the user
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    return next();
  }
  next();
};

// restriced to what resouces should be accessed by who
// (...roles) parameter is an example of how we can pass paramenters in to a middlewhare function.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['admin' , lead-guide]
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have the permission to perform this act!!',
          403,
        ),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new AppError('There is no user with the provided email address', 404),
    );
  }

  // 2) generatre the random token
  const resetToken = user.createPasswordRestToken();
  await user.save({ validateBeforeSave: false });

  // 3) send it to user's email
  const resetURl = `${req.protocol}://${req.get(
    'host',
  )}/api/v2/users/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURl).sendPasswordReset();

    res.status(200).json({
      status: 'Success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'there was an error sending the email. Try again latter!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get the user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If the token is not expired and there is a user then set the new password
  if (!user) {
    return next(new AppError('The token is invalid or is expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save(); // we do not need to turn off the validators since we need to validate the password

  // Updated changeAt propaty for the user

  // Log the user in, send the json web token.
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) we need to get the user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if the posted password is correct.
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3) If so, then update the password.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) log the user in, send json web token
  createSendToken(user, 200, res);
});
