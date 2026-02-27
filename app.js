/* ===============================
   ENV & CORE IMPORTS
================================ */
require("dotenv").config();
const express = require("express");
const path = require("path");
const passport = require("passport");
require("./config/passport");

/* ===============================
   DATABASE
================================ */
const connectDB = require("./config/db");

/* ===============================
   VIEW & SESSION PACKAGES
================================ */
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

/* ===============================
   APP INIT
================================ */
const app = express();

/* ===============================
   DATABASE CONNECTION
================================ */
connectDB();

/* ===============================
   MIDDLEWARES
================================ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* STATIC FILES */
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================
   SESSION CONFIG
================================ */
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

/* ===============================
   PASSPORT (MUST BE AFTER SESSION)
================================ */
app.use(passport.initialize());
app.use(passport.session());

/* ===============================
   GLOBAL USER (NAVBAR ACCESS)
================================ */
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

/* ===============================
   EJS + LAYOUT SETUP
================================ */
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

/* ===============================
   ROUTES
================================ */
const authRoutes = require("./routes/authRoutes");
const homeRoutes = require("./routes/homeRoutes");
const teamRoutes = require("./routes/teamRoutes");
const homeController = require("./controllers/homeController");
const eventRoutes = require("./routes/eventRoutes");
const reachOutRoutes = require("./routes/reachOutRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use(authRoutes);
app.use(homeRoutes);
app.use(teamRoutes);
app.use(eventRoutes);   // ✅ Your new SubEvent + Registration routes active here
app.use(reachOutRoutes);
app.use(adminRoutes);

/* HOME */
app.get("/", homeController.getHome);

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});