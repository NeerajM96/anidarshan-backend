import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

// TO DO: handle to prevent another user posting tweet on another account
const createTweet = asyncHandler(async (req, res) => {
    const content = req.body.content;
    const owner = req.user._id;
    if (content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
        owner,
        content,
    });

    if (!tweet) {
        throw new ApiError(
            500,
            "Something went wrong while creating the tweet!"
        );
    }

    return res.status(201).json(new ApiResponse(200, tweet));
});

// TODO: I need to map likes and dislikes to this response
const getUserTweets = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username:username?.toLowerCase() });
    const userId = user._id;

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: userId,
            },
        },
    ]);

    if (!tweets) {
        throw new ApiError(400, "Something went wrong while fetching tweets");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully!"));
});

const deleteTweetById = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;
    const user = req.user;
    const tweet = await Tweet.findById(tweetId);

    if (!user._id.equals(tweet.owner)) {
        throw new ApiError(401, "User is unauthorized to delete the tweet!");
    }
    const deletedTweet = await Tweet.deleteOne({ _id: tweetId });
    if (!deletedTweet) {
        throw new ApiError(500, "Something went wrong while deleting tweet!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;
    const content = req.body.content;
    const user = req.user;
    const tweet = await Tweet.findById(tweetId);

    if (!user._id.equals(tweet.owner)) {
        throw new ApiError(401, "User is unauthorized to update the tweet!");
    }

    if (content.trim() === "") {
        throw new ApiError(400, "Tweet is required");
    }

    tweet.content = content;
    tweet.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully!"));
});

export { createTweet, getUserTweets, deleteTweetById, updateTweet };
