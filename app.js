const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const User = require('./models/userModel');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const {
  registerValidation,
  loginValidation,
} = require('./validation/userValidation');
const { validationResult, matchedData } = require('express-validator/src');
const Order = require('./models/order');
const fs = require('fs');

dotenv.config({ path: './config.env' });
const app = express();
app.use(express.json());

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(
  session({
    secret: 'Our little secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const DB = process.env.DATABASE.replace(
  'PASSWORD',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then((con) => {
    console.log('DB connection successful');
  })
  .catch((error) => console.log(error));

//mail sender
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.auth_user,
    pass: process.env.auth_pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// app.get('/', function (req, res, next) {
//   Product.find(function (err, docs) {
//     const productChunks = [];
//     const chunkSize = 3;
//     for (let i = 0; i < docs.length; i += chunkSize) {
//       productChunks.push(docs.slice(i, i + chunkSize));
//     }
//     res.render('user/index', {
//       currentUser: req.user,
//       products: productChunks,
//     });
//   }).lean();
// });

app.get('/', function (req, res) {
  res.render('user/index', { currentUser: req.user });
});

const error = [];

app.get('/about', function (req, res) {
  res.render('user/about', { currentUser: req.user });
});

app.get('/login', function (req, res) {
  res.render('user/login', { error: error });
});

app.get('/register', function (req, res) {
  res.render('user/register', { error: error });
});

//.....................................................User Registration .................................................//
app.post('/register', registerValidation, function (req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      var errMsg = errors.mapped();
      var inputData = matchedData(req);
      res.render('user/register', {
        errors: errMsg,
        inputData: inputData,
        error: error,
      });
    } else {
      User.register(
        {
          name: req.body.name,
          username: req.body.username,
          address: req.body.address,
          phone: req.body.phone,
        },
        req.body.password,
        function (err, user) {
          if (err) {
            error.push(err);
            res.redirect('/register');
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/');
            });
          }
        }
      );
    }
  } catch (err) {
    console.log('Verification Invalid!!' + err);
    res.render('register', { erroMessage: 'Something wrong' });
  }
});

app.post('/login', loginValidation, function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    var errMsg = errors.mapped();
    var inputData = matchedData(req);
    res.render('user/login', { errors: errMsg, inputData: inputData });
  } else {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    User.findOne({ username: req.body.username }, function (err, foundUser) {
      if (err) {
        res.render('user/login', { errorMessage: err });
      } else if (foundUser) {
        req.login(user, function (err) {
          if (err) {
            res.redirect('/login');
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/');
            });
          }
        });
      } else {
        res.render('user/login', { errorMessage: 'No user Found!!' });
      }
    });
  }
});

app.get('/update', function (req, res) {
  res.render('user/userUpdate', { currentUser: req.user });
});

app.post('/update/:id', async function (req, res) {
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/');
});

app.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

//.........................................PRODUCT MODEL AND IMPLEMENTATION .........................................//

//Admin Login
app.get('/admin', function (req, res) {
  res.render('admin/login');
});

app.get('/index', function (req, res) {
  if (req.isAuthenticated()) {
    Order.find({}, function (err, orders) {
      if (err) {
        console.log(err);
      } else {
        console.log(orders);
        res.render('admin/index', { currentUser: req.user, orders: orders });
      }
    });
  } else {
    res.redirect('/admin');
  }
});

app.post('/admin-login', loginValidation, function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    var errMsg = errors.mapped();
    var inputData = matchedData(req);
    res.render('admin/login', { errors: errMsg, inputData: inputData });
  } else {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    User.findOne({ username: req.body.username }, function (err, foundUser) {
      if (err) {
        res.render('admin/login', { errorMessage: err });
      } else if (foundUser.isAdmin === true) {
        req.login(user, function (err) {
          if (err) {
            res.redirect('/admin');
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/userDetails');
            });
          }
        });
      } else {
        res.render('admin/login', { errorMessage: 'No user Found!!' });
      }
    });
  }
});

app.get('/products', function (req, res) {
  if (req.isAuthenticated()) {
    Product.find({}, (err, products) => {
      if (err) {
        console.log(err);
      } else {
        res.render('admin/products', {
          products: products,
          currentUser: req.user,
        });
      }
    });
  } else {
    res.redirect('/admin');
  }
});

