const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
// new Email(user, url).sendWelcome();
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `luong tran<${process.env.EMAIL_FROM}>`;
  }
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Send_grid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  async send(template, subject) {
    // 1 Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };
    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes'
    );
  }
};

// const sendEmail = async (options) => {
//   // 1) Create a transporter

//   //using trapmail

//   // const transporter = nodemailer.createTransport({
//   //   host: process.env.EMAIL_HOST,
//   //   port: process.env.EMAIL_PORT,
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   // });

//   //using mail service
//   // let transporter = nodemailer.createTransport({
//   //   host: 'smtp.gmail.com',
//   //   port: 587,
//   //   secure: false, // true for 465, false for other ports
//   //   auth: {
//   //     user: process.env.EMAIL_APP, // generated ethereal user
//   //     pass: process.env.EMAIL_APP_PASSWORD, // generated ethereal password
//   //   },
//   // });

//   // 2) Define the email options
//   // const mailOptions = {
//   //   from: 'luong tran<tranhuuluong156200@gmail.com>',
//   //   to: options.email,
//   //   subject: options.subject,
//   //   text: options.message,
//   //   // html:
//   // };
//   // const mailOptions = {
//   //   from: '"Hữu lương 👻" <tranhuuluong156200@gmail.com>', // sender address
//   //   to: options.email, // list of receivers
//   //   subject: 'Test ✔', // Subject line
//   //   html: `<h1>${options.message}</h1>`,
//   //   // html:
//   // };

//   // 3) Actually send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
