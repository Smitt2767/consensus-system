const express = require('express')
const Pusher = require('pusher')
const Poll = require('../model/poll')
const User = require('../model/user')
const { isAuth, isAllowedToCreate } =require('../middleware/auth')
const router = express.Router()

var pusher = new Pusher({
    appId: '1068245',
    key: process.env.APP_KEY,
    secret: process.env.APP_SECRET,
    cluster: 'ap2',
});

const POLLS_PER_PAGE = 5;

router.get('/home', isAuth, async (req, res) => {
    const page = +req.query.page || 1 ;
    const mode = req.query.mode
    let polls
    
    let totalPolls = 0;
    
    if(mode === 'private' || mode === 'public') {
        totalPolls = await Poll.find({ mode }).countDocuments().where('endAt').gt(new Date())
        
        polls = await Poll.find({ mode }).select('-owner -createdAt -updatedAt -__v').sort('-createdAt').where('endAt').gt(new Date())
        .skip((page - 1) * POLLS_PER_PAGE)
        .limit(POLLS_PER_PAGE)

        return res.render('home',{
            currentRoute : 'home',
            polls,
            page,
            hasNext : page * POLLS_PER_PAGE < totalPolls,
            hasPrevious : page > 1,
            mode
        })
    }
    if(mode === 'eligible') {
        totalPolls = await Poll.find({
            $or : [
                { mode : 'public' },
                { 'usersToAllowedVote.email' : req.user.email }
            ]
        }).countDocuments().where('endAt').gt(new Date())
        
        polls = await Poll.find({
            $or : [
                { mode : 'public' },
                { 'usersToAllowedVote.email' : req.user.email }
            ]
        }).select('-owner -createdAt -updatedAt -__v')
        .sort('-createdAt').where('endAt').gt(new Date())
        .skip((page - 1) * POLLS_PER_PAGE)
        .limit(POLLS_PER_PAGE)
        
        return res.render('home',{
            currentRoute : 'home',
            polls,
            page,
            hasNext : page * POLLS_PER_PAGE < totalPolls,
            hasPrevious : page > 1,
            mode
        })
    }
    if(mode === 'completed') {
        totalPolls = await Poll.find().countDocuments().where('endAt').lt(new Date())
        
        polls = await Poll.find({}).where('endAt').lt(new Date()).select('-owner -createdAt -updatedAt -__v').sort('-createdAt')
        .skip((page - 1) * POLLS_PER_PAGE)
        .limit(POLLS_PER_PAGE)

        return res.render('home',{
            currentRoute : 'home',
            polls,
            page,
            hasNext : page * POLLS_PER_PAGE < totalPolls,
            hasPrevious : page > 1,
            mode
        })
    }
    totalPolls = await Poll.find().countDocuments().where('endAt').gt(new Date())
    

    polls = await Poll.find().where('endAt').gt(new Date()).select('-owner -createdAt -updatedAt -__v').sort('-createdAt')
    .skip((page - 1) * POLLS_PER_PAGE)
    .limit(POLLS_PER_PAGE)
    
    res.render('home',{
        currentRoute : 'home',
        polls,
        page,
        hasNext : page * POLLS_PER_PAGE < totalPolls,
        hasPrevious : page > 1,
        mode
    })
})

router.get('/get_poll/:id',isAuth, async (req, res) => {
    const id = req.params.id
    let isAllowedUser = false
    let isPollStarted = false
    let isPollEnded = false
    let poll = await Poll.findById(id).select('-createdAt -updatedAt -__v')

    if(Date.now() > poll.startAt.getTime()) {
        isPollStarted = true
    }
    if(Date.now() > poll.endAt.getTime()) {
        isPollEnded = true
    }
    
    const mode = poll.mode
    let user
    if(mode === 'public') {
        user = poll.usersToAllowedVote.find(user => user.email === req.user.email)
        if(!user) {
            poll.usersToAllowedVote = [ ...poll.usersToAllowedVote, { email : req.user.email} ]
            await poll.save()
            poll = await Poll.findById(id)
        }
    }

    user = poll.usersToAllowedVote.find(user => user.email === req.user.email)

    isAllowedUser = user ? true : false
    const isVoted = user ? user.isVoted : false
    const dataPoints = []

    poll.options.forEach(option => {
        dataPoints.push({
            label : option.answer,
            y : option.countOfThatAnswer
        })
    })

    res.render('poll', {
        currentRoute : 'home',
        pollID : poll._id,
        pollQuestion : poll.pollQuestion,
        options : poll.options,
        owner : poll.ownerName,
        isAllowedUser,
        isVoted,
        dataPoints,
        isPollStarted,
        isPollEnded,
        endAt : poll.endAt,
        startAt : poll.startAt,
    })
})

