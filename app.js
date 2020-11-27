const knex = require("./libs/database")
const inquirer = require("inquirer")
const fs = require("fs")
const md5 = require("apache-md5")
const moment = require("moment")
const shell = require("shelljs")

inquirer
	.prompt({
		type: "list",
		name: "cmd",
		message: "What would you like to do?",
		choices: ["Add proxy", "Delete proxy by username", "List proxies"],
	})
	.then(({ cmd }) => {
		switch (cmd) {
			case "Add proxy":
				console.log("Adding proxy...")
				addProxy()
				break
			case "Delete proxy by username":
				console.log("Deleting proxy...")
				deleteProxy()
				break
			case "List proxies":
				console.log("Listing proxies...")
				// addProxy()
				break
		}
	})

const addProxy = async () => {
	// echo "#$time - $user" >>/etc/$SQUID/squid.conf
	// echo "acl	$user	proxy_auth	$user" >>/etc/$SQUID/squid.conf
	// echo  "tcp_outgoing_address $addrs $user" >> /etc/$SQUID/squid.conf
	// echo  "http_access allow $user" >> /etc/$SQUID/squid.conf

	await inquirer
		.prompt({
			type: "input",
			name: "host",
			message: "What is the proxy host?",
		})
		.then(({ host }) => {
			const user = makeid(5)
			const pass = makeid(5)
			const proxy = `${host}:3128:${user}:${pass}`

			// Format for squid.conf
			const formattedConf = [
				`\n# [${moment().format("DD/MM/YYYY HH:mm:ss")}] - ${user}`,
				`acl ${user} proxy_auth ${user}`,
				`tcp_outgoing_address ${host} ${user}`,
				`http_access allow ${user}`,
			].join("\n")

			const formattedPasswd = `\n${user}:${md5(pass)}\n`

			// Append the formatted versions to the current files
			const passwdFile = fs.readFileSync(`${process.env.SQUID_PATH}/passwd`, "utf8")
			const squidConfFile = fs.readFileSync(`${process.env.SQUID_PATH}/squid.conf`, "utf8")

			const passwd = `${passwdFile}${formattedPasswd}`
			const squid = `${squidConfFile}${formattedConf}`

			fs.writeFileSync(`${process.env.SQUID_PATH}/passwd`, passwd)
			fs.writeFileSync(`${process.env.SQUID_PATH}/squid.conf`, squid)

			// squid -k reconfigure

			shell.exec("squid -k reconfigure")

			console.log(`Proxy ready: ${proxy}`)

			// console.log(formattedConf)
			// console.log(formattedPasswd)

			// Format for passwd
		})
}

const deleteProxy = async () => {
	await inquirer
		.prompt({
			type: "input",
			name: "name",
			message: "What is the proxy username?",
		})
		.then(({ name }) => {
			// We need to find the proxy inside /etc/squid/passwd and remove wherever the username is
			const passwdFile = fs.readFileSync(`${process.env.SQUID_PATH}/passwd`, "utf8")
			const squidConfFile = fs.readFileSync(`${process.env.SQUID_PATH}/squid.conf`, "utf8")

			try {
				if (!passwdFile.includes(`${name}:`)) {
					return console.log(`[PROXIES] [passwd] Unable to delete proxy. No proxy with that username exists.`)
				}

				if (!squidConfFile.includes(name)) {
					return console.log(`[PROXIES] [squid.conf] Unable to delete proxy. No proxy with that username exists.`)
				}

				const passwd = passwdFile
					.split("\n")
					.filter(p => !p.includes(`${name}:`))
					.join("\n")

				const squidConf = squidConfFile
					.split("\n")
					.filter(p => !p.includes(name))
					.join("\n")

				fs.writeFileSync(`${process.env.SQUID_PATH}/passwd`, passwd)
				fs.writeFileSync(`${process.env.SQUID_PATH}/squid.conf`, squidConf)

				console.log(`[PROXIES] Successfully deleted proxy with username: ${name}`)
			} catch (err) {
				// Rewrite file back to old file on error (incase)
				fs.writeFileSync(`${process.env.SQUID_PATH}/passwd`, passwdFile)
				fs.writeFileSync(`${process.env.SQUID_PATH}/squid.conf`, squidConfFile)
			}
		})
}

/**
 * Doesn't need to be secure sorry not sorry
 * Thanks for the quick one again stack overflow
 */

function makeid(length) {
	var result = ""
	var characters = "abcdefghijklmnopqrstuvwxyz"
	var charactersLength = characters.length
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}
	return result
}
