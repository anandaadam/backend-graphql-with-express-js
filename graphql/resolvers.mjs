import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { UserModel } from "../models/UserModel.mjs";

export default {
  createUser: async function ({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "email is invalid" });
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: "lenght password is 5" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await UserModel.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User is already exists");
      throw error;
    }

    const hashedPassword = await bcrypt.hash(userInput.password, 12);
    const user = new UserModel({
      email: userInput.email,
      name: userInput.name,
      password: hashedPassword,
    });
    const createdUser = await user.save();

    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },

  login: async function ({ email, password }) {
    const user = await UserModel.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found!");
      error.code = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      "SECRET PASSWORD SECRET PASSWORD",
      { expiresIn: "1h" }
    );

    return { token: token, userId: user._id.toString() };
  },
};
