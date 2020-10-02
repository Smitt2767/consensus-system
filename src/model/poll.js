const mongoose = require('mongoose')

const PollSchema = new mongoose.Schema({
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true,
    },
    ownerName : {
        type : String,
        required : true,
    },
    usersToAllowedVote : [{
        _id : false,
        email : {
            type : String,
            required : true,
        },
        isVoted : {
            type : Boolean,
            default : false
        }
    }],
    mode : {
        type : String,
        required : true,
        trim : true
    },
    pollQuestion : {
        type : String,
        required : true,
    },
    options : [{
        _id : false,
        answer : {
            type : String,
            required : true,
        },
        countOfThatAnswer : {
            type : Number,
            default : 0
        }
    }],
    startAt : {
        type : Date,
        required : true
    },
    endAt : {
        type : Date,
        required : true
    }
}, 
{
    timestamps : true
})

const Poll = mongoose.model('Poll', PollSchema)

module.exports = Poll