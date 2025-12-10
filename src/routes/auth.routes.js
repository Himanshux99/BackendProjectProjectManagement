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

router.route("/register").post(userRegisterValidator(), validate, registerUser); //done
router.route("/login").post(userLoginValidator(), validate, login); //done
router.route("/verify-email/:varificationToken").get(verifyEmail); //done
router
  .route("/forgot-password")
  .post(userForgotPasswordValidator(), validate, forgotPasswordRequest); //done
router
  .route("/reset-password/:resetToken")
  .get(userRestForgotPasswordValidator(), validate, resetForgotPassword);//done

//Secure Routes
router.route("/logout").post(verifyJWT, logoutUser); //done
router.route("/current-user").get(verifyJWT, getCurrentUser); //done
router
  .route("/change-password")
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changeCurrentPassword,
  ); //done
router
  .route("/resend-email-varification")
  .get(verifyJWT, resendEmailVarification); //done

export default router;
