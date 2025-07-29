import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError  from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";





export const verifyJWT= asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.headers.Authorization?.replace("Bearer", "");

    if(!token){
        throw new ApiError(401, "You are not authorized to access this resource");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET )

    const user =await User.findById(decodedToken._id).select("-password -refreshToken");
    if(!user){
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user; // Attach the user to the request object
    next(); // Call the next middleware or route handler


});