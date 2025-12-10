import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://taskmanager.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transpoter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.taskmanager@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transpoter.sendMail(mail);
  } catch (error) {
    console.error("Email service Failed. Check mailtrap ENV");
    console.error("Error", error);
  }
};

const emailVarificationMailgenContent = (username, varificationUrl) => {
  return {
    body: {
      name: username,
      intro: "welcome to our app",
      action: {
        instruction: "to Verify your email, Please click on the button below",
        button: {
          color: "#1aae5aff",
          text: "Verify your email",
          link: varificationUrl,
        },
      },
      outro: "Need help or have Questions? Just reply to this email",
    },
  };
};

const forgetPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "welcome to our app",
      action: {
        instruction: "to Reset your password, Please click on the button below",
        button: {
          color: "#1aae5a",
          text: "Verify your email",
          link: passwordResetUrl,
        },
      },
      outro: "Need help or have Questions? Just reply to this email",
    },
  };
};

export {sendEmail, forgetPasswordMailgenContent, emailVarificationMailgenContent };
