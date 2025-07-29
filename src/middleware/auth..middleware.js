import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";



export const verifyJWT= asyncHandler(async (req, res, next) => {
    req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer", "");

    if(!token){
        throw new ApiError(401, "You are not authorized to access this resource");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET )

    const user =await User.findById(decodedToken._id).select("-password -refreshToken");
    if(!user){
        throw new ApiError(401, "Invalid Access Token");
    }


});