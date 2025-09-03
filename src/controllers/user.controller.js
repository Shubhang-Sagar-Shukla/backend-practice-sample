import asyncHandler from '../utils/asyncHandler.js'
import { ApiError} from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import {apiResponse} from '../utils/apiResponse.js'




//get user details from frontend 
//validate user details - also check if something is not left empty
//check if user already exists:username or email
//upload them to cloudinary,
//create user object - create entry in db
//remove password and refresh token field from response
// check for user creation
// return res



const registerUser = asyncHandler(async (req, res) => {


    // if the data is coming from forms or in json format we can find it using req.body

    
    //getting user details from frontend
    // ?(optional chaining operator) - This operator is used to safely access properties or call functions without throwing an error if something is null or undefined.

    const {username,email,fullName,password}=req.body
    console.log("email : ",email)

    if ([fullName,username,email,password].some((field)=>field?.trim()==="")) {
        throw new ApiError(400,"All fields are required")
        }


   // checking if user already exists
   const existedUser= User.findOne({
    $or:[{username},{email}]
   })

   if(existedUser){
    throw new ApiError(409,"User already exists with this username or email")
   }

 //  upload them to cloudinary,
  
 //avatar 0 because we need the first property which may or may not(thats why ?) provide the path
  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path

  if(!avatarLocalpath){
    throw new ApiError(400,"Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  
  if(!avatar){
    throw new ApiError(400,"Avatar file is required")
  }


  //create user object - create entry in db
   
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url,
    username:username.toLowerCase(),
    email,
    password
   })

//select is used to select fields , by default all fields are selected to we use - to remove fields
   const createdUser= await User.findById(user._id).select("-password -refreshTokens")

   if(!createdUser){
    throw new ApiError(500,"User not created due to some internal error")
   }

    // return res
    return res.status(201).json(
        new apiResponse(200,createdUser,"User created successfully")
    )
  })




export default registerUser;