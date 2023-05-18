import bcrypt from "bcryptjs";
import validator from "validator";
import { UserModel } from "../models/UserModel.mjs";

const halo = {
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
};

export default halo;
