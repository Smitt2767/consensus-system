const isAuth = (req, res, next) => {
    if(!req.session.isLoggedin) {
        return res.redirect('/')
    }
    next()
}

const alreadyAuth = (req, res, next) => {
    if(req.session.isLoggedin) {
        return res.redirect('/home')
    }
    next()
}

module.exports = {
    isAuth,
    alreadyAuth
}