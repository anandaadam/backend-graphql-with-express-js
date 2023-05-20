import jwt from "jsonwebtoken";

export default (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    req.isAuth = false;
    return next();
  }

  const token = authHeader.split(" ")[1];
  let decodeToken;
  try {
    decodeToken = jwt.verify(token, "SECRET PASSWORD SECRET PASSWORD");
  } catch (error) {
    req.isAuth = false;
    return next();
  }

  if (!decodeToken) {
    req.isAuth = false;
    return next();
  }

  req.userId = decodeToken.userId;
  req.isAuth = true;
  next();
};
