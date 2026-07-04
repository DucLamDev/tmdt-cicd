import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validateId.js';
import {
  listAddresses,
  getProvinces,
  getDistricts,
  getWards,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/addressController.js';

const router = express.Router();

router.use(authenticate);

router.get('/provinces', getProvinces);
router.get('/districts/:provinceCode', getDistricts);
router.get('/wards/:districtCode', getWards);
router.get('/', listAddresses);
router.post('/', createAddress);
router.put('/:id', validateId('id'), updateAddress);
router.delete('/:id', validateId('id'), deleteAddress);
router.patch('/:id/default', validateId('id'), setDefaultAddress);

export default router;
