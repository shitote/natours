const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name'],
  },
  email: {
    type: String,
    required: [true, 'Please enter your email address'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide your passwword'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please enter a confirmation of your password'],
    validate: {
      // this only wors on create and save
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passords provided are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // only run this function is the password is changed
  if (!this.isModified('password')) return next();

  // hushing of the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // delete the passwoedconfirm field
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// create an istance method that will available to all document methods
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// the istance method that checks if the user changed the password
userSchema.methods.changedPasswordAfter = function (jJWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return jJWTTimestamp < changedTimestamp;
  }

  // False means that not changed
  return false;
};

userSchema.methods.createPasswordRestToken = function () {
  // this is a reset token that the user will use to reset the password and it acts like the password.
  const resetToken = crypto.randomBytes(32).toString('hex');

  // encript the reste token and make it even more safe.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  // the token will expire 10 mins after it was created
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// the User in the quats is the representative of the name of the nodel.
const User = mongoose.model('User', userSchema);

module.exports = User;
