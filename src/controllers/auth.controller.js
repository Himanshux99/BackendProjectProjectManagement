import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { emailVarificationMailgenContent, sendEmail } from "../utils/mail.js";
import jwt from "jsonwebtoken";

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
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  }); // It finds a document in the DB with either of the given field and return a Documnet

  if (existedUser) {
    throw new ApiError(
      409,
      "User with the username or email already exists",
      [],
    );
  }

  const user = await User.create({
    email,
    password,
    username,
    role,
    isEmailVarified: false,
  }); //Create a document in the DB and also return the smongoose object

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
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });

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
const login = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

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

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

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
const getCurrentUser = asyncHandler(async (req, res) => {
  return (
    req.status(200),
    json(new ApiResponse(200, req.user, "Current user fetched Successfully"))
  );
});
const verifyEmail = asyncHandler(async (req, res) => {
  const { varificationToken } = req.params;
  if (!varificationToken) {
    throw new ApiError(401, "Varification token missing");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(varificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVarificationToken: hashedToken,
    emailVarificationExpiry: { $gt: Date.now() },
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
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
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
      .cookie("refreshToken", refreshtoken, options)
      .cookie("accessToken", accesstoken, options)
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
// const getCurrentUser = asyncHandler(async (req, res) => {});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVarification,
  refreshAccessToken,
};
