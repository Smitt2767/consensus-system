const ApiKey = process.env.SENDGRID_API_KEY;
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(ApiKey)

const resetPass = (email, token) => {
    const msg = {
        to : email,
        from : 'smitvekariya2767@gmail.com',
        subject : 'Consensus-System-App Paasword Reset',
        html : `<h5>You requested a password reset.</h5>
                <p>Click this <a href="${process.env.MY_SITE_URL}/user/reset_password/${token}">Paasword reset link</a></p>
        `
    }
    sgMail.send(msg);
}

module.exports = {
    resetPass
}