const { Op } = require('sequelize');

const advancedResults = (model, include) => async (req, res, next) => {
  // Build query options
  const queryOptions = {
    where: {},
    order: [['createdAt', 'DESC']]
  };

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit', 'search', 'attributes'];
  
  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Process filter conditions
  Object.keys(reqQuery).forEach(key => {
    const value = reqQuery[key];
    
    // Handle special operators
    if (typeof value === 'object') {
      Object.keys(value).forEach(operator => {
        const opValue = value[operator];
        let sequelizeOp;
        
        switch(operator) {
          case 'gt':
            sequelizeOp = Op.gt;
            break;
          case 'gte':
            sequelizeOp = Op.gte;
            break;
          case 'lt':
            sequelizeOp = Op.lt;
            break;
          case 'lte':
            sequelizeOp = Op.lte;
            break;
          case 'in':
            sequelizeOp = Op.in;
            break;
          default:
            sequelizeOp = null;
        }
        
        if (sequelizeOp) {
          queryOptions.where[key] = {
            ...queryOptions.where[key],
            [sequelizeOp]: opValue
          };
        }
      });
    } else {
      queryOptions.where[key] = value;
    }
  });

  // Search functionality
  if (req.query.search) {
    const searchValue = `%${req.query.search}%`;
    
    // Default search fields - can be customized per model
    const searchFields = ['name', 'email', 'phone', 'description'];
    
    const searchConditions = searchFields.map(field => {
      if (model.rawAttributes[field]) {
        return { [field]: { [Op.like]: searchValue } };
      }
      return null;
    }).filter(condition => condition !== null);
    
    if (searchConditions.length > 0) {
      queryOptions.where = {
        ...queryOptions.where,
        [Op.or]: searchConditions
      };
    }
  }

  // Select Fields (attributes in Sequelize)
  if (req.query.select || req.query.attributes) {
    const selectFields = (req.query.select || req.query.attributes).split(',');
    queryOptions.attributes = selectFields;
  }

  // Sort
  if (req.query.sort) {
    const sortFields = req.query.sort.split(',');
    queryOptions.order = sortFields.map(field => {
      if (field.startsWith('-')) {
        return [field.substring(1), 'DESC'];
      }
      return [field, 'ASC'];
    });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const offset = (page - 1) * limit;

  queryOptions.limit = limit;
  queryOptions.offset = offset;

  // Include related models
  if (include) {
    queryOptions.include = include;
  }

  try {
    // Execute query
    const { count, rows } = await model.findAndCountAll(queryOptions);

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (page < totalPages) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (page > 1) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    pagination.totalPages = totalPages;
    pagination.currentPage = page;
    pagination.totalItems = count;

    res.advancedResults = {
      success: true,
      count: rows.length,
      pagination,
      data: rows
    };

    next();
  } catch (error) {
    console.error('Advanced results error:', error);
    next(error);
  }
};

module.exports = advancedResults;
