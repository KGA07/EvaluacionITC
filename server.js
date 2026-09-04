'use strict';
const app = require('./app');
const config = require('./config');

if (!config.isVercel) {
  app.listen(config.port, () => {
    console.log(`\n  ITC Evaluaciones v2.0`);
    console.log(`  http://localhost:${config.port}`);
    console.log(`  Profesor: ${process.env.PROFESOR_USER || 'GKempe'} / ${process.env.PROFESOR_PASSWORD || '1234'}\n`);
  });
}

module.exports = app;
