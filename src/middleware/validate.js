export function validate(schema, target = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const error = new Error('Request validation failed.');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      return next(error);
    }
    req[target] = result.data;
    return next();
  };
}
