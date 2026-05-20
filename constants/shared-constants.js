export const NODE_ENV = process.env.NODE_ENV;
export const APP_PORT = process.env.APP_PORT || 5000;
export const API_BASE_URL = process.env.API_BASE_URL;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

export const SERVER_SECRET = process.env.SERVER_SECRET;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS;
export const SENDER_EMAIL_PASSWORD = process.env.SENDER_EMAIL_PASSWORD;

export const MONGODB_URL = process.env.MONGODB_URL;
