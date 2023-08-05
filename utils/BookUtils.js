const validator = require("validator");

const validateBookDetails=({title,author,price,category})=>{
    return new Promise((resolve,reject)=>{
        if(!title || !author || !price || !category){
            reject("Please fill data in all the fields");
        }else if(typeof title !== "string"){
            reject("Invalid Title");
        }else if(typeof author !== "string"){
            reject("Invalid Author");
        }else if(!validator.isNumeric(price)){
            reject("Invalid Price");
        }else if(typeof category !== "string"){
            reject("Invalid Category");
        }
        resolve();
    })
}

module.exports = {validateBookDetails}