import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Return from '../models/Return.js';
import Order from '../models/Order.js';

dotenv.config();

const RETURN_STATUS_MAP = {
  REQUESTED: 'RETURN_REQUESTED',
  APPROVED: 'RETURN_APPROVED',
  REJECTED: 'RETURN_REJECTED',
  SHIPPED_BACK: 'RETURN_PICKED',
  RECEIVED: 'RETURN_PICKED',
  REFUNDED: 'RETURN_COMPLETED'
};

async function migrateFeatureStatuses() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  for (const [from, to] of Object.entries(RETURN_STATUS_MAP)) {
    const returnResult = await Return.updateMany({ status: from }, { $set: { status: to } });
    const orderResult = await Order.updateMany({ orderStatus: from }, { $set: { orderStatus: to } });
    console.log(`${from} -> ${to}: returns=${returnResult.modifiedCount}, orders=${orderResult.modifiedCount}`);
  }

  await mongoose.disconnect();
}

migrateFeatureStatuses()
  .then(() => {
    console.log('Feature status migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
