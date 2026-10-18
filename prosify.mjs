#!/usr/bin/env node
// Usage: node prosify.mjs <file.md> [out.md]
// Capitalizes the first letter of every line, removes trailing commas and
// turns "..." into the … character.
// Edits the file in place unless an output path is given. Front matter is left alone.
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output = input] = process.argv.slice(2)
if (!input) {
	console.error('Usage: node prosify.mjs <file.md> [out.md]')
	process.exit(1)
}

const text = readFileSync(input, 'utf8')
const eol = text.includes('\r\n') ? '\r\n' : '\n'
const lines = text.split(/\r?\n/)

let start = 0
if (lines[0] === '---') {
	const end = lines.indexOf('---', 1)
	if (end > 0) start = end + 1
}

for (let i = start; i < lines.length; i++) {
	lines[i] = lines[i]
		.replaceAll(/\.{3,}/g, '…')
		.replace(/,+[ \t]*$/, '')
		.replace(/^(\p{Ll})/u, (c) => c.toLocaleUpperCase('fr-CA'))
}

writeFileSync(output, lines.join(eol))
console.log(`Prosified ${input}${output === input ? '' : ` → ${output}`}`)
