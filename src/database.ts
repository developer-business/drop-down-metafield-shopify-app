import mongoose, { Schema, Document, CallbackError } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify_products';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err: Error) => console.error('MongoDB connection error:', err));

// Define the Product interface
export interface IProduct extends Document {
  no: number;
  product_id: string;
  title: string;
  handle: string;
  vendor: string;
  status: string;
  img: string;
  price: number;
  compareAtPrice: number;
  year: number; 
  make: string;
  modelName: string;
  option: string;
  specs: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

// Define the Product schema
const ProductSchema = new Schema<IProduct>({
  no: { type: Number, required: true, unique: true },
  product_id: { type: String, required: true, unique: true },
  title: { type: String },
  handle: { type: String },
  vendor: { type: String },
  status: { type: String },
  img: { type: String },
  price: { type: Number },
  compareAtPrice: { type: Number },
  year: { type: Number },
  make: { type: String },
  modelName: { type: String },
  option: { type: String },
  specs: { type: String },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export interface IMetafield extends Document {
  key: string[];
}


const MetafieldSchema = new Schema<IMetafield>({
  key: { type: [String] },
});

export interface IYear extends Document {
  year: number;
  modelNames: string[];
}

const YearSchema = new Schema<IYear>({
  year: { type: Number, unique: true },
  modelNames: { type: [String] },
});

export interface IMake extends Document {
  make: string;
  modelNames: string[];
}

const MakeSchema = new Schema<IMake>({
  make: { type: String, unique: true },
  modelNames: { type: [String] },
});

export interface IOption extends Document {
  option: string;
}

const OptionSchema = new Schema<IOption>({
  option: { type: String, unique: true },
});

// Update the updated_at field on save
ProductSchema.pre('save', function (this: IProduct, next: (err?: CallbackError) => void) {
  this.updated_at = new Date();
  next();
});

// Create and export the Product model
export const Product = mongoose.model<IProduct>('Product', ProductSchema);
export const Metafield = mongoose.model<IMetafield>('Metafield', MetafieldSchema);
export const Year = mongoose.model<IYear>('Year', YearSchema);
export const Make = mongoose.model<IMake>('Make', MakeSchema);
export const Option = mongoose.model<IOption>('Option', OptionSchema);