import asyncHandler from '../utils/asyncHandler.js'
import { ApiError} from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../cloudinary.js'
import {apiResponse} from '../utils/apiResponse.js'




//get user details from frontend 
//validate user details - also check if something is not left empty
//check if user already exists:username or email
//upload them to cloudinary,
//create user object - create entry in db
//remove password and refresh token field from response
// check for user creation
// return res


const generateAccessAndRefreshTokens=async(userId)=>{
  try {
       
    const user= await User.findById(userId)
    const accessToken= await user.generateAccessToken()
    const refreshToken= await user.generateRefreshToken()

    user.refreshTokens= refreshToken

    await user.save({validateBeforeSave:false})

    return{accessToken,refreshToken}

    
  } catch (error) {
    
    throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  
  
  // if the data is coming from forms or in json format we can find it using req.body
  
  
  //getting user details from frontend
  // ?(optional chaining operator) - This operator is used to safely access properties or call functions without throwing an error if something is null or undefined.
  
  const {username,email,fullName,password}=req.body
  console.log("email : ",email)
  
  
  /* .some() tests each element of an array against a condition (callback function).
  It returns:
  true → if at least one element in the array passes the condition.
  false → if no element passes the condition.*/
  
  if ([fullName,username,email,password].some((field)=>field?.trim()==="")) {
    throw new ApiError(400,"All fields are required")
  }
  
  
  // checking if user already exists
  const existedUser= await User.findOne({
    $or:[{username},{email}]
  })
  
  if(existedUser){
    throw new ApiError(409,"User already exists with this username or email")
  }
  
  //  upload them to cloudinary,
  
  //avatar 0 because we need the first property which may or may not  (thats why ?) provide the path
  const avatarLocalPath = req.files?.avatar[0]?.path
 

 /* for coverImage :
 is method se agar cover image nhi ayi to error aa jayega, kyuki kahi per bhi check nhi kar rahe ki cover image hai ya nhi , but in case of avatar we were checking for avatar(ahead)
 
 const coverImageLocalPath = req.files?.coverImage[0]?.path
 
 */

let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
  coverImageLocalPath = req.files.coverImage[0].path;
}

if(!avatarLocalPath){
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
  username,
  email,
  password
})

//remove password and refresh token field from response

//select is used to select fields , by default all fields are selected to we use - to remove fields
const createdUser= await User.findById(user._id).select("-password -refreshTokens")



// check for user creation
if(!createdUser){
    throw new ApiError(500,"User not created due to some internal error")
   }

    // return res
    return res.status(201).json(
        new apiResponse(200,createdUser,"User created successfully")
    )
  })

const loginUser=asyncHandler(async(req,res)=>{
  // req.body --> data
  // get username or email
  // find the user 
  // password check 
  // send cookie
  
  const {email,username,password} = req.body
  
  if( !email|| !username){
    throw new ApiError(400,"Email or username is required")
  }
  
  // find the user 
  const user = await User.findOne({
    $or:[{email},{username}]
  })
  
  // password check 
  const isPasswordValid= await user.isPasswordCorrect(password)
  if(!isPasswordValid){
    throw new ApiError(401,"Invalid credentials")
  }

  const{accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
  
  const loggedInUser= await User.findById(user._id).select("-password -refreshTokens")

   const cookieOptions={
    httpOnly:true,
    secure: true
   }
   return res
   .status(200)
   .cookie("refreshToken",refreshToken,cookieOptions)
    .cookie("accessToken",accessToken,cookieOptions)
    .json(
      new apiResponse(200,{
        user:loggedInUser,
        accessToken,
        refreshToken
      },
      "User logged in successfully")
    )
   
})
  

const logoutUser= asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
    {
      new:true
    }

  )
   
  const cookieOptions={
    httpOnly:true,
    secure:true,
  } 
  return res
  .status(200)
  .clearCookie("accessToken",cookieOptions)
  .clearCookie("refreshToken",cookieOptions)
  .json(new apiResponse(200,{},"User logged out successfully"))
})

export {registerUser,
  loginUser,
logoutUser} ;