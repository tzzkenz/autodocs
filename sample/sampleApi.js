// This route gets all users
app.get("/users", (req, res) => {
  res.send("All users");
});

/*
  Creates a new user in the DB
  Requires name and email
*/
app.post("/users", (req, res) => {
  res.send("User created");
});

app.delete("/users/:id", (req, res) => {
  res.send("User deleted");
});
