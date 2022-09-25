import path, { join, resolve } from "path"

import chalk from "chalk"
import fs from "fs-extra"
import { globby } from "globby"
import { sha512 } from "js-sha512"

import type { defineRule } from "./defineRule"
import { parseRuleTxt } from "./parser/parseRuleTxt"

const dirRules = path.resolve(__dirname, "..", "rules")
const dist = resolve(__dirname, "..", "dist")

build()

async function buildRules(): Promise<
  // eslint-disable-next-line no-undef
  Omit<chrome.declarativeNetRequest.Rule, "action">[]
  // eslint-disable-next-line indent
> {
  const files = await globby(["*.ts", "*.txt"], {
    cwd: dirRules
  })

  const rules: ReturnType<typeof defineRule>[] = []

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(dirRules, file)

      if (filePath.endsWith(".ts")) {
        const rulesLocal = (await import(filePath)).default

        rules.push(rulesLocal)

        return
      }

      rules.push(
        ...parseRuleTxt(await fs.promises.readFile(filePath, "utf8"), filePath)
      )
    })
  )

  return rules.map((item, index) => Object.assign(item, { id: index + 1 }))
}
async function buildTransform(): Promise<{ scheme: string; host: string }> {
  const { scheme, host } = JSON.parse(
    await fs.promises.readFile(
      path.resolve(__dirname, "..", "transform.json"),
      "utf8"
    )
  )

  if (!scheme || !host) {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      "[Error]: File transform.json required 'scheme' and 'host'."
    )
  }

  return { scheme, host }
}
async function buildRegexSubstitution(): Promise<string> {
  const { host } = JSON.parse(
    await fs.promises.readFile(
      path.resolve(__dirname, "..", "transform.json"),
      "utf8"
    )
  )

  if (!host) {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      "[Error]: File transform.json required 'scheme' and 'host'."
    )
  }

  return `://\\1${host}\\2`
}

function log(color: "greenBright" | "magentaBright", message: string) {
  console.log(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chalk as any)["bg" + color[0].toUpperCase() + color.slice(1)](
      chalk.bold(" LOG ")
    ),
    chalk[color](message)
  )
}

async function build() {
  log("magentaBright", "start compile:")
  console.log("\n")

  try {
    const [rules, transform, regexSubstitution] = await Promise.all([
      buildRules(),
      buildTransform(),
      buildRegexSubstitution()
    ])

    log(
      "greenBright",
      `complied rules(${chalk.cyanBright(rules.length)}) and transform(${
        transform.host
      })`
    )

    await fs.emptyDir(dist)

    const rulesJson = JSON.stringify({ rules, transform, regexSubstitution })

    await fs.promises.writeFile(join(dist, "rules.json"), rulesJson)

    log("greenBright", "generate sha512 rules")

    await fs.promises.writeFile(join(dist, "hash.sha512"), sha512(rulesJson))

    console.log("\n")

    log("magentaBright", "Done")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error(chalk.red(err.message))
    console.log(err)
  }
}
