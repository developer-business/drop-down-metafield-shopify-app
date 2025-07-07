import { Router } from 'express';
import { getAllMetafields, getMakesByYear, getYears, getModels,getSpecs, getOptions } from './getAllmetfields';

const router = Router();

router.post('/getMetafields', getAllMetafields);
router.post('/getMakesByYear', getMakesByYear)
router.post('/getYears', getYears)
router.post('/getModels', getModels)
router.post('/getSpecs', getSpecs)
router.post('/getOptions', getOptions)

export default router;