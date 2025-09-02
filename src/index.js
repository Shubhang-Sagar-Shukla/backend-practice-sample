import mongoose from "mongoose";
import{DB_NAME} from "./constants.js";
import express from "express";
import connectDB from "./db/index2.js";
import {app} from './app.js'

//const app= express();

connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Server is listening at PORT ${process.env.PORT||8000}`);
    })    
})
.catch((err)=>{
    console.log("DB Connection Error : ",err);
})














/*
(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`)
        app.on("Error",(error)=>{
            console.log("ERR : ",error);
            throw error;
        },
        app.listen(process.env.PORT,()=>{
            console.log(`Server is listening at PORT ${process.env.PORT}`);
        })
    )
    }
    catch(error){
        console.log("DB Connection Error : ",error);
    }
})
    */