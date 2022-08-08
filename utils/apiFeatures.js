class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // sao chép một object chứa req.query mới
    const queryObj = { ...this.queryString };
    // tạo những field cần xóa khi query
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    // duyệt qua từng field, những field nào co trong queryObj thì xóa đi
    excludeFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query.find(JSON.parse(queryStr));
    return this;
  }
  sort() {
    if (this.queryString.sort) {
      // console.log(this.queryString.sort);
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createAt');
    }
    return this;
  }

  limitedFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      //note: __v: hiển thị, -__v: ẩn đi, muốn ẩn đi những field nào thì chỉ cần thêm dấu - vào
      this.query = this.query.select('-__v');
    }
    return this;
  }
  pagination() {
    try {
      const page = this.queryString.page * 1 || 1;
      const limit = this.queryString.limit * 1 || 100;
      const skip = (page - 1) * limit;
      // method skip() dùng để lấy ra số document trong kết quả từ vị trí thừ bao nhiêu và bỏ qua các document trước bị trí đó
      this.query = this.query.skip(skip).limit(limit);
      // if (this.queryString.page) {
      //   // lấy ra số lượng tour trong DB
      //   const numTour = await Tour.countDocuments();
      //   if (skip >= numTour) throw new Error('this page does not exist');
      // }
    } catch (error) {
      res.status(404).join({
        status: 'fail',
        message: 'page not found',
      });
    }
    return this;
  }
}

module.exports = APIFeatures;
