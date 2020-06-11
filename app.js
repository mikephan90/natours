const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorControllers');

// import routers
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

/*************************************
 * // 1) GLOBAL MIDDLEWARES 
 * ***********************************/

// Set security HTTPS headers
app.use(helmet());


// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
};


//Rate limits on login attempts
const limiter = rateLimit({
	max: 100,
	windowMs: 60 * 60 * 1000,
	message: 'Too many requests from this IP. Please try again in an hour.'
});
app.use('/api', limiter);


// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb'}));
app.use(cookieParser());

// Data sanitization against NoSQL query injection attacks
app.use(mongoSanitize()); // remove $ and symbols that mongodb uses to exclude it from query

// Data sanitzation against XSS attacks
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
	whitelist: [
		'duration',
		'ratingsQuantity',
		'ratingsAverage',
		'maxGroupSize',
		'difficulty',
		'price'
	]
}));


// Test middleware
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	// console.log(req.cookies)
	next();
});


// ROUTES
app.use('/', viewRouter); 
app.use('/api/v1/tours', tourRouter); 
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);


// IF WE CAN't LOCATE ROUTE! put AFTER all other routes
app.all('*', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;