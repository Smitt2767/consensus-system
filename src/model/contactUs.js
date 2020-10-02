const mongoose = require('mongoose')

const contactUsSchema = new mongoose.Schema({
    email : String,
    username : String,
    message : String
})
const ContactUs = mongoose.model('contactUs', contactUsSchema)

module.exports = ContactUs;