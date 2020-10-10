const express = require('express')

const router = express.Router()
const User = require('../model/user')


router.get('/users', async (req, res) => {

    const users = await User.find({
        role : {
            $ne : 'admin'
        }
    }).select('-password -createdAt -updatedAt')
    res.render('manageUsers', {
        currentRoute : 'manage',
        users
    })
})

router.post('/user/delete/:id', async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id)
    if(!user) {
        req.flash('error','No user found')
        return res.redirect('back')
    }

    req.flash('success','user deleted successfully')
    res.redirect('back')
})

router.post('/user/update/:id', async (req, res) => {
    
    const role = req.body.role

    const user = await User.findByIdAndUpdate(req.params.id, {
        role 
    })
    if(!user) {
        req.flash('error','No user found')
        return res.redirect('back')
    }
    req.flash('success','user role updated successfully')
    res.redirect('back')
})

router.get('/polls', (req, res) => {
    res.render('managePolls', {
        currentRoute : 'manage'
    })
})
router.get('/feedbacks', (req, res) => {
    res.render('manageFeedbacks', {
        currentRoute : 'manage'
    })
})

module.exports = router