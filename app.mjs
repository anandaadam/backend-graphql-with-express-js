import path from "path";
import fs from "node:fs";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import __dirname from "./utils/path.mjs";
import { graphqlHTTP } from "express-graphql";
import graphqlSchema from "./graphql/schema.mjs";
import graphqlResolver from "./graphql/resolvers.mjs";
import isAuth from "./middleware/isAuth.mjs";
import { clear } from "console";

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.json());
app.use("/images", express.static(path.join(__dirname, "../", "images")));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(isAuth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("No Autheticated");
    error.code = 401;
    throw error;
  }
  if (req.file) return res.status(200).json({ message: "No file provided!" });
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
    return res
      .status(201)
      .json({ message: "File stored!", filePath: req.file.path });
  }
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(error) {
      if (!error.originalError) return error;

      const data = error.originalError.data;
      const message = error.message || "Error occured";
      const code = error.originalError.code || 500;

      return { message: message, status: code, data: data };
    },
  })
);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  console.log(error);
  res.status(statusCode).json({ message, data });
});

mongoose
  .connect(
    "mongodb://adam:Pknqsx123.@ac-4st63nd-shard-00-00.myiaxw1.mongodb.net:27017,ac-4st63nd-shard-00-01.myiaxw1.mongodb.net:27017,ac-4st63nd-shard-00-02.myiaxw1.mongodb.net:27017/blogs?replicaSet=atlas-10elfg-shard-0&ssl=true&authSource=admin"
  )
  .then((result) => {
    app.listen(3001);
  })
  .catch((error) => console.log(error));

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "../", filePath);
  fs.unlink(filePath, (error) => {
    console.log(error);
  });
};
