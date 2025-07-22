const fs = require("fs");
const path = require("path");

function generateDocs(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const routeRegex = /app\.(get|post|put|delete)\(['"`](.*?)['"`],/g;

  let result = "# API Documentation\n\n";

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[2];
    result += `## ${method} ${route}\n\n`;
    result += `**Description**: _Add description here._\n\n`;
    result += `**Parameters**: \n\n- \`param1\`: type\n\n`;
    result += `**Response**: \n\n\`\`\`json\n{\n  "status": "success"\n}\n\`\`\`\n\n`;
  }

  fs.writeFileSync(path.join(__dirname, "../output/api-docs.md"), result);
  console.log("Documentation generated at /output/api-docs.md");
}

module.exports = { generateDocs };
