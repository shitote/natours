const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal to 40 characters'],
      minlength: [10, 'A tour lenth mus have more than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only conatin characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a  gruop size'],
    },
    difficulty: {
      type: String,
      required: [true, 'Atour must contain a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'it is one of the three strings provided',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'The rating must be above one'],
      max: [5, 'the max value should not be more than five'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // this only points to current doc on new document creation
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be blow the discount price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must contain an image'],
    },
    images: [String],

    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secreTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },

  // the schema options
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: 1 });
tourSchema.index({ slag: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // geospatial should be indexed on a 2d sphere

// virtual properties enables us to achieve the this architecture by offloading the application logic
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtual population
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// this is a document middlewahare and it runs before the save midlewhare
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
// next()
// });

// the post document has access to both the pre saved and the document that is saved to the database.
// Post middlwhare functions are executed when all the pre middlewhare functions are complited
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// Query middlewhare
tourSchema.pre(/^find/, function (next) {
  this.find({ secreTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`it took ${date.now() - this.tart} milliseconds`);
//   console.log(docs);
//   next();
// });

// The aggregation middlewhare
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secreTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
