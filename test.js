var unirest = require("unirest");

var req = unirest("POST", "https://shazam.p.rapidapi.com/songs/detect");

req.headers({
	"content-type": "text/plain",
	"x-rapidapi-key": "7e3bb9c2cfmsh31c1e508834003dp175d3djsn29e094e0f8f9",
	"x-rapidapi-host": "shazam.p.rapidapi.com",
	"useQueryString": true
});

req.send("I want it that way");


req.end(function (res) {

	console.log(res.body);
});