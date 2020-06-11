const mongoose = require("mongoose");
const Tour = require('./tourModel');


const reviewSchema = new mongoose.Schema(
	{
		review: {
			type: String,
			required: [true, "Review can not be empty!"],
		},
		rating: {
			type: Number,
			min: 1,
			max: 5,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		tour: {
			type: mongoose.Schema.ObjectId,
			ref: "Tour",
			required: [true, "Review must belong to a tour."],
		},
		user: {
			type: mongoose.Schema.ObjectId,
			ref: "User",
			required: [true, "Review must belong to a user"],
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// user can only submit 1 review per tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
	// HERE WE DO NOT WANT TO POPULATE THE TOUR DATA IN THE REVIEW
	// this.populate({
	// 	path: "tour",
	// 	select: "name",
	// }).populate({
	// 	path: "user",
	// 	select: "name photo",
    // });

    this.populate({
		path: "user",
		select: "name photo",
    });
    
    next();
});

// create average to be stored into the database and aggregate
reviewSchema.statics.calcAverageRatings = async function(tourId) {
	const stats = await this.aggregate([
		{
			$match: { tour : tourId }
		},
		{
			$group: {
				_id: '$tour',
				nRating: { $sum: 1},
				avgRating : { $avg: '$rating' }
			}
		}
	]);

	// console.log(stats);
	if (stats.length > 0) {
		await Tour.findByIdAndUpdate(tourId, {
			ratingsQuantity: stats[0].nRating,
			ratingsAverage: stats[0].avgRating
		});
	} else {
		await Tour.findByIdAndUpdate(tourId, {
			ratingsQuantity: 0,
			ratingsAverage: 4.5
		});
	}
};

reviewSchema.post('save', function() {
	// this points to current review model
	this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findbyIdAndDelete

reviewSchema.pre(/^findOneAnd/, async function(next) {
	this.r = await this.findOne();
	//console.log(this.r);
	next();
});

reviewSchema.post(/^findOneAnd/, async function() {
	// passing data from middleware from PRE to POST for the avg ratings
	// await does not work here as query has already been executed
	await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;

// POST /tour/akjshdf/reviews 
// ^ nested route 