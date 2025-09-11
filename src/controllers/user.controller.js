import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../cloudinary.js'
import { apiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'




//get user details from frontend 
//validate user details - also check if something is not left empty
//check if user already exists:username or email
//upload them to cloudinary,
//create user object - create entry in db
//remove password and refresh token field from response
// check for user creation
// return res


const generateAccessAndRefreshTokens = async (userId) => {
  try {

    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshTokens = refreshToken

    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }


  } catch (error) {

    throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
  }
}

const registerUser = asyncHandler(async (req, res) => {


  // if the data is coming from forms or in json format we can find it using req.body


  //getting user details from frontend
  // ?(optional chaining operator) - This operator is used to safely access properties or call functions without throwing an error if something is null or undefined.

  const { username, email, fullName, password } = req.body
  console.log("email : ", email)


  /* .some() tests each element of an array against a condition (callback function).
  It returns:
  true → if at least one element in the array passes the condition.
  false → if no element passes the condition.*/

  if ([fullName, username, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }


  // checking if user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User already exists with this username or email")
  }

  //  upload them to cloudinary,

  //avatar 0 because we need the first property which may or may not  (thats why ?) provide the path
  const avatarLocalPath = req.files?.avatar[0]?.path


  /* for coverImage :
  is method se agar cover image nhi ayi to error aa jayega, kyuki kahi per bhi check nhi kar rahe ki cover image hai ya nhi , but in case of avatar we were checking for avatar(ahead)
  
  const coverImageLocalPath = req.files?.coverImage[0]?.path
  
  */

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
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
  const createdUser = await User.findById(user._id).select("-password -refreshTokens")



  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "User not created due to some internal error")
  }

  // return res
  return res.status(201).json(
    new apiResponse(200, createdUser, "User created successfully")
  )
})

const loginUser = asyncHandler(async (req, res) => {
  // req.body --> data
  // get username or email
  // find the user 
  // password check 
  // send cookie

  const { email, username, password } = req.body

  if (!(email || username)) {
    throw new ApiError(400, "Email or username is required")
  }

  // find the user 
  const user = await User.findOne({
    $or: [{ email }, { username }]
  })

  // password check 
  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshTokens")

  const cookieOptions = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new apiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
      },
        "User logged in successfully")
    )

})


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }

  )

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new apiResponse(200, {}, "User logged out successfully"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {

  try {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid refresh token")

    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")
    }

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new apiResponse(200, {
          accessToken,
          refreshToken: newRefreshToken
        }, "Access token refreshed ")
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {

  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?.id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect password")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"))

})


const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {

  const { username, fullName } = req.body
  if (!username || !fullName) {
    throw new ApiError(400, "All fields  are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username,
        email, fullName
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(new apiResponse(200,user,"Account details updated successfully"))

})


const updateUserAvatar = asyncHandler(async (req, res) => {

  const avatarLocalPath = req.files?.avatar

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {

    throw new ApiError(400, "Error while uploading avatar")

  }

  const user =await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        avatar: avatar.url
      }
    },{ new:true }
  ).select("-password")

   return res
  .status(200)
  .json( new apiResponse(200,user,"Avatar updated successfully") )


})

const updateUserCoverImage = asyncHandler(async (req, res) => {

  const coverImageLocalPath = req.files?.avatar

  if (!avatarLocalPath) {
    throw new ApiError(400, "CoverImage file is required")
  }

  const avatar = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {

    throw new ApiError(400, "Error while uploading coverImage")

  }

 const user= await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        coverImage: coverImage.url
      }
    },{ new:true }
  ).select("-password")

  return res
  .status(200)
  .json( new apiResponse(200,user,"Cover image updated successfully") )

})


const getUserChannelProfile=asyncHandler(async(req,res)=>{
  
     const {username}=req.params

     if (!username?.trim()) {
      throw new ApiError(400, "Username is required")
      }
       
      //pipeline is used to perform multiple operations on the data at different stages
      // here we are using it to match the username and then lookup the subscriptions
      // to get the subscriber count and if the current user is subscribed to this channel or notz
      const channel = await User.aggregate([
       { 
        $match:{
          username:username?.toLowerCase()
        }
      },
        {
          $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
          }
        },
        {
          $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
          }
        },
        {
          $addFields:{
            subscribersCount:{
              $size:"$subscribers"
            },
            channelsIsSubscribedTo:{
              $size:"$subscribedTo"
            },
            isSubscribed:{
              $cond:{
                if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                then:true,
                else:false
              }
            }
          },
          $project:{
            fullName:1,
            username:1,
            email:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            isSubscribed:1
          }

        }
      ])
          if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory=asyncHandler(async(req,res)=>{

     const user = await User.aggregate([
      {
        $match:{
          _id: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup:{
          from:"videos",
          localField:"watchHistory",
          foreignField:"_id",
          as:"watchHistory",
          pipeline:[
            {
              $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                 {$project:{
                   fullName:1,
                  username:1,
                  avatar:1
                 }}
                ]
              }
            }
          ]
        }
      },
      //to send the owner data in form of object and not array
      {$addFields:{
        $first:"$owner"
      }}
     ])

     return res
     .status(200)
     .json(
      new ApiResponse(200,user[0]?.watchHistory, "Watch history fetched successfully")
     )
})




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
   getWatchHistory
};