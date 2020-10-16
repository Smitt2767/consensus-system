const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
    },
    gender : {
        type : String,
        trim : true,
        default : ''
    },
    role : {
        type : String,
        default : 'editor'
    },
    job_type : {
        type : String,
        trim : true,
        default : ''
    },
    job_title : {
        type : String,
        trim : true,
        default : ''
    },
    ph_no : {
        type : String,
        trim : true,
        default : ''
    },
    image : {
        type : Buffer,
    },
    email : {
        type : String,
        required : true,
        unique : true,
        trim : true
    },
    password : {
        type : String,
        required : true,
        trim : true,
        minlength : 4
    },
    resetToken : String,
    resetTokenExp : Date
}, 
{
    timestamps : true
})


userSchema.virtual('polls', {
    ref : 'Poll',
    localField : '_id',
    foreignField : 'owner',
})

userSchema.statics.changePassword = async (old_password, new_password1, id) => {
    const user = await User.findById(id)

    const isMatch = await bcrypt.compare(old_password, user.password)
    if(!isMatch) {
        throw 'Invalid old password'
    }
    user.password = new_password1
    await user.save()

    return

}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({email})
    if(!user) {
        throw 'Invalid email or password'
    }
    const isMatch = await bcrypt.compare(password, user.password)

    if(!isMatch) {
        throw 'Invalid email or password'
    }

    return user
}

userSchema.pre('save', async function(next) {
    const user = this

    if(user.isModified('password')) {
        user.password = await bcrypt.hash(user.password , 8)
    }
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User