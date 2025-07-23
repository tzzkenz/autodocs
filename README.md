# 📄 autodoc-cli-tool

A lightweight CLI tool to automatically generate API documentation from your Express.js or Flask server files.  
Supports recursive directory parsing, configurable language support, and flexible usage via command-line or JSON config file.

---

## 🚀 Features

- 📦 Works with both **Express.js** and **Flask**
- 🗂️ Supports parsing **single files** or entire directories
- ⚙️ Now supports **JSON config files** (`autodocs.config.json`)
- 📄 Outputs clean markdown-style documentation to the console (or extendable to write to files!)

---

## 📥 Installation

```bash
npm install -g autodoc-cli-tool
```

---

## ⚙️ Usage

### 1. Using Command-Line Options

```bash
autodocs -f ./server.js --lang js
autodocs -f ./api.py --lang py
```

### 2. Using a Config File (`autodocs.config.json`)

Create a file named `autodocs.config.json` in your project root:

```json
{
  "file": "./src",
  "lang": "js"
}
```

Then run:

```bash
autodoc-cli-tool
```

CLI options (if passed) will override values in the config file.

---

## 📝 Example Output

Running on this Express.js snippet:

```js
app.get("/api/users", (req, res) => {
  // Get all users
  res.json(users);
});
```

Would output:

```md
### GET /api/users

Get all users
```

---

## 📂 Supported Languages

- ✅ JavaScript (Express.js)
- ✅ Python (Flask)

Support for more frameworks/languages coming soon!

---

## 🧩 Planned Features

- [ ] Output to markdown files
- [ ] Swagger/OpenAPI generation
- [ ] Route grouping by file/module
- [ ] YAML/TOML config support
- [ ] File output directory control

---

## 🛠️ Development

```bash
git clone https://github.com/tzzkenz/autodocs.git
cd autodocs
npm install
npm link
```

---

## 📃 License

MIT

---

## 💬 Feedback or Contributions

Issues and pull requests are welcome! Help improve the project and make it more useful for the community.
