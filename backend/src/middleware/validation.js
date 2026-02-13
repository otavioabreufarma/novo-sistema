function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'ValidationError',
        details: error.details.map((item) => item.message)
      });
    }

    req[source] = value;
    return next();
  };
}

module.exports = { validate };
