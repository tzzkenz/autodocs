const fs = require("fs");
const path = require("path");

function extractQueryParams(lines, functionStartIndex) {
  const queryParams = [];

  // Look for req.query patterns in the function body
  const reqQueryRegex = /req\.query\.(\w+)|req\.query\[['"]([^'"]+)['"]\]/g;
  const destructuringRegex = /const\s*{\s*([^}]+)\s*}\s*=\s*req\.query/g;

  // Search through the function body (next 25 lines or until next route)
  let endIndex = functionStartIndex + 1;
  while (
    endIndex < lines.length &&
    !lines[endIndex].match(/app\.(get|post|put|delete|patch)/)
  ) {
    endIndex++;
    if (endIndex - functionStartIndex > 25) break;
  }

  for (let i = functionStartIndex; i < endIndex; i++) {
    const line = lines[i];

    // Check for destructuring assignment
    let destructMatch;
    const tempDestructRegex = /const\s*{\s*([^}]+)\s*}\s*=\s*req\.query/g;
    while ((destructMatch = tempDestructRegex.exec(line)) !== null) {
      const params = destructMatch[1].split(",").map((p) => p.trim());
      params.forEach((param) => {
        // Handle default values: { page = 1, limit = 10 }
        const [name, defaultValue] = param.split("=").map((p) => p.trim());
        queryParams.push({
          name: name,
          required: false, // Destructured params with defaults are typically optional
          defaultValue: defaultValue || null,
          type: inferParamType(defaultValue),
        });
      });
    }

    // Check for direct req.query access
    let match;
    const tempRegex = /req\.query\.(\w+)|req\.query\[['"]([^'"]+)['"]\]/g;
    while ((match = tempRegex.exec(line)) !== null) {
      const paramName = match[1] || match[2];

      // Check if there's a validation that makes it required
      const isRequired =
        line.includes(`!${paramName}`) ||
        (line.includes("return") &&
          line.includes("400") &&
          line.includes(paramName));

      // Check if there's a default value assignment
      const defaultValueRegex = new RegExp(
        `(${paramName})\\s*\\|\\|\\s*([^;\\n,\\)]+)`
      );
      const defaultMatch = defaultValueRegex.exec(line);
      let defaultValue = defaultMatch ? defaultMatch[2].trim() : null;

      // Also check for === 'true' pattern which indicates boolean
      const booleanCheckRegex = new RegExp(
        `${paramName}\\s*===\\s*['"]true['"]`
      );
      if (booleanCheckRegex.test(line)) {
        defaultValue = defaultValue || "false";
      }

      if (!queryParams.find((p) => p.name === paramName)) {
        queryParams.push({
          name: paramName,
          required: isRequired && !defaultValue,
          defaultValue: defaultValue,
          type: inferParamType(defaultValue, line, paramName),
        });
      }
    }
  }

  return queryParams;
}

function extractRouteParams(routePath) {
  const params = [];
  const paramRegex = /:(\w+)/g;
  let match;

  while ((match = paramRegex.exec(routePath)) !== null) {
    params.push({
      name: match[1],
      type: "string",
      required: true,
      location: "path",
      description: `${match[1]} parameter from URL path`,
    });
  }

  return params;
}

function extractRequestBody(lines, functionStartIndex) {
  const bodyParams = [];

  // Look for req.body patterns and destructuring
  const reqBodyRegex = /req\.body\.(\w+)|req\.body\[['"]([^'"]+)['"]\]/g;
  const destructuringRegex = /const\s*{\s*([^}]+)\s*}\s*=\s*req\.body/g;

  let endIndex = functionStartIndex + 1;
  while (
    endIndex < lines.length &&
    !lines[endIndex].match(/app\.(get|post|put|delete|patch)/)
  ) {
    endIndex++;
    if (endIndex - functionStartIndex > 25) break;
  }

  for (let i = functionStartIndex; i < endIndex; i++) {
    const line = lines[i];

    // Check for destructuring assignment from req.body
    let destructMatch;
    const tempDestructRegex = /const\s*{\s*([^}]+)\s*}\s*=\s*req\.body/g;
    while ((destructMatch = tempDestructRegex.exec(line)) !== null) {
      const params = destructMatch[1].split(",").map((p) => p.trim());
      params.forEach((param) => {
        // Handle default values and renaming: { name, email, age = 18, role = 'user' }
        const [nameWithDefault, defaultValue] = param
          .split("=")
          .map((p) => p.trim());
        const name = nameWithDefault.trim();

        if (!bodyParams.find((p) => p.name === name)) {
          bodyParams.push({
            name: name,
            required: !defaultValue,
            defaultValue: defaultValue || null,
            type: inferParamType(defaultValue),
            location: "body",
          });
        }
      });
    }

    // Check for direct req.body access
    let match;
    const tempRegex = /req\.body\.(\w+)|req\.body\[['"]([^'"]+)['"]\]/g;
    while ((match = tempRegex.exec(line)) !== null) {
      const paramName = match[1] || match[2];

      // Check if parameter is validated (implies required)
      const isRequired =
        (line.includes(`!${paramName}`) ||
          (line.includes(`${paramName}`) && line.includes("required"))) &&
        !line.includes("||");

      if (!bodyParams.find((p) => p.name === paramName)) {
        bodyParams.push({
          name: paramName,
          required: isRequired,
          defaultValue: null,
          type: "string",
          location: "body",
        });
      }
    }
  }

  return bodyParams;
}

