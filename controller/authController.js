const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    // thời gian sống của token
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOLIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  // Remove password from output
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
  //jwt.sign(payload, secretOrPrivateKey, [options, callback])
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //2) check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Incorrect email ', 401));
  }
  const correct = await user.correctPassword(password, user.password); // trả về true or false

  console.log(correct);
  if (!user || !correct) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //if everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

// kiểm tra xem người dùng đã đăng nhập hay chưa để có thể xem được nội dung
exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting token and check of it's there
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
      new AppError('You are not logged in! please login to get access', 401)
    );
  }
  //2) verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3)check if user still exists

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging  to this token does no longer exist',
        401
      )
    );
  }
  // 4)  check  if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again', 401)
    );
  }
  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});
// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2)check if user still exists

      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }
      // 4)  check  if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
//check role, cho phép user nào được thao tác những cái nào
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }
  // 2) Generate the random reset token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/user/forgotPassword/${resetToken}`;

    // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget    your password, please ignore this email!`;
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 min)',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  });
  // 2) if token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3) update changePasswordAt property for the user

  // 4) login the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) get user from collection
  const user = await User.findById(req.user.id).select('+password');
  // 2 check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT word as

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
