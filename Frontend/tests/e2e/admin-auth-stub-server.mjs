import http from "node:http";

const HOST = process.env.PLAYWRIGHT_ADMIN_STUB_HOST ?? "127.0.0.1";
const PORT = Number(process.env.PLAYWRIGHT_ADMIN_STUB_PORT ?? 3001);

function buildAccessToken(subject = "qa-admin-user") {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub: subject,
    })
  ).toString("base64url");

  return `qa.${payload}.sig`;
}

function buildUser(roleName, subject) {
  return {
    id: subject,
    username: subject,
    email: `${subject}@example.com`,
    roles_id: roleName === "admin" ? 1 : roleName === "pro" ? 3 : 2,
    role_name: roleName,
    token_id: `stub-${subject}`,
    settings_icons_id: null,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
  };
}

function resolveProfileFromRefreshToken(refreshToken) {
  if (!refreshToken || refreshToken === "forged-refresh-token") {
    return null;
  }

  if (refreshToken.includes("admin-b")) {
    return { roleName: "admin", subject: "qa-admin-b" };
  }

  if (refreshToken.includes("admin-a")) {
    return { roleName: "admin", subject: "qa-admin-a" };
  }

  if (refreshToken.includes("pro")) {
    return { roleName: "pro", subject: "qa-pro-user" };
  }

  if (refreshToken.includes("user")) {
    return { roleName: "user", subject: "qa-user-user" };
  }

  return { roleName: "admin", subject: "qa-admin-user" };
}

function resolveProfileFromAuthorization(authorizationHeader) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const subject = typeof parsed.sub === "string" ? parsed.sub : "";

    if (!subject) {
      return null;
    }

    if (subject.includes("admin")) {
      return { roleName: "admin", subject };
    }

    if (subject.includes("pro")) {
      return { roleName: "pro", subject };
    }

    return { roleName: "user", subject };
  } catch {
    return null;
  }
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

const server = http.createServer(async (request, response) => {
  if (!request.url || !request.method) {
    writeJson(response, 400, { success: false, message: "BAD_REQUEST" });
    return;
  }

  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  if (request.method === "GET" && url.pathname === "/__qa_stub_health") {
    writeJson(response, 200, { ok: true, service: "playwright-admin-auth-stub" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/refresh") {
    const body = await readJsonBody(request);
    const profile = resolveProfileFromRefreshToken(body.refreshToken);

    if (!profile) {
      writeJson(response, 401, { success: false, message: "SESSION_EXPIRED" });
      return;
    }

    writeJson(response, 200, {
      success: true,
      data: {
        accessToken: buildAccessToken(profile.subject),
        user: buildUser(profile.roleName, profile.subject),
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin") {
    const profile = resolveProfileFromAuthorization(request.headers.authorization);

    if (!profile) {
      writeJson(response, 401, { success: false, message: "SESSION_EXPIRED" });
      return;
    }

    if (profile.roleName !== "admin") {
      writeJson(response, 403, { success: false, message: "FORBIDDEN" });
      return;
    }

    writeJson(response, 200, { success: true, data: { ok: true } });
    return;
  }

  writeJson(response, 404, { success: false, message: "NOT_FOUND" });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`admin-auth-stub listening on http://${HOST}:${PORT}\n`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
