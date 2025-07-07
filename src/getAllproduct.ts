import Shopify from 'shopify-api-node';
import { Product, IProduct, Metafield, Year, Make, Option } from './database';
import dotenv from 'dotenv';
dotenv.config();

interface MetafieldNode {
    id: string;
    key: string;
    value: string;
}

interface ProductNode {
    id: string;
    title: string;
    handle: string;
    featuredImage?: {
        url: string;
    };
    images: {
        edges: Array<{
            node: {
                url: string;
            };
        }>;
    };
    variants: {
        edges: Array<{
            node: {
                id: string;
                title: string;
                compareAtPrice: string;
                selectedOptions: Array<{
                    name: string;
                    value: string;
                }>;
                price: string;
            };
        }>;
    };
    status: string;
    tags: string[];
    vendor: string;
    productType: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    metafields: {
        edges: Array<{
            node: MetafieldNode;
        }>;
    };
}

interface QueryResponse {
    products: {
        edges: Array<{
            node: ProductNode;
            cursor: string;
        }>;
        pageInfo: {
            hasNextPage: boolean;
        };
    };
}

export interface ProductOutput {
    id: string;
    title: string;
    test1: string;
    test2: string;
    test3: string;
    test4: string;
}

const shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME || "",
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN || "",
    apiVersion: '2025-07',
});

const BATCH_SIZE = 250; // Maximum allowed by Shopify
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Counter for auto-incrementing no field
let productCounter = 0;

// Initialize counter from database
const initializeCounter = async (): Promise<void> => {
    try {
        const lastProduct = await Product.findOne().sort({ no: -1 });
        productCounter = lastProduct?.no || 0;
        console.log(`Initialized product counter at: ${productCounter}`);
    } catch (error) {
        console.error('Error initializing counter:', error);
        throw error;
    }
};

const getQueryString = (cursor?: string) => `{
    products(first: ${BATCH_SIZE}, after: ${cursor ? `"${cursor}"` : "null"}, sortKey: CREATED_AT, reverse: true) {
        edges {
            node {
                id
                title
                handle
                featuredImage {
                    url
                }
                variants(first: 10) {
                    edges {
                        node {
                            id
                            title
                            compareAtPrice
                            selectedOptions {
                                name
                                value
                            }
                            price
                        }
                    }
                }
                status
                vendor
                metafields(first: 20) {
                    edges {
                        node {
                            id
                            key
                            value
                        }
                    }
                }
            }
            cursor
        }
        pageInfo {
            hasNextPage
        }
    }
}`;

const processMetafields = (metafields: ProductNode['metafields']): Record<string, string> => {
    const metafieldObj: Record<string, string> = {};
    metafields.edges.forEach(({ node }) => {
        metafieldObj[node.key] = node.value;
    });
    return metafieldObj;
};

const saveProduct = async (product: ProductNode): Promise<void> => {
    const metafields = processMetafields(product.metafields);
    productCounter++; // Increment the counter
    const productData = {
        no: productCounter,
        product_id: product.id,
        title: product.title,
        handle: product.handle,
        metafield: metafields,
        vendor: product.vendor,
        status: product.status,
        img: product.featuredImage?.url,
        price: product.variants.edges[0].node.price,
        compareAtPrice: product.variants.edges[0].node.compareAtPrice,
        year: metafields.year,
        make: metafields.make,
        modelName: metafields.model,
        option: metafields.option,
        specs: metafields.spec,
        description: metafields.description,
    };

    try {
        await Product.findOneAndUpdate(
            { product_id: product.id },
            productData,
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error(`Error saving product ${product.id}:`, error);
        throw error;
    }
};

const processBatch = async (cursor?: string, retryCount = 0): Promise<{
    hasNextPage: boolean;
    nextCursor?: string;
    savedCount: number;
}> => {
    try {
        const response = await shopify.graphql(getQueryString(cursor)) as QueryResponse;
        const { edges, pageInfo } = response.products;

        // Save all products in the batch
        let savedCount = 0;

        for (const edge of edges) {
            // product
            await saveProduct(edge.node);
            // metafield
            let metafield = processMetafields(edge.node.metafields);
            let metaFieldKeyList = Object.keys(metafield);
            let metaField = await Metafield.find({});
            let existingKeys = metaField[0]?.key || [];
            metaFieldKeyList.forEach(key => {
                if (!existingKeys.includes(key)) {
                    existingKeys.push(key);
                }
            });
            await Metafield.deleteMany({});
            await Metafield.create({ key: existingKeys });

            // year
            if (metafield.year) {
                let year = metafield.year;
                let make = metafield.make;
                let existingYear = await Year.findOne({ year: Number(year) });
                if (!existingYear) {
                    await Year.create({ year: Number(year), modelNames: [make] });
                } else {
                    if (!existingYear.modelNames.includes(make)) {
                        await Year.updateOne({ year: Number(year) }, { $push: { modelNames: make } });
                    }
                }
            }

            // model
            if (metafield.model) {
                let model = metafield.model;
                let make = metafield.make;
                let existingMake = await Make.findOne({ make: make });
                if (!existingMake) {
                    await Make.create({ make: make, modelNames: [model] });
                } else {
                    if (!existingMake.modelNames.includes(model)) {
                        await Make.updateOne({ make: make }, { $push: { modelNames: model } });
                    }
                }
            }

            // option
            if (metafield.option) {
                let option = metafield.option;
                let existingOption = await Option.findOne({ option: option });
                if (!existingOption) {
                    await Option.create({ option: option });
                }
            }
            savedCount++;
        }

        return {
            hasNextPage: pageInfo.hasNextPage,
            nextCursor: edges[edges.length - 1]?.cursor,
            savedCount
        };
    } catch (error) {
        console.error(`Error processing batch ${cursor ? `after ${cursor}` : 'start'}:`, error);

        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying batch in ${RETRY_DELAY}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return processBatch(cursor, retryCount + 1);
        }

        throw error;
    }
};

const getAllProducts = async () => {
    try {
        await initializeCounter(); // Initialize the counter before starting
        let hasNextPage = true;
        let cursor: string | undefined;
        let totalProcessed = 0;
        let totalSaved = 0;

        console.log('Starting to fetch and save all products...');

        while (hasNextPage) {
            const result = await processBatch(cursor);
            hasNextPage = result.hasNextPage;
            cursor = result.nextCursor;
            totalProcessed += BATCH_SIZE;
            totalSaved += result.savedCount;

            console.log(`Progress: Processed ${totalProcessed} products, saved ${totalSaved} products`);
        }

        console.log('Finished processing all products');
        return {
            success: true,
            totalProcessed,
            totalSaved,
            message: `Successfully saved ${totalSaved} products to the database`
        };
    } catch (error) {
        console.error('Fatal error while fetching/saving products:', error);
        throw error;
    }
};

export default getAllProducts;