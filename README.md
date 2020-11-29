# Exproxies Proxy Manager

Exproxies are [Express Notify's](https://notify.express/) inhouse proxies. We use CentOS 7 running squid to host our proxy servers. To manage our proxy authentication (user/password) we use this. It's still very basic at the moment and more features will be added and adjusted as time goes on. Unfortunately, right now this isn't a huge priority and all that is required is a very basic system. Feel free to contribute if you feel you can bring anything additional that might benefit myself or others.

### Deployment

To deploy, clone Exproxies into any directory on your squid servers. It's critical that when you deploy this you correctly configure your `.env` file. Ensure that `env=PRODUCTION` otherwise the server will not execute the reconfiguration. I recommend using [pm2](https://www.npmjs.com/package/pm2) to run the Node server 24/7. You can visit `http://your_server_ip:port/` to access the control panel. The default password is `password` and you should definitely change that.

For you beginners (And I know there's a lot of you). You **need** to rename `servers.example.json` to `servers.json` and make sure the main server ip (for the proxy server, not the subnet IPs) is correctly entered following the format below. You also need to rename `.env.template` to `.env`

### Multiple proxy servers

We're currently using this on 4 different proxy servers. Create a file called `servers.json` with the IPs & ports that you will send a HTTP request to when we want to reconfigure the proxies. We did this because it was easier to setup slave HTTP servers running the same app than it was to write a script to SSH into the server and run `squid -k reconfigure` to reconfigure the proxies (Lack of experience and seems difficult to error handle because i'd be reading from STDOUT)

```json
{
	"45.XX.XX.130": {
		"ip": "45.XX.XX.130",
		"port": "3000"
	},
	"46.XX.XX.140": {
		"ip": "46.XX.XX.140",
		"port": "3000"
	}
}
```

### Database

At the moment all Exproxies is setup for using is a remote MySQL database. You can import [proxies.sql](https://github.com/unreleased/exproxies/blob/main/proxies.sql) as the format. Currently we store the proxy passwords and both plaintext and apache-md5 in the database. Honestly, I don't really know much about Squid and I created this dashboard by translating a CLI bash script and adding some additional features.

### Node, NPM & GIT

If your servers do not already have NodeJS and Git installed please follow below:

### Installing NodeJS & NPM

Note - I am doing this on CentOS 7, you may need to find your own instructions if you are not using similar. You can change the version of Node you want to use below, I am using v12 currently.

`curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -`

`sudo yum install -y nodejs`

### Installing GIT

`sudo yum install -y git`

Easy right.
