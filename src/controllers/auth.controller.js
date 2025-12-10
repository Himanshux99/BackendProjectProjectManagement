import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  emailVarificationMailgenContent,
  forgetPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; // Saving the Refresh Token in the Database not access token

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(
      500,
      "Something went wrong while generating Access or Refresh Tokens",
      [],
    );
  }
};

//Post
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  }); // It finds a document in the DB with either of the given field and return a Document

  if (existedUser) {
    throw new ApiError(
      409,
      "User with the username or email already exists",
      [],
    );
  }

  const user = await User.create({
    email, // email : email
    password, // password : password
    username, // username : username
    isEmailVarified: false,
  }); //Create a document in the DB and also return the mongoose object

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemoporaryToken(); //Genereated the tokens using Schema Methods

  user.emailVarificationToken = hashedToken;
  user.emailVarificationExpiry = tokenExpiry;
  await user.save();

  //user?.email -> this means return email if exist if not return "undeifned" not null or error
  await sendEmail({
    email: user?.email,
    subject: "Please Varify your Email",
    mailgenContent: emailVarificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
    ),
  });

  //get user document wothout the fields password refreshToken and so on
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVarificationToken -emailVarificationExpiry",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went Wrong While registering a user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registerd Successfully and verification email has been sent",
      ),
    );
});

//Post
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Incorrect Password Or Email");
  }

  const { accessToken, refreshToken } = 
    await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVarificationToken -emailVarificationExpiry",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In successfully",
      ),
    );
});

//Get
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

//Get
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched Successfully"));
});

//Get
// We get a Get req which has a token  we need to verify that this token is same as we have in our DB
const verifyEmail = asyncHandler(async (req, res) => {
  const { varificationToken } = req.params;
  if (!varificationToken) {
    throw new ApiError(401, "Varification token missing");
  }

  //Hashing as we have Hashed vesion in DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(varificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVarificationToken: hashedToken,
    emailVarificationExpiry: { $gt: Date.now() },//Checks if the Verification window is still open or not (20 min) 
  });

  if (!user) {
    throw new ApiError(401, "Token is invalid or expired");
  }

  user.emailVarificationExpiry = undefined;
  user.emailVarificationToken = undefined;
  user.isEmailVarified = true;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVarified: true }, "Email is varified"));
});

//Get
const resendEmailVarification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User Doesn't exist");
  }
  if (user.isEmailVarified) {
    throw new ApiError(409, "User email already varified");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemoporaryToken(); //Genereated the tokens using Schema Methods

  user.emailVarificationToken = hashedToken;
  user.emailVarificationExpiry = tokenExpiry;
  await user.save();

  await sendEmail({
    email: user?.email,
    subject: "Please Varify your Email",
    mailgenContent: emailVarificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your email id"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Unauthorized Access");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token Expired");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    user.accessToken = accessToken;

    await user.save({ validateBeforeSave: false });

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("refreshToken", newRefreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Unauthorized Access");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not Found");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemoporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Password Reset request",
    mailgenContent: forgetPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_URL}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password Reset Mail has been sent to your email id",
      ),
    );
});

//Post
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(489, "Token is Expired or invalid");
  }
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;
  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Reset Successfully"));
});

//Post
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "invalid Old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVarification,
  refreshAccessToken,
  resetForgotPassword,
  changeCurrentPassword,
  forgotPasswordRequest,
};
