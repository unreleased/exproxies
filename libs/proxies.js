const fs = require("fs")
const knex = require("./database")
const moment = require("moment")
const Helper = require("./helper")
const Shell = require("shelljs")

const Proxies = {}

/**
 * So, I originally wrote this via regexing each line but found it much "friendlier" regenerating
 * the complete config straight from the database as a "save" feature.
 *
 * That way we can just manipulate the database with CRUD like a regular API
 * then run the Proxies.reconfigure() to save our changes and reconfigure our squid server
 * via executing the shell
 */

Proxies.squid = async () => {
	/**
	 * From the database re-create the squid `squiid.conf` format and save it
	 */

	console.log(__dirname)

	const defaults = fs.readFileSync(`${__dirname}/defaults`, "utf8")
	console.log(defaults)

	const proxies = await knex("proxies").orderBy("id", "desc")
	const file = proxies
		.map(p => {
			let format = `# [${moment().format("DD/MM/YYYY HH:mm:ss")}] - ${p.user}\n`
			format += `acl ${p.user} proxy_auth ${p.user}\n`
			format += `tcp_outgoing_address ${p.ip} ${p.user}\n`
			format += `http_access allow ${p.user}`

			return format
		})
		.join("\n")

	fs.writeFileSync(`${process.env.SQUID_PATH}/squid.conf`, `${defaults}${file}`)
	return file
}

Proxies.passwd = async () => {
	/**
	 * From the database re-create the squid `passwd` format and save it
	 */

	const proxies = await knex("proxies").orderBy("id", "desc")
	const file = proxies.map(p => `${p.user}:${p.pass_md5}`).join("\n")
	fs.writeFileSync(`${process.env.SQUID_PATH}/passwd`, file)
	return file
}

Proxies.reconfigure = async () => {
	const originalSquid = fs.readFileSync(`${process.env.SQUID_PATH}/squid.conf`, "utf8")
	const originalPasswd = fs.readFileSync(`${process.env.SQUID_PATH}/passwd`, "utf8")

	try {
		await Proxies.squid()
		await Proxies.passwd()

		// Exec on shell to reconfigure the squid server
		if (process.env.ENV === "production") {
			Shell.exec("squid -k reconfigure")
		}

		return true
	} catch (err) {
		fs.writeFileSync(`${process.env.SQUID_PATH}/squid.conf`, originalSquid)
		fs.writeFileSync(`${process.env.SQUID_PATH}/passwd`, originalPasswd)
		console.log(`[PROXIES] [RECONFIGURE] [ERR] ${err.message}`)
		return false
	}
}

module.exports = Proxies
