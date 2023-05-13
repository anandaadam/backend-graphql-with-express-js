import path from "path";
import fs from "node:fs";
import __dirname from "../utils/path.mjs";
import { Result, validationResult } from "express-validator";
import { PostModel } from "../models/FeedModel.mjs";
import { UserModel } from "../models/UserModel.mjs";
import { count } from "console";
import socket from "../socket.mjs";

const getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;

  try {
    const postModel = await PostModel.find().countDocuments();
    totalItems = postModel;
    const posts = await PostModel.find()
      .populate("creator")
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    if (!posts) {
      const error = new Error("No posts was found!");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      message: "Fetched successfully",
      posts,
      totalItems,
    });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

const createPost = async (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path.replace("\\", "/");
  const errors = validationResult(req);
  let creator;

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided");
    error.statusCode = 422;
    throw error;
  }

  const post = new PostModel({
    title: title,
    imageUrl: imageUrl,
    content: content,
    creator: req.userId,
  });

  try {
    await post.save();
    const user = await UserModel.findById(req.userId);

    creator = user;
    user.posts.push(post);

    await user.save();

    socket.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    console.log({ ...post._doc });
    res.status(201).json({
      message: "Success to created post",
      post: post,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

const getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await PostModel.findById(postId);
    if (!post) {
      const error = new Error("No post was found!");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Post fetched", post });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.statusCode = 422;
    throw error;
  }
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No image");
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await PostModel.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("No post found");
      error.statusCode = 422;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("No authorized");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) clearImage(post.imageUrl);

    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;

    const postUpdate = await post.save();
    socket.getIO().emit("posts", { action: "update", post: postUpdate });
    res.status(200).json({ message: "Post updatetd", post: postUpdate });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await PostModel.findById(postId);
    if (!post) {
      const error = new Error("No post found");
      error.statusCode = 422;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("No authorized");
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);

    await PostModel.findByIdAndRemove(postId);
    const user = await UserModel.findById(req.userId);

    user.posts.pull(postId);
    await user.save();

    socket.getIO().emit("posts", { action: "delete", post: postId });
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "../", filePath);
  fs.unlink(filePath, (error) => {
    console.log(error);
  });
};

export { getPosts, createPost, getPost, updatePost, deletePost };
