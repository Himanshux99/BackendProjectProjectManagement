// asyncHandler automatically catches errors inside async route handlers and 
// passes them to Express’s error middleware.
const asyncHandler = (requestHandler) => {
  return async (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => {
      next(error);
    });
  };
};

export { asyncHandler };
