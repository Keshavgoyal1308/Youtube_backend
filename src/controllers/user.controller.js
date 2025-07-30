import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


// Function to generate access and refresh tokens for a user
const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
              await user.save({validateBeforeSave: false});
               // Save the user with the new refresh token

               return{accessToken, refreshToken};
    }
    catch(error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }

}



//// User Registration Controller
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

   const{fullName, email,username, password} = req.body;
  
if([fullName, email, username, password].some((field) => field?.trim() === "" )){
    throw new ApiError(400,"All fields are required")
}
    const userExists = await User.findOne({
        $or: [{ email }, { username }]})

    if(userExists){
        throw new ApiError(409, "User already exists with this email or username");
    }

   const avatarLocalPath= req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
   if(!avatarLocalPath ){
       throw new ApiError(400, "Avatar is required");
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;
   if(!avatar){
       throw new ApiError(500, "Avatar upload failed");
   }
// Create user object

   const user=await User.create({
         fullName,
         email,
         username: username.toLowerCase(),
         password,
         avatar: avatar.url,
         coverImage: coverImage ? coverImage.url : "",
   })
   // Check if user creation was successful
   
   const createdUser = await User.findById(user._id).select("-password -refreshToken");
   if(!createdUser){
       throw new ApiError(500, "User creation failed");
   }
    
   // Return the created user without password and refreshToken
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
});

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const { username,email, password } = req.body;
    if(!(username || email)){
        throw new ApiError(400, "Username or email is required");
    }
    const user = await User.findOne({
        $or:[{username}, {email}]
    })
     if(!user){ 
        throw new ApiError(404, "User not found");
    }
    //difference betwee user And User is that User is a model and user is an instance of that model
    const isPasswordCorrect = await user.isPasswordCorrect(password);

   const {accessToken,refreshToken} =await generateAccessAndRefreshTokens(user._id);
     
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const cookieOptions = {
       httpOnly: true,
       secure: true,}
       return res.status(200).cookie("refreshToken", refreshToken, cookieOptions).cookie("accessToken", accessToken, cookieOptions).json(
        new ApiResponse(200, {user: loggedInUser,accessToken, refreshToken}, "User logged in successfully")
       )

        
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set:{
        refreshToken: null
        
    } }, 
    { new: true })
    const options= {
        httpOnly: true,
        secure: true,
    }
     return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
    
})
// Function to refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Current password and new password are required");
    }
    const user= await User.findById(req.user?._id);
    const isPasswordCorrect =await user.isPasswordCorrect(currentPassword);

    if(!isPasswordCorrect){
        throw new ApiError(401, "Current password is incorrect");
    }



    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
    
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});


const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.files?.avatar?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is missing");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(500, "Avatar upload failed");
    }
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res.status(200).json(
        new ApiResponse(200, {}, "Avatar updated successfully")
    )
})

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.files?.coverImage?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage is missing");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(500, "CoverImage upload failed");
    }
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, {}, "CoverImage updated successfully")
    )
})






export { 
    registerUser ,
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshAccessToken,
    changePassword,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
};