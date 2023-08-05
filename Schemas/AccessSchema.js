const mongoose =require('mongoose');
const Schema = mongoose.Schema;

const AccessSchema = new Schema({
    sessionId:{
        type: String,
        require: true
    },
    time:{
        type: String,
        require: true
    }
})

module.exports = mongoose.model('access',AccessSchema);