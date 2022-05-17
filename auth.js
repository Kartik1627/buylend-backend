const express = require("express");
const bodyparser = require("body-parser");
const { sendMail } = require("./Functions/sendMail");
const { getOTP } = require("./Functions/getOTP");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const { addUser, verifyUser } = require("./Model/Users");
const app = express();

app.use(cookie());

// body parser middleware
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

app.post("/verify-email", function (req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Invalid access" });
  const otp = getOTP();
  const hashedOTP = jwt.sign({ otp }, "123456789");
  const mail = sendMail(email, otp);
  if (!mail) return res.status(500).json({ error: "Cannot send email" });
  res.cookie("hash", hashedOTP, { httpOnly: true, maxAge: 5 * 60 * 1000 });
  res.status(201).json({ success: true });
});

app.post("/verify-otp", (req, res) => {
  try {
    const { enteredOTP } = req.body;
    const hashedOTP = req.cookies.hash;
    if (!hashedOTP)
      return res.status(404).json({ error: "Please regenerate OTP" });
    const decode = jwt.verify(hashedOTP, "123456789");
    const { otp } = decode;
    if (!otp || !enteredOTP)
      return res.status(400).json({ error: "Invalid access" });
    if (enteredOTP == otp) {
      res.cookie("hash", "");
      return res.status(201).json({ success: true });
    }

    res.status(404).json({ error: "Invalid OTP" });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/sign-up", async (req, res) => {
  try {
    const { name, email, password, phone_number, address } = req.body;
    if (!name || !email || !password || !phone_number || !address)
      return res.status(400).json({ error: "invalid access" });

    const { user, error } = await addUser(
      name,
      email,
      password,
      phone_number,
      address
    );

    if (error) {
      return res.status(404).json({ error });
    }

    if (user) return res.status(201).json({ success: true, token: user.token });
    res.status(404).json({ error: "sign up failed" });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "invalid access" });

    const { user, error } = await verifyUser(email, password);

    if (error) {
      return res.status(404).json({ error });
    }

    if (user) return res.status(201).json({ success: true, token: user.token });
    res.status(404).json({ error: "sign up failed" });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`app is live at ${PORT}`);
});