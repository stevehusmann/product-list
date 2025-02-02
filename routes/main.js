const router = require("express").Router();
const faker = require("faker");
const Promise = require('bluebird');
const {Product} = require("../models/product");
const {Review} = require("../models/product");


const fakeReviews = () => {
  const numReviews = Math.floor((Math.random() * 7) + 2);
  let reviewArray = [];
  for (let i = 0; i < numReviews; i++) {
    let review = new Review();
    review.userName = faker.name.firstName() + ' ' + faker.name.lastName();
    review.reviewText = faker.commerce.productDescription();
    reviewArray.push(review);
  }
  return reviewArray;
}

router.get("/generate-fake-data", (req, res, next) => {
  for (let i = 0; i < 90; i++) {
    let product = new Product();
    product.category = faker.commerce.department();
    product.price = faker.commerce.price();
    product.name = faker.commerce.productName();
    let imageQuery = product.name.split(' ')[Math.floor(Math.random() * 2)];
    product.image = `https://loremflickr.com/250/250/${imageQuery}`;
    product.reviews = fakeReviews();
    product.save((err) => {
      if (err) throw err;
    });
  }
  res.end();
});

router.get("/category-list", (req, res, next) => {
  Product.distinct("category").exec((err, categoryList) => {
    if (err) return next(err);
    res.send(categoryList);
  });  
});

router.get("/products", (req, res, next) => {
  
  let categoryTerm = {};
  const categoryFilter = req.query.category;
  if (categoryFilter) {
    categoryTerm = {category: categoryFilter};
  }

  let sortTerm = {};
  const sortMethod = req.query.price;
  if (sortMethod == 'highest') {
    sortTerm = {price: -1}
  }
  if (sortMethod == 'lowest') {
    sortTerm = {price: 1}
  }
  
  let searchTerm = {};
  const query = req.query.query;
  if (query) {
    searchTerm = {$text : {$search: query}};
  }

  const pageNum = req.query.page || 1;
  const numToSkip = (pageNum - 1) * 9;

  
  Promise.all([
    Product.find().and([categoryTerm, searchTerm]).sort(sortTerm).skip(numToSkip).limit(9).exec(),
    Product.count().and([categoryTerm, searchTerm]).sort(sortTerm).exec()
  ]).spread(function(products, count) {
    res.send({products: products, totalCount: count});
  }, function(err) {
    handleError(res,err);
  });
   
});

router.get("/products/:product", (req, res, next) => {
  Product
    .findById(req.params.product)
    .exec((err, product) => {
      if (err) return next(err);
      res.send(product);
    });
});

router.get("/products/:product/reviews", (req, res, next) => {

  const pageNum = req.query.page || 1;
  let numToSkip = (pageNum - 1) * 4;

  Product.find({_id: req.params.product}).exec((err, product) => {
    if (err) return next(err);
    res.send(product[0].reviews.slice(numToSkip, numToSkip + 4));
  });
});

router.post("/products", (req, res) => {
  if (req.body) {
    let product = new Product;
    product.category = req.body.category;
    product.price = req.body.price;
    product.name = req.body.name;
    product.image = req.body.image;
    product.save();    
  }
  res.end();
});

router.post("/products/:product/reviews", (req, res, next) => {
  Product.findById(req.params.product).exec((err, product) => {
    if (err) return next(err);

    if (req.body){
      let review = new Review;
      review.userName = req.body.userName;
      review.reviewText = req.body.reviewText;
      product.reviews.push(review);
      product.save();
    }
  });
  res.end();
});

router.delete("/products/:product", (req, res, next) => {
  Product.findByIdAndDelete(req.params.product).exec((err, product) => {
    res.end();
  });
});

router.delete("/products/:product/reviews/:review", (req, res, next) => {
  Product.findById(req.params.product).exec((err, product) => {
    if (err) return next(err);
    let indexOfReviewToDelete = product.reviews.findIndex(review => review._id == req.params.review);
    if (indexOfReviewToDelete != -1) {
      product.reviews.splice(indexOfReviewToDelete, 1);
      product.save();
    }
  });
  res.end();
});

module.exports = router;