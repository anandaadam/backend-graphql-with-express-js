import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { UserModel } from "../models/UserModel.mjs";

const signup = async (req, res, next) => {
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("validation failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new UserModel({
      email: email,
      password: hashedPassword,
      name: name,
    });

    const result = await user.save();
    res.status(201).json({ message: "User created", userId: result._id });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

const login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  try {
    const user = await UserModel.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 401;
      throw error;
    }
    loadedUser = user;

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password not match");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
      },
      "YOU THINK IS SECRET",
      { expiresIn: "1h" }
    );
    res.status(200).json({ token, userId: loadedUser._id.toString() });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

export { signup, login };
