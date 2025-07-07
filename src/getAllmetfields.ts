import { Request, Response } from "express";
import { Make, Metafield, Option, Product, Year } from "./database";

export const getAllMetafields = async (req: Request, res: Response) => {
    const metafields = await Metafield.find({});
    res.json({ success: true, result: metafields[0]?.key });
}

export const getYears = async (req: Request, res: Response) => {
    const years = await Year.find({});
    let yearList = years.map(year => year.year);
    res.json({ success: true, result: yearList });
}

export const getMakesByYear = async (req: Request, res: Response) => {
    const { year } = req.body;
    const years = await Year.find({ year: Number(year) });
    res.json({ success: true, result: years[0]?.modelNames });
}

export const getModels = async (req: Request, res: Response) => {
    const { make } = req.body;
    const makes = await Make.find({ make: make });
    let modelList = makes.map(make => make.modelNames);
    res.json({ success: true, result: modelList });
}

export const getSpecs = async (req: Request, res: Response) => {
    const { year, make, model, option } = req.body;
    let changeOption = option.charAt(0).toUpperCase() + option.slice(1);
    const products = await Product.find({ year: year, make: make, modelName: model });
    console.log(products);
    let product = products.find(product => product.title.includes(changeOption));
    res.json({ success: true, result: product });
}

export const getOptions = async (req: Request, res: Response) => {
    const options = await Option.find({});
    let optionList = options.map(option => option.option);
    res.json({ success: true, result: optionList });
}