router.get('/get_polls/me', isAuth, async (req, res) => {
    
    await req.user.populate('polls').execPopulate()
    const polls = req.user.polls
    if(!polls) {
        return res.send("You haven't crated any poll yet..")
    }
    res.render('my_polls', {
        currentRoute : 'get_polls_me',
        polls
    })
})

router.get('/create_poll', isAuth, isAllowedToCreate, async (req, res) => {

    try {
        const users = await User.find().select('username email -_id')
        res.render('createPoll', {
            currentRoute : 'create_poll',
            users
        })
    }catch(e) {
        res.redirect('/home')
    }
})

router.post('/create_poll', isAuth, async (req, res) => {
    const owner = req.user._id
    let userEmails = req.body.usersToAllowedVote
    const pollQuestion = req.body.pollQuestion.replace(/['",]/g, '')
    let answers = req.body.answers
    const mode = req.body.mode
    const start = req.body.startAt
    const end = req.body.endAt

    let options = []
    let usersToAllowedVote = []

    if(!pollQuestion) {
        req.flash('error', 'You must have to enter question')
        return res.redirect('back')
    }
    if(!start || !end) {
        req.flash('error', 'Please select starting and ending date')
        return res.redirect('back')
    }
    const startAt = new Date(start.replace(' ', 'T'))
    const endAt = new Date(end.replace(' ', 'T'))

    if(startAt.getTime() > endAt.getTime() || Date.now() > startAt.getTime()) {
        req.flash('error', 'Invalid time configuration')
        return res.redirect('back')
    }

    if(typeof answers === 'string' || !answers) {
        req.flash('error', 'Please add more then one options to continue')
        return res.redirect('back')
    }
    answers = answers.filter(el => el != '')
    if(answers.length < 2) {
        req.flash('error', 'Please add more then one options to continue')
        return res.redirect('back')
    }
    answers.forEach(answer => {
            options.push({
                answer
            })
    })
    if(mode !== 'private' && mode !== 'public')  {
        req.flash('error', 'invalid form')
        return res.redirect('back')
    }
    if(mode === 'private') {
        if(!userEmails || typeof userEmails === 'string') {
            req.flash('error', 'Select more then one users to vote in this poll')
            return res.redirect('back')
        }
        userEmails.forEach(userEmail => {
            usersToAllowedVote.push({
                email : userEmail
            })
        })
    }
    if(mode === 'public') {
        usersToAllowedVote = await User.find().select('email -_id')
    }
    const poll = await new Poll({
        owner,
        ownerName : req.user.username ,
        mode,
        usersToAllowedVote,
        pollQuestion,
        options,
        startAt,
        endAt
    })
    await poll.save()

    req.flash('success', 'Your Poll is created successfully, check My Polls page')
    res.redirect('back')
})

router.post('/vote/:id', isAuth, async (req, res) => {
    const id = req.params.id
    const answer = req.body.answer

    let poll = await Poll.findById(id)
    if(!poll) {
        req.flash('error', 'invalid request')
        return res.redirect('back')
    }
    

    if(Date.now() < poll.startAt.getTime()) {
        req.flash('error', 'Poll is not started yet')
        return res.redirect('back')
    }
    if(Date.now() > poll.endAt.getTime()) {
        req.flash('error', 'Poll is ended already')
        return res.redirect('back')
    }
    
    let user = poll.usersToAllowedVote.find(user => user.email === req.user.email)

    if(!user) {
        // if(mode === 'public') {
        //     poll.usersToAllowedVote = [ ...poll.usersToAllowedVote, { email : req.user.email} ]
        //     await poll.save()
        //     poll = await Poll.findById(id)
        // }
        req.flash('error', 'You are not allowed to vote in this poll')
        return res.redirect('back')
    }

    if(!req.body.answer) {
        req.flash('error', 'select atleast one option..')
        return res.redirect('back')
    }
    if(!user.isVoted) {
        const newOptions = poll.options.map(option => {
            if(option.answer === answer) {
                option.countOfThatAnswer = option.countOfThatAnswer + 1
            }
            return option
        })

        const newUsersToAllowedVote = poll.usersToAllowedVote.map(user => {
            if(user.email === req.user.email) {
                user.isVoted = true
            }
            return user
        })

        poll.options = newOptions
        poll.usersToAllowedVote = newUsersToAllowedVote

        await poll.save()

        const dataPoints = []
        poll.options.forEach(option => {
            dataPoints.push({
                label : option.answer,
                y : option.countOfThatAnswer,
            })
        })

        pusher.trigger('poll', 'vote', {
            dataPoints
        }); 
    }
    else {
        req.flash('error', 'You have voted already for this poll')
        return res.redirect('back')
    }
    req.flash('success', 'Thankyou for your vote')
    res.redirect('back')
})


module.exports = router