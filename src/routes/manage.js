const express = require("express");
const moment = require("moment");
const router = express.Router();
const User = require("../model/user");
const Polls = require("../model/poll");
const Contacts = require("../model/contactUs");

// Users
router.get("/users", async (req, res) => {
  const users = await User.find({
    role: {
      $ne: "admin",
    },
  })
    .select("-password -createdAt -updatedAt")
    .sort("username");

  res.render("manageUsers", {
    currentRoute: "manage",
    users,
  });
});

router.post("/user/delete/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    req.flash("error", "No user found");
    return res.redirect("back");
  }

  req.flash("success", "user deleted successfully");
  res.redirect("back");
});

router.post("/user/update/:id", async (req, res) => {
  const role = req.body.role;

  const user = await User.findByIdAndUpdate(req.params.id, {
    role,
  });
  if (!user) {
    req.flash("error", "No user found");
    return res.redirect("back");
  }
  req.flash("success", "user role updated successfully");
  res.redirect("back");
});

// polls
router.get("/polls", async (req, res) => {
  const polls = await Polls.find()
    .select("-createdAt -updatedAt")
    .sort("-createdAt");

  res.render("managePolls", {
    currentRoute: "manage",
    polls,
    moment,
  });
});

router.post("/poll/delete/:id", async (req, res) => {
  const poll = await Polls.findByIdAndDelete(req.params.id);
  if (!poll) {
    req.flash("error", "No poll found");
    return res.redirect("back");
  }
  req.flash("success", "poll deleted successfully");
  res.redirect("back");
});

// Feedback
router.get("/feedbacks", async (req, res) => {
  const contacts = await Contacts.find().sort("-createdAt");

  res.render("manageFeedbacks", {
    currentRoute: "manage",
    contacts,
  });
});

module.exports = router;
