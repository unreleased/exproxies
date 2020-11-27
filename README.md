# Exproxies

A basic NodeJS squid server proxy manager for CentOS 7

### Details

A basic management script for managing proxies on a Squid server running CentOS7.

All hooked up to a mysql database for easy management for staff.

Make sure you change your `ENV=development` variable inside `.env` to `ENV=production` on your Squid server. If you do not do this shelljs will not execute and the proxies will not be reconfigured.
