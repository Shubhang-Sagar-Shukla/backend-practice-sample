import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";
import "dotenv/config";


const connectDB=async()=>{
    try{
        const  connectionInstance=await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`);
        console.log(`\n MONGODB CONNECTED !!! DB HOST : ${connectionInstance.connection.host}`);
     //connection instance is an object which contains the connection details like host, port, db name etc.    

    }
    catch(error){
        console.log("DB Connection Error : ",error);
        process.exit(1);
    }

}


export default connectDB;