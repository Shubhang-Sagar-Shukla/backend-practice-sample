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


router.route("/login").post(verifyJWT, loginUser)
router.route("/logout").post(verifyJWT, logoutUser)


router.route("/refresh-token").post(refreshAccessToken)


router.route("/change-password").post(verifyJWT, changeCurrentPassword)


router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)


router.route()


export default router