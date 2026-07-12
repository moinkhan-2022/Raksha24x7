import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/security.js';

export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: jwtConfig.algorithm,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: jwtConfig.userIssuer,
    audience: jwtConfig.userAudience
  });

export const verifyUserToken = (token) => jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: [jwtConfig.algorithm],
  issuer: jwtConfig.userIssuer,
  audience: jwtConfig.userAudience
});
