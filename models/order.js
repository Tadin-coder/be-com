const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    id: {
      type: String,
    },

    user: {
      type: String,
    },

    username: {
      type: String,
    },

    phone: {
      type: Number,
    },

    address: {
      type: String,
    },

    img: {
      data: Buffer,
      contentType: String,
    },

    productname: {
      type: String,
    },

    price: {
      type: Number,
    },

    quantity: {
      type: Number,
    },

    totalPrice: {
      type: String,
    },

    status: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = new mongoose.model('Order', schema);
