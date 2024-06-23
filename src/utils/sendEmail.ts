import nodemailer from "nodemailer";

export const sendEmail = async (
  email: string,
  subject: string,
  html?: string
) => {
  try {
    // const transporter = nodemailer.createTransport({
    //   host: 'live.smtp.mailtrap.io',
    //   auth: {
    //     user: process.env.SMTP_USERNAME,
    //     pass: process.env.SMTP_PASSWORD,
    //   },
    // })
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false, // use SSL
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USERNAME,
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.log(error);
  }
};
