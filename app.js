const knex = require("./libs/database")
const inquirer = require("inquirer")
const fs = require("fs")

inquirer
	.prompt({
		type: "list",
		name: "cmd",
		message: "What would you like to do?",
		choices: ["Add proxy", "Delete proxy", "List proxies"],
	})
	.then(({ cmd }) => {
		switch (cmd) {
			case "Add proxy":
				console.log("Adding proxy...")
				addProxy()
				break
			case "Delete proxy":
				console.log("Deleting proxy...")
				// addProxy()
				break
			case "List proxies":
				console.log("Listing proxies...")
				// addProxy()
				break
		}
	})

const addProxy = async () => {
	// Get passwd files
	const passwd = fs.readFileSync("/etc/squid/passwd")
	console.log(passwd)
}
