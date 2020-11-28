const knex = require("./libs/database")
const Proxies = require("./libs/proxies")

const express = require("express")
const bodyParser = require("body-parser")
const md5 = require("apache-md5")
const Helper = require("./libs/helper")
const moment = require("moment")
const handlebars = require("express-handlebars")
const session = require("express-session")
const app = express()
const port = 3000

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
	cookie: {},
	resave: true,
	saveUninitialized: true,
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

app.get("/api/proxies", async (req, res) => {
	const proxies = (await knex("proxies")).map(s => {
		s.expired = moment(s.updated_at).isBefore(moment().subtract("30", "days"))
		s.updated_at = moment(s.updated_at).format("DD/MM/YYYY HH:mm:ss")
		return s
	})

	res.json(proxies)
})

app.get("/api/proxies/:query", async (req, res) => {
	const query = req.params.query

	let proxies = await knex("proxies").where("user", "LIKE", `%${query}%`).orWhere("pass", "LIKE", `%${query}%`).orWhere("ip", "LIKE", `%${query}%`)

	proxies = proxies.map(s => {
		s.expired = moment(s.updated_at).isBefore(moment().subtract("30", "days"))
		s.updated_at = moment(s.updated_at).format("DD/MM/YYYY HH:mm:ss")
		return s
	})

	res.json(proxies)
})

app.post("/api/proxies", async (req, res) => {
	/**
	 * Change the passwords for proxies inside the request.
	 */

	for (const ip of req.body) {
		const proxy = await knex("proxies").where("ip", ip).first()

		if (proxy) {
			const pass = Helper.rs(5)
			await knex("proxies")
				.update({
					user: Helper.rs(5),
					pass: pass,
					pass_md5: md5(pass),
				})
				.where("ip", ip)
		} else {
			console.log(`[PROXIES] [${ip}] Cannot update proxy as it does not exist.`)
		}
	}

	await Proxies.reconfigure()

	res.json({
		message: "Successfully updated proxies.",
	})
})

app.listen(port, () => {
	console.log(`[PROXIES] Server started on: http://localhost:${port}`)
})
