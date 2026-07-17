export const success = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const fail = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
