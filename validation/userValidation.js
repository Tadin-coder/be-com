const { check, sanitizedBody } = require('express-validator');

const registerValidation = [
  //Full Name validation
  check('name').trim().notEmpty().withMessage('Full Name is required!'),
  //Email || email validation
  check('username')
    .notEmpty()
    .withMessage('Email Address is required!')
    .normalizeEmail()
    .isEmail()
    .withMessage('Email address must be valid'),
  //Phone number validation
  check('address').notEmpty().withMessage('Phone Number is required!'),
  check('phone').notEmpty().withMessage('Phone Number is required!'),
  //Password validation
  check('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required!')
    .isLength({
      min: 8,
    })
    .withMessage('Password must be minimum 8 characters long')

    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('your password should have at least one special character'),
  //Confirm password validation
  // check('confirmPassword').custom((value, { req }) => {
  //   if (value !== req.body.confirmPassword) {
  //     throw new Error("Password confimation didn't match");
  //   }
  //   return true;
  // }),

  check('confirmPassword').custom(async (confirmPassword, { req }) => {
    const password = req.body.password;

    if (password !== confirmPassword) {
      throw new Error('Password must be same.');
    }
  }),
];

const loginValidation = [
  //Email || email validation
  check('username')
    .trim()
    .notEmpty()
    .withMessage('Email Address is required!')
    .normalizeEmail()
    .isEmail()
    .withMessage('Email address must be valid'),
  //Password validation
  check('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required!')
    .isLength({
      min: 8,
    })
    .withMessage('Password must be minimum 8 characters long'),
];

module.exports = { registerValidation, loginValidation };
