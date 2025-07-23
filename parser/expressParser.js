const fs = require("fs");
const path = require("path");

// Helper function to extract comment above a line
function extractComment(lines, index) {
  const prevLine = lines[index - 1]?.trim();

  // Single-line comment
  if (prevLine?.startsWith("//")) {
    return prevLine.replace("//", "").trim();
  }

  if (prevLine?.endsWith("*/")) {
    const commentLines = [];
    let j = index - 1;

    while (j >= 0 && !lines[j].includes("/*")) {
      commentLines.unshift(lines[j].trim());
      j--;
    }

    if (j >= 0) {
      commentLines.unshift(lines[j].trim()); // Add /* line

      return commentLines
        .join(" ")
        .replace(/\/\*|\*\//g, "") // remove /* and */
        .replace(/\*/g, "") // remove leading *
        .trim();
    }
  }

  return "No description provided.";
}

function generateDocs(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const routeRegex = /app\.(get|post|put|delete)\((['"`])(.*?)\2,/;

  let result = "# API Documentation\n\n";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(routeRegex);

    if (match) {
      const method = match[1].toUpperCase();
      const routePath = match[3];
      const description = extractComment(lines, i);

      result += `## ${method} ${routePath}\n`;
      result += `**Description:** ${description}
      \n\n`;
      result += `**Parameters**: \n\n- \`param1\`: type\n\n`;
      result += `**Response**: \n\n\`\`\`json\n{\n  "status": "success"\n}\n\`\`\`\n\n`;
    }
  }

  const outputDir = path.join(__dirname, "../output");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "api-docs.md");
  fs.writeFileSync(outputPath, result);
  console.log(`Flask docs generated at ${outputPath}`);
}

module.exports = { generateDocs };
