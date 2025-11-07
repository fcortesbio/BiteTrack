import { verifyToken } from '../utils/jwt.js';
import Seller from '../models/Seller.js';

const authenticate = async(req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const seller = await Seller.findById(decoded.id);
    if (!seller) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
        statusCode: 401,
      });
    }

    req.user = seller;
    next();
  } catch {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      statusCode: 401,
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        statusCode: 403,
      });
    }

    next();
  };
};

export {
  authenticate,
  authorize,
};