function inferParamType(defaultValue, line = "", paramName = "") {
  if (!defaultValue) {
    // If no default value, try to infer from usage in line
    if (line && paramName) {
      if (
        line.includes(`${paramName} === 'true'`) ||
        line.includes(`${paramName} === 'false'`)
      ) {
        return "boolean";
      }
      if (
        line.includes(`parseInt(${paramName})`) ||
        line.includes(`Number(${paramName})`)
      ) {
        return "integer";
      }
      if (
        line.includes(`Array.isArray(${paramName})`) ||
        line.includes(`${paramName}.length`)
      ) {
        return "array";
      }
    }
    return "string";
  }

  const cleanValue = defaultValue.replace(/['"]/g, "");

  if (/^\d+$/.test(cleanValue)) return "integer";
  if (/^\d*\.\d+$/.test(cleanValue)) return "number";
  if (cleanValue === "true" || cleanValue === "false") return "boolean";
  if (cleanValue.startsWith("[") || cleanValue.includes("Array"))
    return "array";

  return "string";
}

function parseJSDocParams(comment) {
  const params = [];

  // Look for @param tags - improved regex to handle multiline descriptions
  const paramRegex =
    /@param\s*\{([^}]+)\}\s*(\w+)(?:\s*-\s*(.+?)(?=@|\*\/|$))?/gs;
  let match;

  while ((match = paramRegex.exec(comment)) !== null) {
    params.push({
      name: match[2],
      type: match[1].toLowerCase(),
      description: match[3]
        ? match[3]
            .trim()
            .replace(/\n\s*\*/g, " ")
            .replace(/\s+/g, " ")
        : "No description",
      fromJSDoc: true,
    });
  }

  return params;
}

function extractComment(lines, index) {
  const prevLine = lines[index - 1]?.trim();

  // Single-line comment
  if (prevLine?.startsWith("//")) {
    return {
      description: prevLine.replace("//", "").trim(),
      fullComment: prevLine,
    };
  }

  // Multi-line comment - look backwards
  if (prevLine?.endsWith("*/")) {
    const commentLines = [];
    let j = index - 1;

    while (j >= 0 && !lines[j].includes("/*")) {
      commentLines.unshift(lines[j].trim());
      j--;
    }

    if (j >= 0) {
      commentLines.unshift(lines[j].trim()); // Add /* line

      const fullComment = commentLines.join("\n");

      // Extract clean description without JSDoc tags
      const description = commentLines
        .join(" ")
        .replace(/\/\*|\*\//g, "") // remove /* and */
        .replace(/\*\s*/g, "") // remove leading * with optional space
        .replace(/@param\s*\{[^}]+\}\s*\w+\s*-?\s*[^\n@]*/g, "") // remove @param lines
        .replace(/@returns?\s*\{[^}]+\}\s*[^\n@]*/g, "") // remove @returns lines
        .replace(/\s+/g, " ") // normalize whitespace
        .trim();

      return {
        description: description || "No description provided.",
        fullComment,
      };
    }
  }

  return {
    description: "No description provided.",
    fullComment: "",
  };
}

function formatParameters(queryParams, routeParams, bodyParams, jsDocParams) {
  let result = "";

  // Merge all parameters
  const allParams = new Map();

  // Add route parameters
  routeParams.forEach((param) => {
    allParams.set(`path_${param.name}`, param);
  });

  // Add query parameters
  queryParams.forEach((param) => {
    allParams.set(`query_${param.name}`, { ...param, location: "query" });
  });

  // Add body parameters
  bodyParams.forEach((param) => {
    allParams.set(`body_${param.name}`, param);
  });

  // Enhance with JSDoc information - don't create duplicates
  jsDocParams.forEach((param) => {
    // Try to match with existing params by name
    let foundMatch = false;

    for (const [key, existingParam] of allParams) {
      if (existingParam.name === param.name) {
        // Enhance existing parameter with JSDoc info
        allParams.set(key, {
          ...existingParam,
          type: param.type || existingParam.type,
          description:
            param.description && param.description !== "No description"
              ? param.description
              : existingParam.description || "No description",
        });
        foundMatch = true;
        break;
      }
    }

    // If JSDoc param doesn't match any existing param, skip it
    // (it's likely documentation that doesn't correspond to actual code)
  });

  // Group parameters by location
  const pathParams = [];
  const queryParamsFormatted = [];
  const bodyParamsFormatted = [];

  allParams.forEach((param) => {
    switch (param.location) {
      case "path":
        pathParams.push(param);
        break;
      case "query":
        queryParamsFormatted.push(param);
        break;
      case "body":
        bodyParamsFormatted.push(param);
        break;
    }
  });

  // Format path parameters
  if (pathParams.length > 0) {
    result += "**Path Parameters**:\n\n";
    pathParams.forEach((param) => {
      const requiredText = param.required ? " *(required)*" : " *(optional)*";
      const description = param.description || "No description";
      result += `- **${param.name}** (\`${param.type}\`)${requiredText}: ${description}\n`;
    });
    result += "\n";
  }

  // Format query parameters
  if (queryParamsFormatted.length > 0) {
    result += "**Query Parameters**:\n\n";
    queryParamsFormatted.forEach((param) => {
      const requiredText = param.required ? " *(required)*" : " *(optional)*";
      const defaultText = param.defaultValue
        ? ` (default: \`${param.defaultValue}\`)`
        : "";
      const description = param.description || "No description";
      result += `- **${param.name}** (\`${param.type}\`)${requiredText}${defaultText}: ${description}\n`;
    });
    result += "\n";
  }

  // Format body parameters
  if (bodyParamsFormatted.length > 0) {
    result += "**Request Body**:\n\n";
    bodyParamsFormatted.forEach((param) => {
      const requiredText = param.required ? " *(required)*" : " *(optional)*";
      const defaultText = param.defaultValue
        ? ` (default: \`${param.defaultValue}\`)`
        : "";
      const description = param.description || "No description";
      result += `- **${param.name}** (\`${param.type}\`)${requiredText}${defaultText}: ${description}\n`;
    });
    result += "\n";
  }

  return result;
}

