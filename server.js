const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exeption! ✴ Shutting down ');
  console.log(err.name, err.message);
  process.exit(1);
});

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB)
  .then(() => console.log('database connection was successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`It is listening from ${port}...`);
});

// handles all the promiss rejections. It is a safty net
//
process.on('unhandledRejection', (err) => {
  console.log('Unhandled rejection ✴ Shutting down ');
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
