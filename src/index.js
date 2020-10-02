const path = require('path')

const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const flash = require('connect-flash')
const MongodbStore = require('connect-mongodb-session')(session)
require('./db/mongoose.js')
const User = require('./model/user')
const ContactUs = require('./model/contactUs')
const { isAuth, alreadyAuth } = require('./middleware/auth')


// csrf
const csrf = require('csurf')

const userRoute = require('./routes/user')
const pollRoute = require('./routes/poll')

const app = express()
const viewsDir = path.join(__dirname, 'views')
// csrf
const csrfProtection = csrf()
const publicDir = path.join(__dirname, 'public')
app.use(express.static(publicDir))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended : true }))

app.use(flash())
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    store : new MongodbStore({
        uri : process.env.MONGODB_URL,
        collection : 'sessions',
    }),
    saveUninitialized : false
}))
// csrf
app.use(csrfProtection)

app.use(async (req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedin
    res.locals.error = req.flash('error')
    res.locals.success = req.flash('success')
    res.locals.modal_error = req.flash('modal_error')
    res.locals.modal_success = req.flash('modal_success')
    // csrf
    res.locals.csrfToken = req.csrfToken()
    // res.locals.csrfToken = 0
    if(req.session.userId){
        const user = await User.findById(req.session.userId).select('-password -createdAt -updatedAt -__v')
        if(user) {
            req.user = user
            res.locals.user = user
        }
    }
    next()
})

app.set('views', viewsDir)
app.set('view engine', 'ejs')

app.use('/user',userRoute)
app.use(pollRoute)


app.get('', alreadyAuth, (req, res) => {
    res.render('index', {
        currentRoute : 'index'
    })
})

app.get('/signup', alreadyAuth, (req, res) => {
    res.render('signup', {
        currentRoute : 'signup'
    })
})

app.post('/contactUs', async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;
    const message = req.body.message;

    if(!username || !email || !message) {
        req.flash('modal_error', 'please specifies all the field')
        return res.redirect('back')
    }

    const user = await User.findOne({email})
    if(!user){
        req.flash('modal_error', 'Invalid user')
        return res.redirect('back')
    }
    const contact = new ContactUs({
        username,
        email,
        message
    })
    await contact.save()

    req.flash('modal_success', 'Your feedback is conserned')
    res.redirect('back')
})

app.listen(process.env.PORT, console.log("Server is running on port ", process.env.PORT))