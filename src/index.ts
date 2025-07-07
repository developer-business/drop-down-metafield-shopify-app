import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import getAllProducts from './getAllproduct';
import router from './router';
dotenv.config();

const app = express();
const port = process.env.PORT || 3003;
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'FETCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.raw());

app.use('/api', router);

async function main() {
  try {
    const products = await getAllProducts();
    console.log('Successfully fetched products with metafields:');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
setInterval(main, 1000 * 60 * 60 * 12);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});