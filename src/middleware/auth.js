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

const isAdmin = (req, res, next) => {
    if(req.user.role !== 'admin') {
        req.flash('error', 'Only admin have a permission for that page')
        return res.redirect('/home')
    }
    next()
}
const isAllowedToCreate = (req, res, next) => {
    if(req.user.role !== 'admin' && req.user.role !== 'editor') {
        req.flash('error', 'You are note allowed user to create poll')
        return res.redirect('/home')
    }
    next()
}

module.exports = {
    isAuth,
    alreadyAuth,
    isAdmin,
    isAllowedToCreate
}