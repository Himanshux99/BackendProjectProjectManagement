import { Router } from "express";
import {
  registerUser,
  login,
  logoutUser,
  verifyEmail,
  forgotPasswordRequest,
  getCurrentUser,
  resendEmailVarification,
  resetForgotPassword,
  changeCurrentPassword,
} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  userRestForgotPasswordValidator,
  userForgotPasswordValidator,
  userChangeCurrentPasswordValidator,
} from "../validation/index.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Anyone can access this routes, as we dont check the JWT tokens
router.route("/register").post(userRegisterValidator(), validate, registerUser);
// here first the validator runs and generate errors,
// then the middleware(validate) runs and catch all the errors and display them
// if no errors are found then controller runs

router.route("/login").post(userLoginValidator(), validate, login);
router.route("/verify-email/:varificationToken").get(verifyEmail);
// here :varificationToken is a param and can be fetched from the url

router
  .route("/forgot-password")
  .post(userForgotPasswordValidator(), validate, forgotPasswordRequest);
router
  .route("/reset-password/:resetToken")
  .get(userRestForgotPasswordValidator(), validate, resetForgotPassword);

//Secure Routes as we verify JWT Tokens
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/change-password")
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changeCurrentPassword,
  );
router
  .route("/resend-email-varification")
  .get(verifyJWT, resendEmailVarification);

export default router;
