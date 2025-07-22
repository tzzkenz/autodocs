const express = require("express");
const app = express();

app.get("/users", (req, res) => {
  res.send("Users");
});

app.post("/login", (req, res) => {
  res.send("Login");
});
