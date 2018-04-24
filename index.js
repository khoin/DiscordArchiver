
const Discord 	= require('discord.js');
const client 	= new Discord.Client();
const fs		= require('fs');
const fetch 	= require('node-fetch');

if (!fs.existsSync('config.json')) {
	throw Error("config.json does not exist.");
}

const config = JSON.parse(fs.readFileSync('config.json').toString());

// Token check
if (!config.token && config.token.trim() == "") {
	throw Error("Please provide Discord Authentication Token.");
}

// Directory procedures
fs.access(config.directory, 'fw', (err) => {
	if (err) {
		throw Error(config.directory + " does not exist or without write permission");
	} else {
		config.channels.forEach( chan => {
			if (!fs.existsSync(config.directory + chan)) {
				fs.mkdir(config.directory + chan);
				console.log("-- CREATING DIR: " + config.directory + chan + "/");
			}
		});
		console.log("---- DIRECTORY: OK!");
	}
});


// -- Discord stuff
client.on('message', (msg) => {
	var reg = new RegExp("((\\w+:\\/\\/)[-a-zA-Z0-9:@;?&=\\/%\\+\\.\\*!'\\(\\),\\$_\\{\\}\\^~\\[\\]`#|]+)","gm");
	
	if ( 	config.channels.indexOf(msg.channel.name) >= 0 &&		// Is it the right channel?
			config.blackList.indexOf(msg.author.username) < 0		// User is not in black list?
		) 
	{
		// Append Discord attachments
		msg.content = (msg.attachments.size > 0)? msg.content +" "+ msg.attachments.first().url : msg.content;
		// Iterate through each link
		for( let url = reg.exec(msg.content), i = 0; url !== null ; url = reg.exec(msg.content), ++i ) {
			var extension = url[0].split("?")[0].split(".").pop();
			if (config.formats.indexOf(extension) >= 0) {
				saveFile(url[0], msg.author.username, msg.channel.name, i, extension);
			}
		}
	}
});

client.on('error', (err) => {
	console.log('Error:');
	console.log(err);
});

client.on('ready', () => {
	console.log("---- DISCORD: OK!");
});

client.login(config.token);

// -- Saving ze File
// -- CSV format: timestamp, user, path, original link
function saveFile(url, user, channel, i, ext) {
	fetch(url)
		.then( res => {
			var fileSize = parseInt(res.headers.get('content-length'));
			var timeStamp= Date.now();

			if ( fileSize > config.maxByte ) {
				appendCSV(channel, (new Date()).toUTCString().replace(",",""), user, "File exceeded maximum", url);
			} else {
				var path 	= config.directory + channel + '/' + user + timeStamp + "-" + i + "." + ext
				var stream 	= fs.createWriteStream(path);
				res.body.pipe(stream);
				console.log(" ---> SAVING: " + path);
				appendCSV(channel, (new Date()).toUTCString().replace(",",""), user, path, url);
			}

		})
		.catch( err => {
			console.log(" ++ ERROR: " + err);
		})
}

function appendCSV(channel, stamp, user, path, url) {
	var fileName = (new Date()).toDateString().split(" ");
		fileName.shift();
		fileName = fileName.join("") + ".csv";
	var content = [stamp, user, path, url].join(",") + '\r\n';

	fs.appendFile(config.directory + channel + "/" + fileName, content, (err) => {
		if (err) console.log(" ++ CSV ERROR: " + err);
	})
}