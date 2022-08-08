const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { nextTick } = require('process');
const slugify = require('slugify');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getAllTour = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.updateTour = factory.updateOne(Tour);

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only image', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// upload.single('image') req.file
// upload.array('images', 5); req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/assets/image/tours/${req.body.imageCover}`);

  // 2) Image
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/assets/image/tours/${filename}`);

      req.body.images.push(filename);
    })
  );
  next();
});
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getTourStats = catchAsync(async (req, res, next) => {
  /* 
    $match: chọn document mong muốn truy vấn.
    $group: nhóm các document theo điều kiện nhất định,
    $project: được dùng để chỉ định các field sẽ xuất hiện trong output document
              -_id: <0 or false>: field _id sẽ không xuất hiện trong output document (mặc định _id luôn xuất hiện trong output document).
              -<field X>: <1 or true>: field X sẽ xuất hiện trong output document.
              -<field X>: <expression>: field X sẽ được tính toán dựa trên một expression nào đó.
    ---------------------------------------------------------- 

    $avg: Tính trung bình của tất cả giá trị đã cho từ tất cả Document trong Collection đó
    $min: lấy giá trị nhỏ nhất của các giá trị từ tất cả Document trong Collection đó
    $max: lấy giá trị lớn nhất của các giá trị từ tất cả Document trong Collection đó
    $month: lấy ra tháng
 
 */

  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        numTour: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      // $sort: { numTourStarts: -1 }, //DESC
      $sort: { numTourStarts: 1 }, //ASC
    },
    {
      $limit: 2,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
// /tours-within/:distance/center/:latlng/unit/:unit
// tours-within/400/center/34.111745,-118.113491/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  //lat = latitude: vĩ độ
  //lng = longitude : kinh độ

  //distance/3963.2:khoảng cách bán kính trái đất
  //distance/6378.1: khoảng cách kilometers
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format  lat,lng',
        400
      )
    );
  }
  /*
    <location field>: {
      $geoWithin: { $centerSphere: [ [ <x>, <y> ], <radius> ] }
   }
  -$geoWithin: Chọn tài liệu có dữ liệu không gian địa lý tồn tại hoàn toàn trong một hình dạng cụ thể
  -$centerSphere: Xác định vòng tròn cho truy vấn không gian địa lý sử dụng hình cầu.
                 Truy vấn trả về các tài liệu nằm trong giới hạn của vòng kết nối
  */
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  // 1meter = 0.000621371 mi(dặm)
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      // geoNear: Xuất tài liệu theo thứ tự từ gần nhất đến xa nhất từ ​​một điểm xác định.
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', // tạo một 'distance' for distanceField
        distanceMultiplier: multiplier, // chuyển distance về KM thì gõ 0.001 tương ứng với chia 1000
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    result: distances.length,
    data: {
      data: distances,
    },
  });
});
