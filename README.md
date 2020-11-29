# Exproxies

A basic NodeJS squid server proxy manager for CentOS 7

### Details

A basic management script for managing proxies on a Squid server running CentOS7.

All hooked up to a mysql database for easy management for staff.

Make sure you change your `ENV=development` variable inside `.env` to `ENV=production` on your Squid server. If you do not do this shelljs will not execute and the proxies will not be reconfigured.

You can run this from anywhere but I would recommend you clone this into a repo on your server in a memorable location (i.e `~`) and use [pm2](https://www.npmjs.com/package/pm2)

### Node, NPM & GIT

If your servers do not already have NodeJS and Git installed please follow below:

### NodeJS & NPM

Note - I am doing this on CentOS 7, you may need to find your own instructions if you are not using similar. You can change the version of Node you want to use below, I am using v12 currently.

curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -

sudo yum install -y nodejs

### GIT

sudo yum install -y git

Easy right.
