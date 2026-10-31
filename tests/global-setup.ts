import { execFileSync } from "child_process";

const NAME = `desapega-test-pg-${process.pid}`;

export async function setup() {
  execFileSync("docker", [
    "run", "-d", "--rm", "--name", NAME,
    "-e", "POSTGRES_PASSWORD=test", "-e", "POSTGRES_DB=desapega",
    "-p", "127.0.0.1::5432", "postgres:16-alpine",
  ]);
  const port = execFileSync("docker", ["port", NAME, "5432"]).toString().trim().split(":").pop();
  for (let i = 0; i < 60; i += 1) {
    try {
      execFileSync("docker", ["exec", NAME, "pg_isready", "-U", "postgres", "-d", "desapega", "-h", "127.0.0.1"]);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  process.env.DATABASE_URL = `postgres://postgres:test@127.0.0.1:${port}/desapega`;
}

export async function teardown() {
  execFileSync("docker", ["rm", "-f", NAME]);
}
