const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { router } = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
