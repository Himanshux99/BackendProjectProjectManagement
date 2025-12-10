import { body } from "express-validator";
const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Email is not valid"),
    body("username")
      .trim()
      .notEmpty().withMessage("Username is required")
      .isLength({ min: 3 }).withMessage("Username must be at least three charecters long"),
    body("password")
      .trim()
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 charecters long"),
  ];
};
const userLoginValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Email is not valid"),
    body("username")
      .trim()
      .notEmpty().withMessage("Username is required")
      .isLength({ min: 3 }).withMessage("Username must be at least three charecters long"),
    body("password")
      .trim()
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 charecters long"),
  ];
};

const userChangeCurrentPasswordValidator = () => {
  return [
    body("oldPassword")
      .trim()
      .notEmpty().withMessage("Old Password is required"),
    body("newPassword")
      .trim()
      .notEmpty().withMessage("new Password is required")
      .isLength({ min: 6 }).withMessage("New Password must be at least 6 charecters long"),
  ];
};

const userForgotPasswordValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Email is invalid"),
  ];
};

const userRestForgotPasswordValidator = () => {
  return [
    body("newPassword")
      .trim()
      .notEmpty().withMessage("new Password is required")
      .isLength({ min: 6 }).withMessage("New Password must be at least 6 charecters long"),
  ];
};

export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userRestForgotPasswordValidator
};
