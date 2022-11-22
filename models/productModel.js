const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productname: {
    type: String,
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

module.exports = new mongoose.model('Product', ProductSchema);
