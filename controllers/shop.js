// All product-related logic (controller connects model [data, such as a database] and view [user interface], for example, handling user input. It accepts input and performs the corresponding update)

// Capital is convention for class name
const Product = require('../models/product');
const Order = require('../models/order');

exports.getProducts = (req, res) => {
  // Mongoose method. Unlike with MongoDB driver, method does not provide a cursor, but all products (but could chain cursor() method to get access to cursor, then use eachAsync() to loop through them or next() to get next element)
  Product.find()
    .then((products) => {
      console.log(products);
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        isAuthenticated: req.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.getProduct = (req, res) => {
  // Extract value held by dynamic path segment in shop.js routes file
  // Express.js supplies params object. Can access productId on params object because that's the name used after the colon in the route
  const prodId = req.params.productId;
  // findById is a Mongoose method. String passed to it is automatically converted to Object Id
  Product.findById(prodId)
    .then((product) => {
      res.render('shop/product-detail', {
        product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.getIndex = (req, res) => {
  Product.find()
    .then((products) => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        isAuthenticated: req.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.getCart = (req, res) => {
  req.user
    // Get cart items where product ID is populated with product data
    .populate('cart.items.productId')
    // Needed to be able to chain then; executes populate() and returns promise
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products,
        isAuthenticated: req.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCart = (req, res) => {
  // Retrieve product ID from incoming request and fetch that product in database/file and add it to cart
  // productId is the name used in the view, on the hidden input
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      // Express method. Loads GET route for cart page
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect('/cart');
    })
    .catch((err) => console.log(err));
};

exports.postOrder = (req, res) => {
  req.user
    // Get cart items where product ID is populated with product data
    // productID was added as a key (holds product._id) in addToCart method of user schema
    .populate('cart.items.productId')
    // Needed to be able to chain then; executes populate() and returns promise
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        // _doc is provided by Mongoose. Using spread operator to pull out the full product data from it and store in new object
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          name: req.user.name,
          userId: req.user,
        },
        products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then((result) => res.redirect('/orders'))
    .catch((err) => console.log(err));
};

exports.getOrders = (req, res) => {
  Order.find({ 'user.userId': req.user._id })
    .then((orders) => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders,
        isAuthenticated: req.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};
