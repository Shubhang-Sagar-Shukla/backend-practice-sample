import asyncHandler from "../utils/asyncHandler";
import {User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";

// _ is used to indicate that we are not using that parameter
const verifyJWT= asyncHandler(async(req,_,next)=>{
     
try {
        // because of cookie-parser we have access to req.cookies and the || is for the case of using headers for token(in case of mobile apps), we get the token from the Authorization header like : Bearer <token> so we need to replace Bearer with empty string to get the actual token part only
        const token = req.cookies?.accessToken|| req.headers?.("Authorization")?.replace("Bearer ","");
    
        if(!token){
           throw new ApiError(401,"Unauthorized, token not found");
        }
        
        const decodedToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshTokens");
        if(!user){
          throw new ApiError(401,"Invalid access token")
        }
             req.user = user 
             next()
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid access tokens")
}

    })

export {verifyJWT};