const express = require('express')
const { isAuth } = require('../middleware/auth')
const User = require('../model/user')
const router = express.Router()
const path = require('path')
const crypto = require('crypto')
const {resetPass} = require('../email/email')

let error = false;

router.post('/login', async (req, res) => {
    const email = req.body.email
    const password = req.body.password

    if(!email || !password) {
        req.flash('error', 'specify the email & password both')
        return res.redirect('back')
    }

    try {
        const user = await User.findByCredentials(email, password)
        req.session.userId = user._id
    }catch(e) {
        req.flash('error',e)
        return res.redirect('/')
    }
    req.session.isLoggedin = true
    res.redirect('/home')
    
})

router.post('/signup', async (req, res) => {
    const username = req.body.username
    const email = req.body.email
    const password = req.body.password
    const c_password = req.body.c_password

    if(password !== c_password){
        req.flash('error', 'Passwords does not match')
        return res.redirect('/signup')
    }
    if(password.length < 4) {
        req.flash('error', 'Minimum password length 4 required')
        return res.redirect('/signup')
    }

    try {
        const user = await User.findOne({email})
        if(user) {
            req.flash('error', 'Already registerd please login')
            return res.redirect('/signup')
        }
    }catch(e) {
        req.flash('error', 'Something went wrong')
        return res.redirect('/signup')
    }

    const createUser = async () => {
        try {
            const user = new User({username, email, password})
            await user.save()
            req.session.userId = user._id 
        }
        catch(e) {
            req.flash('error', 'Something went wrong')
            return res.redirect('/signup')
        }
        req.session.isLoggedin = true
    }
    await createUser()
    req.flash('success', 'Your Account created successfully')
    res.redirect('/home')
})

router.get('/profile', isAuth, async (req, res) => {
    let user
    try {
        user = await User.findById(req.user._id).select('-password -createdAt -updatedAt -__v')
    }catch(e) {
        return res.render('/index', {
            currentRoute : 'index'
        })
    }
    res.render('profile', {
        currentRoute : 'profile'
    })
})

router.post('/forget_password',  (req, res) => {
    
    const email = req.body.email

    crypto.randomBytes(32, async (err, buffer) => {
        if(err) {
            return res.redirect('bavk')
        }
        const token = buffer.toString('hex')
        const user = await  User.findOne({
            email
        })
        if(!user) {
            req.flash('modal_error', 'No user with '+ email +' found!')
            return res.redirect('back')
        }
        user.resetToken = token;
        user.resetTokenExp = Date.now() + 1000 * 60 * 60 * 24
        await user.save()
        resetPass(email, token)

        req.flash('modal_success', 'password reset link sent successfully to '+ email +' please check your mail inbox/spam folder!')
        res.redirect('back')
    })
})

router.get('/reset_password/:token', (req, res) => {
    const token = req.params.token

    res.render('resetPassword', {
        token
    })
})

router.post('/reset_password', async (req, res) => {
    const token = req.body.token
    const password1 = req.body.password1
    const password2 = req.body.password2

    if(!token || !password1 || !password2) {
        req.flash('error', 'all fields are required!')
        return res.redirect('back')
    }
    if(password1 !== password2) {
        req.flash('error', 'passwords does not match!')
        return res.redirect('back')
    }
    if(password1.length < 4) {
        req.flash('error', 'Minimum password length 4 required')
        return res.redirect('back')
    }

    const user = await User.findOne({
        resetToken : token,
        resetTokenExp : {
            $gt : Date.now()
        }
    })

    user.password = password1
    user.resetToken = undefined
    user.resetTokenExp = undefined

    await user.save()
    
    req.flash('success', 'password chenged successfully! Go to home page and login')
    res.redirect('back')
})

const multer = require('multer')
const sharp = require('sharp')

const upload = multer({
    fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(jpg|png|jpeg)$/)) {
            req.flash('error', 'Please upload image file only')
            error = true
            return cb()
        }
        cb(null, true)
    }
}).single('image')

router.post('/profile',isAuth, upload, async (req, res) => {

    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const gender = req.body.gender;
    const job_type = req.body.job_type;
    const job_title = req.body.job_title;
    const ph_no = req.body.ph_no;
    
    if(!first_name || !last_name || !gender || !job_title || !job_type || !ph_no ) {
        req.flash('error', 'Please fill all the inputs')
        return res.redirect('back')
    }
    
    if(ph_no.length != 10) {
        req.flash('error', 'Invalid phone number')
        return res.redirect('back')
    }
    
    var phoneno = /^\d{10}$/;
    if( !ph_no.match(phoneno) ) {
        req.flash('error', 'Invalid phone number')
        return res.redirect('back')
    }

    if(!error) {
        try {
            const user = await User.findById(req.user._id)
    
            user.username = first_name+' '+last_name
            user.gender = gender
            user.job_title = job_title
            user.job_type = job_type
            user.ph_no = ph_no

            if(req.file){
                const buffer = await sharp(req.file.buffer).resize({width : 350 , height : 350}).png().toBuffer()
                user.image = buffer
            }

            await user.save()
            
            req.flash('success', 'Profile updated successfully')
            return res.redirect('back')
    
        }catch(e) {
            req.flash('error', 'Something went wrong')
            return res.redirect('back')
        }    
    }
    
    res.redirect('back')
})

router.get('/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
        
        if(!user || !user.image) {
            res.redirect('back')
        }

        res.set('Content-Type' , 'image/png')
        res.send(user.image)

    }catch(e){
        res.redirect('back')
    }
})

router.post('/change_password',isAuth, async (req, res) => {
    const old_password = req.body.old_password
    const new_password1 = req.body.new_password1
    const new_password2 = req.body.new_password2

    if(!old_password || !new_password1 || !new_password2) {
        req.flash('error', 'Please fill all the inputs')
        return res.redirect('back')
    }
    if(new_password1 !== new_password2) {
        req.flash('error', 'Passwords does not matched')
        return res.redirect('back')
    }
    try {
        await User.changePassword(old_password, new_password1, req.user._id)
    }catch(e) {
        
        req.flash('error', e)
        return res.redirect('back')
    }
    
    req.flash('success','password change successfully')
    res.redirect('back')
})


router.post('/logout', isAuth, (req, res) => {
    req.session.destroy(() => {
        res.redirect('/')
    })
})


module.exports = router