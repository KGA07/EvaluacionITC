'use strict';
const app = require('./app');
const config = require('./config');

if (!config.isVercel) {
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n  ITC Evaluaciones v2.0`);
    // eslint-disable-next-line no-console
    console.log(`  http://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`  Profesor: ${process.env.PROFESOR_USER || 'GKempe'} / ${process.env.PROFESOR_PASSWORD || '1234'}\n`);
  });
}

module.exports = app;