const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

const ProductSchema = new mongoose.Schema({
  productname: {
    type: String,
    required: true,
  },

  img: {
    data: Buffer,
    contentType: String,
  },

  price: {
    type: Number,
  },

  category: {
    type: String,
  },

  description: {
    type: String,
  },

  stock: {
    type: Boolean,
  },
});

const Product = new mongoose.model('Product', ProductSchema);

app.get('/addproduct', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('admin/addProduct', { currentUser: req.user });
  } else {
    res.redirect('/admin');
  }
});

app.post('/addProduct', upload.single('image'), (req, res, next) => {
  if (req.isAuthenticated()) {
    const obj = {
      productname: req.body.productname,
      img: {
        data: fs.readFileSync(
          path.join(__dirname + '/uploads/' + req.file.filename)
        ),
        contentType: 'image/png',
      },
      price: req.body.price,
      category: req.body.category,
      description: req.body.description,
      status: true,
    };
    Product.create(obj, (err, item) => {
      if (err) {
        console.log(err);
      } else {
        item.save();
        res.redirect('/products');
      }
    });
  } else {
    res.redirect('/admin');
  }
});

app.get('/edit/:id', function (req, res) {
  if (req.isAuthenticated()) {
    Product.findById(req.params.id, function (err, product) {
      if (err) {
        console.log(err);
      } else {
        res.render('admin/updateProduct', {
          currentUser: req.user,
          product: product,
        });
      }
    });
  } else {
    res.redirect('/admin');
  }
});

app.post('/edit/:id', async function (req, res) {
  if (req.isAuthenticated()) {
    await Product.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/products');
  } else {
    res.redirect('/admin');
  }
});

app.get('/delete/:id', async function (req, res) {
  if (req.isAuthenticated()) {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
  } else {
    res.redirect('/admin');
  }
});

app.get('/userDetails', function (req, res) {
  if (req.isAuthenticated()) {
    User.find({}, function (err, users) {
      if (err) {
        console.log(err);
      } else {
        res.render('admin/userDetails', {
          currentUser: req.user,
          users: users,
        });
      }
    });
  } else {
    res.redirect('/admin');
  }
});

app.get('/editUser/:id', function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.params.id, function (err, user) {
      if (err) {
        console.log(err);
      } else {
        res.render('admin/userUpdate', { currentUser: req.user, user: user });
      }
    });
  } else {
    res.redirect('/admin');
  }
});

app.post('/editUser/:id', async function (req, res) {
  if (req.isAuthenticated()) {
    await User.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/userDetails');
  } else {
    res.redirect('/admin');
  }
});

app.get('/deleteUser/:id', async function (req, res) {
  if (req.isAuthenticated()) {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/userDetails');
  } else {
    res.redirect('/admin');
  }
});

app.get('/adminLogout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/admin');
  });
});

app.get('/myDetails', function (req, res) {
  res.render('admin/myDetail', { currentUser: req.user });
});

app.post('/myDetails/:id', async function (req, res) {
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/index');
});

//Product Category......................................................
app.get('/kira', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/kira', { currentUser: req.user, products: products });
  });
});

app.get('/gho', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/gho', { currentUser: req.user, products: products });
  });
});

app.get('/jacket', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/jacket', { currentUser: req.user, products: products });
  });
});

app.get('/pant', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/pant', { currentUser: req.user, products: products });
  });
});

app.get('/rachu', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/rachu', { currentUser: req.user, products: products });
  });
});

app.get('/t-shirt', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/t-shirt', { currentUser: req.user, products: products });
  });
});

app.get('/religious', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/religious', { currentUser: req.user, products: products });
  });
});

app.get('/handicraft', function (req, res) {
  Product.find({}, function (err, products) {
    res.render('user/handicraft', {
      currentUser: req.user,
      products: products,
    });
  });
});

//................................................Search Product ...............................................//
app.post('/search', async (req, res) => {
  const sear = req.body.productname;
  const data = await Product.find({
    $or: [{ productname: { $regex: sear } }],
  });
  res.render('user/searchFind', { data: data, currentUser: req.user });
});

