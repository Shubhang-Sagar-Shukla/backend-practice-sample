import { Router } from 'express'
import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

// post ke baad middleware lagana hai ,registerUser se pehle toh its done like this 
//upload.fields([])  // this is a middleware from multer to handle multiple files upload
router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1 // maxCount means how many files of this type we are expecting
    },
    {
        name: "coverImage",
        maxCount: 1
    }


]), registerUser)


router.route("/login").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)



export default router