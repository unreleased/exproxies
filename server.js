const knex = require("./libs/database")
const Proxies = require("./libs/proxies")

const express = require("express")
const bodyParser = require("body-parser")
const md5 = require("apache-md5")
const Helper = require("./libs/helper")
const fs = require("fs")
const moment = require("moment")
const handlebars = require("express-handlebars")
const session = require("express-session")
const request = require("request-promise").defaults({
	simple: false,
	resolveWithFullResponse: true,
})

const app = express()

app.use(bodyParser.json())
app.engine(
	"handlebars",
	handlebars({
		layoutsDir: __dirname + "/views/layouts",
	})
)

app.set("view engine", "handlebars")

const sess = {
	secret: process.env.ADMIN_PASS,
	cookie: { secure: false },
	resave: false,
	saveUninitialized: false,
}

if (app.get("env") === "production") {
	app.set("trust proxy", 1) // trust first proxy
	sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))

const loggedIn = (req, res, next) => {
	if (req.session.user) {
		return next()
	}

	if (req.query.password === process.env.ADMIN_PASS) {
		return next()
	}

	return res.redirect("/login")
}

app.get("/", loggedIn, async (req, res) => {
	return res.render("index")
})

app.get("/login", async (req, res) => {
	if (req.session.user) {
		return res.redirect("/")
	}

	return res.render("login")
})

app.post("/api/login", async (req, res) => {
	const password = req.body.password

	if (password === process.env.ADMIN_PASS) {
		req.session.user = true

		return res.json({
			message: "Successfully logged in.",
		})
	}

	return res.status(401).json({
		message: "Invalid password.",
	})
})

app.get("/renew", loggedIn, async (req, res) => {
	return res.render("renew")
})

app.get("/api/proxies/export", loggedIn, async (req, res) => {
	const proxies = await Proxies.export()
	res.send(proxies)
})

app.get("/api/proxies", loggedIn, async (req, res) => {
	const pagesize = 15
	const page = req.query.page || 1
	const start = (page - 1) * pagesize

	if (page < 1) {
		return res.status(400).json({
			message: "Error getting page results.",
		})
	}

	const proxies = (await knex("proxies").limit(pagesize).offset(start)).map(s => {
		s.expired = moment(s.updated_at).isBefore(moment().subtract("30", "days"))
		s.updated_at = moment(s.updated_at).format("DD/MM/YYYY HH:mm:ss")
		return s
	})

	res.json(proxies)
})

app.get("/api/reconfigure", loggedIn, async (req, res) => {
	/**
	 * This command rewrites and resets squid and can be called from other servers.
	 * The benefit of this means we don't have to actually SSH into a server which gets messy with STDIN and STDOUT and handling connection errors etc
	 *
	 * So if you wanted to reset the proxies on a particular subnet you'd make a HTTP request to EXAMPLE: http://${serverIp}:${httpPort}/api/reconfigure?password=${process.env.ADMIN_PASS}
	 */

	await Proxies.reconfigure()

	return res.json({
		message: "Successfully reconfigured the proxies.",
	})
})

app.get("/api/reconfigure/:ip", loggedIn, async (req, res) => {
	const ip = req.params.ip
	const servers = JSON.parse(fs.readFileSync("./servers.json", "utf8"))
	const server = servers[req.params.ip]

	if (!server) {
		return res.status(400).json({
			message: "Invalid server specified",
		})
	}

	const url = `http://${server.ip}:${server.port}/api/reconfigure?password=${process.env.ADMIN_PASS}`

	await request(url)
		.then(res => {
			if (res.statusCode === 200) {
				return console.log(`[PROXIES] [${res.statusCode}] [${server.ip}] Successfully reset the server proxies.`)
			} else {
				return console.log(`[PROXIES] [${res.statusCode}] [${server.ip}] Something went wrong resetting server`)
			}
		})
		.catch(err => {
			return console.log(`[PROXIES] [ERR] [${server.ip}] Error resetting server: ${err.message}`)
		})

	return res.json({
		message: `Successfully reset server: ${ip}`,
	})
})

app.get("/api/proxies/:query", loggedIn, async (req, res) => {
	const query = req.params.query
	const pagesize = 15
	const page = req.query.page || 1
	const start = (page - 1) * pagesize

	if (page < 1) {
		return res.status(400).json({
			message: "Error getting page results.",
		})
	}

	let proxies = await knex("proxies").where("user", "LIKE", `%${query}%`).orWhere("pass", "LIKE", `%${query}%`).orWhere("ip", "LIKE", `%${query}%`).limit(pagesize).offset(start)

	proxies = proxies.map(s => {
		s.expired = moment(s.updated_at).isBefore(moment().subtract("30", "days"))
		s.updated_at = moment(s.updated_at).format("DD/MM/YYYY HH:mm:ss")
		return s
	})

	res.json(proxies)
})

app.post("/api/proxies", loggedIn, async (req, res) => {
	/**
	 * Change the passwords for proxies inside the request.
	 */

	const servers = []
	const proxies = []

	for (let ip of req.body) {
		if (ip.includes(":")) {
			ip = ip.split(":")[0]
		}

		const proxy = await knex("proxies").where("ip", ip).first()

		if (!servers.includes(proxy.server)) {
			servers.push(proxy.server)
		}

		if (proxy) {
			const user = Helper.rs(5)
			const pass = Helper.rs(5)

			proxies.push(`${ip}:3128:${user}:${pass}`)

			await knex("proxies")
				.update({
					user: user,
					pass: pass,
					pass_md5: md5(pass),
				})
				.where("ip", ip)
		} else {
			console.log(`[PROXIES] [${ip}] Cannot update proxy as it does not exist.`)
		}
	}

	for (const server of servers) {
		await Proxies.sendReconfigure(server)
	}

	res.json({
		message: "Successfully updated proxies.",
		proxies: proxies,
	})
})

app.listen(process.env.PORT, () => {
	console.log(`[PROXIES] Server started on: http://localhost:${process.env.PORT}`)
})