///............................Add To Cart ...............................//
// app.get('/cart/add-to-cart/:id', function (req, res) {
//   const productId = req.params.id;
//   const cart = new Cart(req.session.cart ? req.session.cart : {});

//   Product.findById(productId, function (err, product) {
//     if (err) {
//       console.log(err);
//     }
//     cart.add(product, product.id);
//     req.session.cart = cart;
//     console.log(req.session.cart);
//     res.send('Success');
//   });
// });

// totalPrice = 0;

// app.get('/cart', function (req, res, next) {
//   if (!req.session.cart) {
//     res.render('user/cart', { products: 0, items: 0, currentUser: req.user });
//   }
//   const cart = new Cart(req.session.cart);
//   res.render('user/cart', {
//     products: cart.generateArray(),
//     totalPrice: cart.totalPrice,
//     currentUser: req.user,
//   });
// });

// app.get('/cart/reduce/:id', function (req, res, next) {
//   const productId = req.params.id;
//   const cart = new Cart(req.session.cart ? req.session.cart : {});
//   cart.reduceByOne(productId);
//   req.session.cart = cart;
//   res.redirect('/cart');
// });

// app.get('/cart/add/:id', function (req, res) {
//   const productId = req.params.id;
//   const cart = new Cart(req.session.cart ? req.session.cart : {});

//   Product.findById(productId, function (err, product) {
//     if (err) {
//       console.log(err);
//     }
//     cart.add(product, product.id);
//     req.session.cart = cart;
//     console.log(product);
//     res.redirect('/cart');
//   });
// });

// app.get('/cart/remove/:id', function (req, res, next) {
//   const productId = req.params.id;
//   const cart = new Cart(req.session.cart ? req.session.cart : {});
//   cart.removeItem(productId);
//   req.session.cart = cart;
//   res.redirect('/cart');
// });

// app.get('/checkout', async function (req, res) {
//   if (req.isAuthenticated()) {
//     if (!req.session.cart) {
//       return res.redirect('/cart');
//     } else {
//       const cart = new Cart(req.session.cart);
//       const errMsg = 'Error';
//       return res.render('user/checkout', {
//         total: cart.totalPrice,
//         errMsg: errMsg,
//         noError: !errMsg,
//         currentUser: req.user,
//       });
//     }
//   } else {
//     res.redirect('/login');
//   }
// });

// app.post('/checkout', function (req, res, next) {
//   if (req.isAuthenticated()) {
//     if (!req.session.cart) {
//       return res.redirect('/cart');
//     }
//     const cart = new Cart(req.session.cart);
//     console.log(cart);
//     const order = new Order({
//       user: req.user,
//       cart: cart,
//       address: req.user.address,
//       name: req.user.name,
//       jrnl: req.body.jrnl,
//     });
//     order.save(function (err, result) {
//       req.session.cart = null;
//       res.redirect('/');
//     });
//   } else {
//     res.redirect('/login');
//   }
// });

