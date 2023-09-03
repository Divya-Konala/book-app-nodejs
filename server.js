const express = require("express");
const clc = require("cli-color");
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const jwt = require("jsonwebtoken");

// file imports
const {
  cleanUpAndValidate,
  generateJWTToken,
  sendVerficationToken,
  sendResetPasswordLink,
} = require("./utils/AuthUtils");
const UserSchema = require("./Schemas/UserSchema");
const { isAuth } = require("./middleware/AuthMiddleware");
const BookSchema = require("./Schemas/BookSchema");
const { validateBookDetails } = require("./utils/BookUtils");
const { RateLimiter } = require("./middleware/RateLimiter");

// variables
const server = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;
server.set("view engine", "ejs");
const saltRound = Number(process.env.saltRound);

const store = new mongoDbSession({
  uri: MONGO_URI,
  collection: "sessions",
});

//middleware
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(
  session({
    secret: "This is Book App",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
// for scripts in public folder
server.use(express.static("public"));

//mongodb connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log(clc.green("MongoDB Connected")))
  .catch((error) => console.log(clc.red(error)));

//routes
server.get("/", (req, res) => {
  return res.send({
    status: 200,
    message: "Welcome to book application",
  });
});

//registration
server.get("/registration", (req, res) => {
  return res.render("register");
});

server.post("/registration", async (req, res) => {
  const { name, username, email, password, phone } = req.body;
  try {
    //validate input data
    await cleanUpAndValidate({ name, username, email, phone, password });

    //check if user already exists
    const userDb = await UserSchema.findOne({
      $or: [{ email }, { username }],
    });
    if (userDb && userDb.email === email) {
      return res.send({
        status: 400,
        message: "email already exists",
      });
    }
    if (userDb && userDb.username === username) {
      return res.send({
        status: 400,
        message: "username already exists",
      });
    }

    //password encryption
    const hashPassword = await bcrypt.hash(password, saltRound);

    //save to db
    const new_user = new UserSchema({
      name,
      username,
      email,
      phone: Number(phone),
      password: hashPassword,
    });
    try {
      const userDb = await new_user.save();
      //token generate
      const verificationToken = generateJWTToken(email);
      //token send through mail
      sendVerficationToken({ email, verificationToken });
      return res.send({
        status: 201,
        message:
          "user created successfully. Please verify your email before you login",
        data: userDb,
      });
      // return res.send(200).redirect("/login");
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database Error",
        error: error,
      });
    }
  } catch (error) {
    return res.send({
      status: 400,
      message: "invalid data",
      error: error,
    });
  }
});

//login
server.get("/login", (req, res) => {
  res.render("login");
});

server.post("/login", async (req, res) => {
  const { loginId, password } = req.body;

  //validate input data
  if (!loginId || !password) {
    return res.send({
      status: 400,
      message: "missing credentials",
    });
  }
  if (typeof loginId !== "string" || typeof password !== "string") {
    return res.send({
      status: 400,
      message: "Invalid data format",
    });
  }

  //identify loginId and search in database
  try {
    let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await UserSchema.findOne({ email: loginId });
    } else {
      userDb = await UserSchema.findOne({ username: loginId });
    }
    if (!userDb) {
      return res.send({
        status: 400,
        message: "user not found, please register first",
      });
    }

    //check if email is authenticated
    if (userDb.emailAuthenticated === false) {
      return res.send({
        status: 400,
        message: "email not authenticated",
      });
    }
    //password compare
    const isMatch = await bcrypt.compare(password, userDb.password);
    if (!isMatch) {
      return res.send({
        status: 400,
        message: "password does not match",
      });
    }
    req.session.isAuth = true;
    req.session.user = {
      username: userDb.username,
      email: userDb.email,
      userId: userDb._id,
    };

    // return res.send({
    //   status: 200,
    //   message: "login successful",
    // });
    return res.redirect("/dashboard");
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
  return res.send(true);
});

// Add this route to handle forget password request
server.get("/forgot-password/:token", (req, res) => {
  const token = req.params.token;
  const SECRET_KEY = "This is a secret key";
  jwt.verify(token, SECRET_KEY, async function (err, decoded) {
    try {
      res.render("forgotPassword");
    } catch (err) {
      return res.send({
        status: 500,
        message: "Database Error",
        error: err,
      });
    }
  });
});

server.post("/forgot-password", async (req, res) => {
  const { loginId } = req.body;
  if (!loginId) {
    return res.send({
      status: 400,
      message: "missing credentials",
    });
  }
  if (typeof loginId !== "string") {
    return res.send({
      status: 400,
      message: "Invalid data format",
    });
  }

  try {
    // Check if the email exists in the database
    let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await UserSchema.findOne({ email: loginId });
    } else {
      userDb = await UserSchema.findOne({ username: loginId });
    }
    if (!userDb) {
      return res.send({
        status: 400,
        message: "user not found, please register first",
      });
    }
    if (!userDb) {
      return res.send({
        status: 404,
        message: "User not found",
      });
    }
    const email = userDb.email;
    // Generate and send reset password token
    const resetPasswordToken = generateJWTToken(email, "1h"); // Token valid for 1 hour
    sendResetPasswordLink({ email, resetPasswordToken });

    return res.send({
      status: 200,
      message: "Reset password link sent to your email",
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

server.post("/reset-password", async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.send({
      status: 400,
      message: "missing credentials",
    });
  }
  if (typeof loginId !== "string" || typeof password !== "string") {
    return res.send({
      status: 400,
      message: "Invalid data format",
    });
  }

  //identify loginId and search in database
  try {
    let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await UserSchema.findOne({ email: loginId });
    } else {
      userDb = await UserSchema.findOne({ username: loginId });
    }
    if (!userDb) {
      return res.send({
        status: 400,
        message: "user not found, please register first",
      });
    }

    //check if email is authenticated
    if (userDb.emailAuthenticated === false) {
      return res.send({
        status: 400,
        message: "email not authenticated",
      });
    }
    //password encryption
    const hashPassword = await bcrypt.hash(password, saltRound);
    //password update
    const newUserDb = await UserSchema.findByIdAndUpdate(userDb._id, {
      password: hashPassword,
    });

    // return res.send({
    //   status: 200,
    //   message: "login successful",
    // });
    res.render("login");
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

server.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  try {
    // Generate and send verification token
    const verificationToken = generateJWTToken(email);
    sendVerficationToken({ email, verificationToken });

    return res.send({
      status: 200,
      message: "Verification link sent to your email",
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

server.get("/api/:token", (req, res) => {
  const token = req.params.token;
  const SECRET_KEY = "This is a secret key";
  jwt.verify(token, SECRET_KEY, async function (err, decoded) {
    try {
      const userDb = await UserSchema.findOneAndUpdate(
        { email: decoded.email },
        { emailAuthenticated: true }
      );
      //   return res.send({
      //     status: 200,
      //     message: "email authenticated successfully"
      //   })
      return res.redirect("/login");
    } catch (err) {
      return res.send({
        status: 500,
        message: "Database Error",
        error: err,
      });
    }
  });
});

server.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboard");
});

server.post("/create-item", RateLimiter, isAuth, async (req, res) => {
  const { title, author, price, category } = req.body;

  //data validation
  try {
    await validateBookDetails({ title, author, price, category });
    //initialize book schema and save it Db
    const book = new BookSchema({
      title,
      author,
      price,
      category,
    });

    try {
      const bookDb = await book.save();
      return res.send({
        status: 201,
        message: "book details created successfully",
        data: bookDb,
      });
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database error",
        error: error,
      });
    }
  } catch (err) {
    return res.send({
      status: 400,
      message: "Invalid Data",
      error: err,
    });
  }
});

server.post("/edit-item/:id", RateLimiter, isAuth, async (req, res) => {
  const id = req.params.id;
  const { title, author, price, category } = req.body;
  if (!title || !author || !price || !category || !id) {
    return res.send({
      status: 400,
      message: "Missing data or id",
    });
  }

  if (
    typeof title !== "string" ||
    typeof author !== "string" ||
    !validator.isNumeric(price) ||
    typeof category !== "string"
  ) {
    return res.send({
      status: 400,
      message: "Invalid data format!",
    });
  }

  if (price <= 0) {
    return res.send({
      status: 400,
      message: "Price must be greater than 0",
    });
  }

  try {
    const updatedBook = await BookSchema.findOneAndUpdate(
      { _id: id },
      { title, author, price, category },
      { new: true } // To get the updated document after the update
    );
    return res.send({
      status: 200,
      message: "Book updated successfully!",
      data: updatedBook,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

server.get("/get-book/:id", RateLimiter, isAuth, async (req, res) => {
  const bookId = req.params.id;
  try {
    const book = await BookSchema.findOne({ _id: bookId });
    if (!book) {
      return res.send({
        status: 404,
        message: "Book not found",
      });
    }
    return res.send({
      status: 200,
      message: "Book found successfully!",
      data: book,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

server.post("/delete-item", RateLimiter, isAuth, async (req, res) => {
  const id = req.body.id;
  if (!id) {
    return res.send({
      status: 400,
      message: "missing id",
    });
  }

  try {
    const bookDb = await BookSchema.findOneAndDelete({ _id: id });
    return res.send({
      status: 200,
      message: "Book deleted successfully!",
      data: bookDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

server.get("/dashboarddata", RateLimiter, isAuth, async (req, res) => {
  try {
    const books = await BookSchema.find();
    return res.send({
      status: 200,
      message: "Read Success",
      data: books,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database Error",
      error: error,
    });
  }
});

server.listen(PORT, (req, res) => {
  console.log(clc.yellow.underline(`server running on port ${PORT}`));
});
