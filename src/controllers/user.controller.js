import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
    deleteOldUploadOnCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
    // Steps:

    // 1: get User Details from front-end
    const { fullName, email, username, password } = req.body;

    // 2: validation of input - !empty
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // 3: check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with Email or Username already exists");
    }

    // 4: check for images and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // 5: upload them to cloudinary, check if avatar uploaded to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Error while uploading avatar!");
    }

    // 6: create user object - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    // 7: remove password & refresh token fields from response, inside select() pass a string with '-' before
    // property which we don't want
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // 8: check for user creation
    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    // 9: return result
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User Registered Successfully")
        );
});

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        // save refresh token to db
        // while saving mongoose's models kicks in and it will ask for all required fields of user model eg. password, so to
        // prevent it from happening, set validateBeforeSave to false.
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh tokens"
        );
    }
};

const loginUser = asyncHandler(async (req, res) => {
    // 1: req body -> data
    const { username, email, password } = req.body;

    // 2: login based on username or email
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    // 3: find the user
    // finds the user based on username or email
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (!user) {
        throw new ApiError(404, "User does not exist!");
    }

    // 4: password check
    // KIM: the methods which we wrote in User model are accessible via the retrieved "user" and not User Model "User"
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // 5: access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    // 6: send cookie
    // we can also update(for accessToken) the user object found by email/username above and remove password field,
    // else if db querrying is not expensive so make db querry from db and then specifying unwanted properties inside select()
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // by default cookies can be modified by anyone on frontend, by setting below options only server can
    // modified the cookies (but they still can be visible on client/frontend in Read-Only manner)
    const options = {
        httpOnly: true,
        secure: true,
    };

    // we have set accessToken, refreshToken in cookies but are still returning them because if user wants to save these tokens
    // for himself eg he is developing mobile application and there cookies wont be set so he can use these token directly
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
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,  // this removes field from document
            },
        },
        {
            new: true, // returns the updated user (in this case return user with undefined refreshToken)
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out!"));
});

// Genrate accessToken after it has expired by matching refreshToken sent by client and refreshToken stored on server.
// KIM: refreshToken is used so that user don't have to login again and again after expiration of accessToken
const refreshAccessToken = asyncHandler(async (req, res) => {
    // if person is using mobile application, he may not have cookies thus we get token from req.body or req.header("Authorization")
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);
        const storedRefreshToken = user.refresToken;
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (storedRefreshToken !== user?.refresToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, refreshToken:newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    // req.user got via auth.middleware
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched succefully!")
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { fullName, email },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully!")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Error while uploading avatar!");
    }

    // delete old avatar file from cloudinary
    const avatarOldCloudPath = req.user?.avatar;
    deleteOldUploadOnCloudinary(avatarOldCloudPath);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing!");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
        throw new ApiError(400, "Error while uploading cover image!");
    }

    // delete old cover image file from cloudinary
    const coverImageOldCloudPath = req.user?.coverImage;
    deleteOldUploadOnCloudinary(coverImageOldCloudPath);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing!");
    }

    // aggregation returns an array[], here since we have filtered based on only one username, thus in aggregate returns a single
    // object in array
    const channel = await User.aggregate([
        // we got matched user by username
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        // we get subcribers from channels. We got user's subscribers through channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        // we get user's subscriptions from subscribers. We got how many we have subscribed through subscribers
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        // fields that we need to send in response
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully!"
            )
        );
});

// KIM: req.user._id gives us a string but it is not mongoDB's objectId, when we perform operations like 'User.findById', mongoose
// automatically this id to mongoDB's objectId, but in aggregation pipelines are directly sent to MongoDB, thus we need to convert
// this id to mongoDB's objectId by ourself.
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                // we got all video documents now  to get user's detail from all these documents one by one
                pipeline: [
                    {
                        $lookup: {
                            from: "users",

                            // we are inside video model, so local field is owner as we need owner's details from
                            // "Users" model
                            localField: "owner",
                            // foreign field is corresponding field of owner in User model
                            foreignField: "_id",
                            as: "owner",

                            // return only neccessary fields from User Model. returned fields will add into owner's fields
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    // after lookup we get an array i.e. [owner_object] and we need to get the 0th index object from the array,
                    // so to simplify add another field as owner: object at 0th index of result array
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully!"
            )
        );
});

// if we are exporting like below 'export {register}', then we have to use '{}' during importing it in other files
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
