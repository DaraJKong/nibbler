"use strict";

const electron = require("electron");
const fs = require("fs");
const path = require("path");

const default_file_contents = 
`CPuct 4.0
CPuct 3.8
CPuct 3.6
CPuct 3.4
CPuct 3.2
CPuct 3.0
CPuct 2.8
CPuct 2.6
CPuct 2.4`;

exports.load = () => {

	let filename = exports.get_filename();

	if (fs.existsSync(filename) === false) {
		fs.writeFileSync(filename, default_file_contents);
	}

	let contents = fs.readFileSync(filename).toString();

	let lines = contents.split("\n");
	let command_list = [];

	for (let line of lines) {
		let commands = line.trim().split(/\s+/);
		if (commands.length === 2) {
			command_list.push(commands);
		}
	}

	return command_list;
}

exports.get_filename = () => {
	if (electron.app) {
   		return path.join(electron.app.getPath("userData"), "custom.cfg");
   	} else {
   		return path.join(electron.remote.app.getPath("userData"), "custom.cfg");
   	}
}
