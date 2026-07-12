export const notFoundHandler = (req, res) => res.status(404).json({
  success: false,
  message: 'API route not found.'
});

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.message === 'CORS origin not allowed.') {
    return res.status(403).json({ success: false, message: 'CORS origin not allowed.' });
  }

  const status = Number(error?.status || error?.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message = safeStatus >= 500 ? 'Internal server error.' : (error?.message || 'Request failed.');

  if (process.env.NODE_ENV !== 'production') {
    console.error('[request error]', error?.message);
  }

  return res.status(safeStatus).json({ success: false, message });
};