function generateSampleRequest(method, routePath, queryParams, bodyParams) {
  let result = "**Sample Request**:\n\n";

  // Replace path parameters with sample values
  const samplePath = routePath.replace(/:(\w+)/g, (match, paramName) => {
    return `{${paramName}}`;
  });

  // Add query parameters
  let queryString = "";
  if (queryParams.length > 0) {
    const sampleQuery = queryParams
      .map((p) => {
        let sampleValue = p.defaultValue || "value";
        // Clean up quotes from default values for display
        if (
          typeof sampleValue === "string" &&
          sampleValue.startsWith('"') &&
          sampleValue.endsWith('"')
        ) {
          sampleValue = sampleValue.slice(1, -1);
        }
        if (
          typeof sampleValue === "string" &&
          sampleValue.startsWith("'") &&
          sampleValue.endsWith("'")
        ) {
          sampleValue = sampleValue.slice(1, -1);
        }
        return `${p.name}=${sampleValue}`;
      })
      .join("&");
    queryString = `?${sampleQuery}`;
  }

  result += `\`\`\`\n${method.toUpperCase()} ${samplePath}${queryString}\n`;

  // Add body for POST/PUT/PATCH requests
  if (
    ["post", "put", "patch"].includes(method.toLowerCase()) &&
    bodyParams.length > 0
  ) {
    result += "Content-Type: application/json\n\n";
    result += "{\n";
    bodyParams.forEach((param, index) => {
      const comma = index < bodyParams.length - 1 ? "," : "";
      let sampleValue;

      if (param.defaultValue) {
        sampleValue = param.defaultValue;
      } else {
        switch (param.type) {
          case "string":
            sampleValue = '"sample"';
            break;
          case "number":
          case "integer":
            sampleValue = "123";
            break;
          case "boolean":
            sampleValue = "true";
            break;
          case "array":
            sampleValue = '["item1", "item2"]';
            break;
          default:
            sampleValue = '"value"';
        }
      }

      result += `  "${param.name}": ${sampleValue}${comma}\n`;
    });
    result += "}\n";
  }

  result += "```\n\n";
  return result;
}

function generateDocs(filePath, outputDir = "output") {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const routeRegex = /app\.(get|post|put|delete|patch)\((['"`])(.*?)\2,/;

  let result = "# API Documentation (Express.js)\n\n";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(routeRegex);

    if (match) {
      const method = match[1].toUpperCase();
      const routePath = match[3];

      const commentData = extractComment(lines, i);
      const queryParams = extractQueryParams(lines, i);
      const routeParams = extractRouteParams(routePath);
      const bodyParams = extractRequestBody(lines, i);
      const jsDocParams = parseJSDocParams(commentData.fullComment);

      result += `## ${method} ${routePath}\n\n`;
      result += `**Description**: ${commentData.description}\n\n`;

      // Add parameters section
      result += formatParameters(
        queryParams,
        routeParams,
        bodyParams,
        jsDocParams
      );

      // Add sample request
      result += generateSampleRequest(
        method,
        routePath,
        queryParams,
        bodyParams
      );

      result += `**Sample Response**:\n\n\`\`\`json\n{\n  "status": "success",\n  "data": {}\n}\n\`\`\`\n\n---\n\n`;
    }
  }

  const outputDirectory = path.join(process.cwd(), outputDir);
  fs.mkdirSync(outputDirectory, { recursive: true });

  const outputName =
    path.basename(filePath, path.extname(filePath)) + "-docs.md";
  const outputPath = path.join(outputDirectory, outputName);
  fs.writeFileSync(outputPath, result);
  console.log(`Express docs generated at ${outputPath}`);
}

module.exports = { generateDocs };
