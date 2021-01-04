const Helper = {}

Helper.rs = length => {
	let result = ""
	let characters = "abcdefghijklmnopqrstuvwxyz"
	let charactersLength = characters.length
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}
	return result
}

Helper.formatTime = time => {
	return time.utc().format("YYYY-MM-DD HH:mm:ss")
}

module.exports = Helper