//..................................................Place Order..................................................//
app.post('/order/:id', function (req, res) {
  if (req.isAuthenticated()) {
    const totalPrice = req.body.price * req.body.quantity;
    const newOrder = new Order({
      id: req.user._id,
      user: req.user.name,
      username: req.user.username,
      phone: req.user.phone,
      address: req.user.address,
      productname: req.body.productname,
      img: req.body.img,
      price: req.body.price,
      quantity: req.body.quantity,
      totalPrice: totalPrice,
      status: 'Pending',
    });
    newOrder.save(function (err, success) {
      if (err) {
        console.log(err);
      } else {
        res.redirect('/');
      }
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/myorder', function (req, res) {
  if (req.isAuthenticated()) {
    const id = req.user.id;
    Order.find({ id: id }, function (err, orders) {
      res.render('user/order', { orders: orders, currentUser: req.user });
    });
  } else {
    res.redirect('/login');
  }
});
//.........................................Admin Order.................................................//
app.get('/order', function (req, res) {
  if (req.isAuthenticated()) {
    Order.find({}, function (err, Orders) {
      res.render('admin/orderList', { currentUser: req.user, Orders: Orders });
    });
  } else {
    res.redirect('/admin');
  }
});

app.get('/orderNow/:id', function (req, res) {
  if (req.isAuthenticated()) {
    Product.findById(req.params.id, function (err, product) {
      res.render('user/orderForm', { currentUser: req.user, product: product });
    });
  } else {
    res.redirect('/login');
  }
});

app.get('/deleteOrder/:id', async function (req, res) {
  if (req.isAuthenticated()) {
    await Order.findByIdAndDelete(req.params.id);
    res.redirect('/order');
  } else {
    res.redirect('/admin');
  }
});

app.post('/Accept', function (req, res) {
  if (req.isAuthenticated()) {
    var submit = req.body.submit;
    var result = submit.trim().split(' ');
    console.log('Accept=' + result[1]);
    console.log(result[0]);
    if (result[0] === 'Accept') {
      Order.findOne({ _id: result[1] }, function (err, foundUser) {
        if (err) {
          console.log(err);
        }
        if (foundUser) {
          Order.updateOne(
            { _id: result[1] },
            { status: 'Accepted' },
            function (err) {
              if (err) {
                console.log(err);
              } else {
                Order.find(
                  { bookings: { $ne: null } },
                  function (err, foundRecords) {
                    var mailOptions = {
                      from: process.env.auth_user,
                      to: foundUser.username,
                      subject: 'BE-COM - Product confirmation',
                      html:
                        '<h3>Hello ' +
                        foundUser.username +
                        ', <h4>Your Product order is Confirmed. We will deliver you shortly.</a>',
                    };
                    //sending mail
                    transporter.sendMail(mailOptions, function (error, info) {
                      if (error) {
                        console.log('email' + error);
                      } else {
                        res.redirect('/order');
                      }
                    });
                  }
                );
              }
            }
          );
        }
      });
    }
  } else {
    res.redirect('/admin');
  }
});

app.post('/Decline', function (req, res) {
  if (req.isAuthenticated()) {
    var submit = req.body.submit;
    var result = submit.trim().split(' ');
    console.log('Decline=' + result[1]);
    console.log(result[0]);
    if (result[0] === 'Decline') {
      Order.findOne({ _id: result[1] }, function (err, foundExchange) {
        if (err) {
          console.log(err);
        }
        if (foundExchange) {
          Order.updateOne(
            { _id: result[1] },
            { status: 'Declined' },
            function (err) {
              if (err) {
                console.log(err);
              } else {
                res.redirect('/order');
              }
            }
          );
        }
      });
    }
  } else {
    res.redirect('/admin');
  }
});

app.get('/forgotPassword', function (req, res) {
  res.render('user/forgotPass', { currentUser: req.user });
});

app.get('/aforgotPassword', function (req, res) {
  res.render('admin/forgotPass', { currentUser: req.user });
});

app.post('/forgotPassword', function (req, res) {
  User.findOne({ username: req.body.username }).then((u) => {
    u.setPassword(req.body.password, (err, u) => {
      if (err) {
        console.log(err);
      } else {
        u.save();
        res.redirect('/login');
      }
    });
  });
});

app.post('/aforgotPassword', function (req, res) {
  User.findOne({ username: req.body.username }).then((u) => {
    u.setPassword(req.body.password, (err, u) => {
      if (err) {
        console.log(err);
      } else {
        u.save();
        res.redirect('/admin');
      }
    });
  });
});

app.get('/changePass', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('user/changePass', { currentUser: req.user });
  }
});

app.post('/changePass', function (req, res) {
  if (req.isAuthenticated)
    User.findByUsername(req.body.username, (err, user) => {
      if (err) {
        res.render('user/changePass', {
          currentUser: req.user,
          errmsg: 'No Such User Found',
        });
      } else {
        user.changePassword(
          req.body.oldpassword,
          req.body.newpassword,
          function (err) {
            if (err) {
              res.send(err);
            } else {
              res.redirect('/login');
            }
          }
        );
      }
    });
});

const port = 4001;
app.listen(port, function () {
  console.log(`App running on port ${port} ..`);
});
