const sequelize=require("./DB/DBconnect.js");
const{dataTypes}=require('sequelize')

const signup =sequelize.define("signup",{
    id :{
        type:dataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    name:{
        type:dataTypes.STRING(100),
        allowNull:false

    },
    email:{
        type:dataTypes.STRING(100),
        unique:true,
        allowNull:false
    },
    password:{
        type:dataTypes.STRING(100), 
        allowNull:false

    },
    confirm_password:{
        type:dataTypes.STRING(100),
        allowNull:false
    },
    phone:{
        type:dataTypes.STRING(10),
        allowNull:false

    }, 
     
    type:{
        type:dataTypes.STRING(10),
        allowNull:false
    },
    user_id:{
        type:dataTypes.INTEGER,
        allowNull:false
    },




})
module.exports=signup;