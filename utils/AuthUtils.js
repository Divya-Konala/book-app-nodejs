const validator = require("validator");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const SECRET_KEY = "This is a secret key";

const cleanUpAndValidate = ({ name, email, password, username, phone }) => {
  return new Promise((resolve, reject) => {
    if (!name || !email || !password || !username || !phone) {
      reject("Missing Credentials");
    } else if (typeof email !== "string") {
      reject("Invalid email");
    } else if (typeof password !== "string") {
      reject("Invalid password");
    } else if (typeof username !== "string") {
      reject("Invalid username");
    } else if (password.length <= 2 || password.length > 25) {
      reject("password length should be 3-25");
    } else if (username.length <= 2 || username.length > 50) {
      reject("username length should be 3-50");
    } else if (!validator.isEmail(email)) {
      reject("email format invalid");
    } else if (!validator.isMobilePhone(phone)) {
      reject("Invalid phone number");
    } else {
      resolve();
    }
  });
};

const generateJWTToken = (email) => {
  const JWT_TOKEN = jwt.sign({email}, SECRET_KEY);
  return JWT_TOKEN;
};


const sendVerficationToken = ({ email, verificationToken }) => {
  //nodemailer
  const transpoter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    service: "Gmail",
    auth: {
      user: "divyakonala135@gmail.com",
      pass: process.env.mailPassword,
    },
  });

  const mailOptions = {
    from: "Book App pvt lt",
    to: email,
    subject: "Email verfication for Book App",
    html: `Click <a href="https://book-app-nodejs-production.up.railway.app/${verificationToken}">Here!!</a>`,
  };

  transpoter.sendMail(mailOptions, function (err, response) {
    if (err) throw err;
    console.log("Mail sent succeessfully");
  });
};

// Implement the sendResetPasswordLink function
function sendResetPasswordLink({ email, resetPasswordToken }) {
  // Use Nodemailer or any other library to send the email
  // Example using Nodemailer:
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "divyakonala135@gmail.com",
      pass: process.env.mailPassword,
    },
  });

  const mailOptions = {
    from: "Book App pvt lt",
    to: email,
    subject: "Reset Your Password",
    html: `Click <a href="https://book-app-nodejs-production.up.railway.app/forgot-password/${resetPasswordToken}">Here!!</a> to Reset Password`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}


module.exports = { cleanUpAndValidate, generateJWTToken, sendVerficationToken, sendResetPasswordLink};
