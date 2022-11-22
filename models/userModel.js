const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
    },

    address: {
      type: String,
    },

    phone: {
      type: Number,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    file: {
      type: String,
    },

    password: {
      type: String,
    },
  },
  { timestamps: true }
);

UserSchema.plugin(passportLocalMongoose);
module.exports = new mongoose.model('User', UserSchema);
