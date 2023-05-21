import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { UserModel } from "../models/UserModel.mjs";
import { PostModel } from "../models/FeedModel.mjs";
import clearImage from "../utils/clearImage.mjs";

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

  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }

    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid" });
    }

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await UserModel.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user");
      error.data = errors;
      error.code = 401;
      throw error;
    }

    const post = new PostModel({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });
    const createdPost = await post.save();

    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await PostModel.find().countDocuments();
    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },

  post: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }

    const post = await PostModel.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async function ({ id, postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }

    const post = await PostModel.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("No authorized");
      error.code = 401;
      throw error;
    }

    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid" });
    }

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== "undefined") post.imageUrl = postInput.imageUrl;

    const updatePost = await post.save();
    return {
      ...updatePost._doc,
      _id: updatePost._id.toString(),
      createdAt: updatePost.createdAt.toISOString(),
      updatedAt: updatePost.updatedAt.toISOString(),
    };
  },

  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }

    const post = await PostModel.findById(id);
    if (!post) {
      const error = new Error("No post found!");
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("No authorized");
      error.code = 401;
      throw error;
    }

    clearImage(post.imageUrl);
    await PostModel.findByIdAndRemove(id);
    const user = await UserModel.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },

  status: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }

    const user = await UserModel.findById(req.userId);
    return { status: user.status };
  },

  updateStatus: async function ({ statusInput }, req) {
    if (!req.isAuth) {
      const error = new Error("No Autheticated");
      error.code = 401;
      throw error;
    }

    const user = await UserModel.findById(req.userId);
    user.status = statusInput.status;
    await user.save();

    return { status: user.status };
  },
};
