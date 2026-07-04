import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Middleware to validate MongoDB ObjectId in route params
 * Usage: router.get('/:id', validateId('id'), controller)
 */
export const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next();
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`Invalid ObjectId in params.${paramName}: ${id}`, {
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(400).json({
        success: false,
        message: `Invalid ID format for parameter: ${paramName}`
      });
    }
    
    next();
  };
};

/**
 * Validate multiple ID params
 * Usage: router.get('/:id/:userId', validateIds(['id', 'userId']), controller)
 */
export const validateIds = (paramNames = []) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Invalid ObjectId in params.${paramName}: ${id}`, {
          url: req.originalUrl,
          method: req.method
        });
        
        return res.status(400).json({
          success: false,
          message: `Invalid ID format for parameter: ${paramName}`
        });
      }
    }
    
    next();
  };
};

export default {
  validateId,
  validateIds
};
