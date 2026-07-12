import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/security.js';
import { appConfig } from '../config/appConfig.js';

export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: jwtConfig.algorithm,
    expiresIn: appConfig.jwt.userExpiresIn,
    issuer: jwtConfig.userIssuer,
    audience: jwtConfig.userAudience
  });

export const verifyUserToken = (token) => jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: [jwtConfig.algorithm],
  issuer: jwtConfig.userIssuer,
  audience: jwtConfig.userAudience
});
