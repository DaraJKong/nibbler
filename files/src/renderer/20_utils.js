"use strict";

// At some point I tried caching the results of XY() and S()
// but for XY(), object lookups were slower than calculating,
// and for S(), it just isn't called enough to matter.

function XY(s) {				// e.g. "b7" --> [1, 1]
	if (typeof s !== "string" || s.length !== 2) {
		return [-1, -1];
	}
	s = s.toLowerCase();
	let x = s.charCodeAt(0) - 97;
	let y = 8 - parseInt(s[1], 10);
	if (x < 0 || x > 7 || y < 0 || y > 7 || Number.isNaN(y)) {
		return [-1, -1];
	}
	return [x, y];
}

function S(x, y) {				// e.g. (1, 1) --> "b7"
	if (typeof x !== "number" || typeof y !== "number" || x < 0 || x > 7 || y < 0 || y > 7) {
		return "??";
	}
	let xs = String.fromCharCode(x + 97);
	let ys = String.fromCharCode((8 - y) + 48);
	return xs + ys;
}

function InfoVal(s, key) {

	// Given some string like "info depth 8 seldepth 22 time 469 nodes 3918 score cp 46 hashfull 13 nps 8353 tbhits 0 multipv 1 pv d2d4 g8f6"
	// pull the value for the key out, e.g. in this example, key "nps" returns "8353" (as a string).
	//
	// Since Lc0's info strings often have the value ending in ")", we strip that out.

	if (typeof s !== "string" || typeof key !== "string") {
		return "";
	}

	let tokens = s.split(" ").filter(z => z !== "");

	for (let i = 0; i < tokens.length - 1; i++) {
		if (tokens[i] === key) {
			if (tokens[i + 1].endsWith(")")) {
				return tokens[i + 1].slice(0, -1);
			} else {
				return tokens[i + 1];
			}
		}
	}
	return "";
}

function InfoValMany(s, keys) {

	// Optimised version of InfoVal for when many values can be pulled out of the same string.

	let ret = Object.create(null);

	let tokens = s.split(" ").filter(z => z !== "");

	for (let key of keys) {
		let ok = false;
		for (let i = 0; i < tokens.length - 1; i++) {
			if (tokens[i] === key) {
				if (tokens[i + 1].endsWith(")")) {
					ret[key] = tokens[i + 1].slice(0, -1);
				} else {
					ret[key] = tokens[i + 1];
				}
				ok = true;
				break;
			}
		}
		if (!ok) {
			ret[key] = "";
		}
	}

	return ret;
}

function InfoPV(s) {

	// Pull the PV out.

	if (typeof s !== "string") {
		return [];
	}

	let tokens = s.split(" ").filter(z => z !== "");
	let pv_index = null;

	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i] === "pv") {
			pv_index = i;
			break;
		}
	}

	let ret = [];

	if (pv_index !== null) {

		for (let i = pv_index + 1; i < tokens.length; i++) {

			let token = tokens[i];

			if (token.length < 4 || token.length > 5) {
				break;
			}

			let codes = [token.charCodeAt(0), token.charCodeAt(1), token.charCodeAt(2), token.charCodeAt(3)];

			if (codes[0] < 97 || codes[0] > 104) break;		// a - h
			if (codes[1] < 49 || codes[1] > 56) break;		// 1 - 8
			if (codes[2] < 97 || codes[2] > 104) break;
			if (codes[3] < 49 || codes[3] > 56) break;

			ret.push(token);
		}
	}

	return ret;
}

function C960_PV_Converter(pv, board) {

	// Change standard UCI format castling moves in the PV
	// into our favoured c960 format. In place.

	let fix_e1g1 = board.state[4][7] === "K" && !board.castling.includes("G");
	let fix_e1c1 = board.state[4][7] === "K" && !board.castling.includes("C");
	let fix_e8g8 = board.state[4][0] === "k" && !board.castling.includes("g");
	let fix_e8c8 = board.state[4][0] === "k" && !board.castling.includes("c");

	// Those are the best tests to use here (especially considering that we
	// seem to be allowing arbitrary / weird castling rights like GHgh).

	for (let i = 0; i < pv.length; i++) {

		let token = pv[i];

		if (fix_e1g1 && token === "e1g1") {
			pv[i] = "e1h1";
		} else if (fix_e1c1 && token === "e1c1") {
			pv[i] = "e1a1";
		} else if (fix_e8g8 && token === "e8g8") {
			pv[i] = "e8h8";
		} else if (fix_e8c8 && token === "e8c8") {
			pv[i] = "e8a8";
		}

		let start = token.slice(0, 2);

		if (start === "e1") {
			fix_e1g1 = false;
			fix_e1c1 = false;
		}

		if (start === "e8") {
			fix_e8g8 = false;
			fix_e8c8 = false;
		}
	}
}

function InfoWDL(s) {

	if (typeof s !== "string") {
		return null;
	}

	let tokens = s.split(" ").filter(z => z !== "");

	let ret = null;

	for (let i = 0; i < tokens.length - 3; i++) {
		if (tokens[i] === "wdl") {
			ret = tokens.slice(i + 1, i + 4);
			break;
		}
	}

	if (Array.isArray(ret) === false || ret.length !== 3) {
		return null;
	}

	for (let n = 0; n < 3; n++) {
		let tmp = parseInt(ret[n], 10);
		if (Number.isNaN(tmp)) {
			return null;
		}
		ret[n] = tmp;
	}

	return ret;
}

function CompareArrays(a, b) {

	if (Array.isArray(a) === false || Array.isArray(b) === false) {
		return false;
	}

	if (a.length !== b.length) {
		return false;
	}

	for (let n = 0; n < a.length; n++) {
		if (a[n] !== b[n]) {
			return false;
		}
	}

	return true;
}

function ArrayStartsWith(a, b) {		// where b is itself an array

	if (Array.isArray(a) === false || Array.isArray(b) === false) {
		return false;
	}

	if (a.length < b.length) {
		return false;
	}

	for (let n = 0; n < b.length; n++) {
		if (a[n] !== b[n]) {
			return false;
		}
	}

	return true;
}

function OppositeColour(s) {
	if (s === "w" || s === "W") return "b";
	if (s === "b" || s === "B") return "w";
	return "";
}

function ReplaceAll(s, search, replace) {
	if (!s.includes(search)) return s;			// Seems to improve speed overall.
	return s.split(search).join(replace);
}

function SafeStringHTML(s) {
	if (typeof s !== "string") {
		return undefined;
	}
	s = ReplaceAll(s,  `&`  ,  `&amp;`   );		// This needs to be first of course.
	s = ReplaceAll(s,  `<`  ,  `&lt;`    );
	s = ReplaceAll(s,  `>`  ,  `&gt;`    );
	s = ReplaceAll(s,  `'`  ,  `&apos;`  );
	s = ReplaceAll(s,  `"`  ,  `&quot;`  );
	return s;
}

function UnsafeStringHTML(s) {
	if (typeof s !== "string") {
		return undefined;
	}
	s = ReplaceAll(s,  `&quot;`  ,  `"`  );
	s = ReplaceAll(s,  `&apos;`  ,  `'`  );
	s = ReplaceAll(s,  `&gt;`    ,  `>`  );
	s = ReplaceAll(s,  `&lt;`    ,  `<`  );
	s = ReplaceAll(s,  `&amp;`   ,  `&`  );		// So I guess do this last.
	return s;
}

function SafeStringPGN(s) {
	if (typeof s !== "string") {
		return undefined;
	}
	s = ReplaceAll(s,  `\\`  ,  `\\\\`  );		// Must be first.
	s = ReplaceAll(s,  `"`   ,  `\\"`   );
	return s;
}

function UnsafeStringPGN(s) {
	if (typeof s !== "string") {
		return undefined;
	}
	s = ReplaceAll(s,  `\\"`   ,  `"`   );
	s = ReplaceAll(s,  `\\\\`  ,  `\\`  );		// So this ought to be last.
	return s;
}

function Log(s) {

	// config.logfile  - name of desired log file (or null)
	// Log.logfilename - name of currently open log file (undefined if none)
	// Log.stream      - actual write stream

	if (typeof config.logfile !== "string" || config.logfile === "") {
		if (Log.logfilename) {
			console.log(`Closing ${Log.logfilename}`);
			Log.stream.end();
			Log.stream = undefined;
			Log.logfilename = undefined;
		}
		return;
	}

	// So at this point, we know config.logfile is some string...

	if (Log.logfilename !== config.logfile) {
		if (Log.logfilename) {
			console.log(`Closing log ${Log.logfilename}`);
			Log.stream.end();
			Log.stream = undefined;
			Log.logfilename = undefined;
		}

		let actual_filepath = config.logfile_timestamp ? UniqueFilepath(config.logfile) : config.logfile;
		// Note that this isn't saved even temporarily - as far as the rest of the logic is concerned, we are logging to config.logfile

		console.log(`Logging to ${actual_filepath}`);
		let flags = (config.clear_log) ? "w" : "a";
		let stream = fs.createWriteStream(actual_filepath, {flags: flags});		// Want var "stream" available via closure for the below...

		stream.on("error", (err) => {
			console.log(err);
			stream.end();
			if (Log.stream === stream) {
				Log.stream = undefined;
				Log.logfilename = undefined;
				config.logfile = null;
				ipcRenderer.send("ack_logfile", config.logfile);
			}
  		});

  		Log.stream = stream;
		Log.logfilename = config.logfile;
	}

	Log.stream.write(s + "\n");
}

function LogBoth(s) {
	console.log(s);
	Log(s);
}

function UniqueFilepath(filepath) {

	const alpha = "abcdefghijklmnopqrstuvwxyz";

	let extname = path.extname(filepath);
	let basename = path.basename(filepath, extname);
	let dirname = path.dirname(filepath);

	let dt = new Date();

	let y = dt.getFullYear().toString();
	let m = (dt.getMonth() + 1).toString();
	let d = dt.getDate().toString();
	let h = dt.getHours().toString();
	let n = dt.getMinutes().toString();
	let s = dt.getSeconds().toString();

	if (m.length === 1) m = "0" + m;
	if (d.length === 1) d = "0" + d;
	if (h.length === 1) h = "0" + h;
	if (n.length === 1) n = "0" + n;
	if (s.length === 1) s = "0" + s;

	let newbase = `${basename}-${y}-${m}-${d}-${h}${n}${s}`;

	for (let n = 0; n < 26; n++) {
		let test = path.join(dirname, newbase) + alpha[n] + extname;
		if (!fs.existsSync(test)) {
			return test;
		}
	}

	// If you start 27 instances of Nibbler within a second, that's your problem.

	return filepath;
}

function New2DArray(width, height, defval) {

	let ret = [];

	for (let x = 0; x < width; x++) {
		ret.push([]);
		for (let y = 0; y < height; y++) {
			ret[x].push(defval);
		}
	}

	return ret;
}

function CanvasCoords(x, y) {

	// Given the x, y coordinates on the board (a8 is 0, 0)
	// return an object with the canvas coordinates for
	// the square, and also the centre.
	//
	//      x1,y1--------
	//        |         |
	//        |  cx,cy  |
	//        |         |
	//        --------x2,y2

	let css = config.square_size;
	let x1 = x * css;
	let y1 = y * css;
	let x2 = x1 + css;
	let y2 = y1 + css;

	if (config.flip) {
		[x1, x2] = [(css * 8) - x2, (css * 8) - x1];
		[y1, y2] = [(css * 8) - y2, (css * 8) - y1];
	}

	let cx = x1 + css / 2;
	let cy = y1 + css / 2;

	return {x1, y1, x2, y2, cx, cy};
}

function EventPathString(event, prefix) {

	// Given an event with event.path like ["foo", "bar", "searchmove_e2e4", "whatever"]
	// return the string "e2e4", assuming the prefix matches. Else return null.

	if (!event || typeof prefix !== "string") {
		return null;
	}

	let path = event.path || (event.composedPath && event.composedPath());

	if (path) {
		for (let item of path) {
			if (typeof item.id === "string") {
				if (item.id.startsWith(prefix)) {
					return item.id.slice(prefix.length);
				}
			}
		}
	}

	return null;
}

function EventPathN(event, prefix) {

	// As above, but returning a number, or null.

	let s = EventPathString(event, prefix);

	if (typeof s !== "string") {
		return null;
	}

	let n = parseInt(s, 10);

	if (Number.isNaN(n)) {
		return null;
	}

	return n;
}

function SwapElements(obj1, obj2) {

	// https://stackoverflow.com/questions/10716986/swap-2-html-elements-and-preserve-event-listeners-on-them

	let temp = document.createElement("div");
	obj1.parentNode.insertBefore(temp, obj1);
	obj2.parentNode.insertBefore(obj1, obj2);
	temp.parentNode.insertBefore(obj2, temp);
	temp.parentNode.removeChild(temp);
}

function NString(n) {

	const thousand = 1000;
	const million = 1000000;
	const billion = 1000000000;

	if (typeof n !== "number") {
		return "?";
	}

	if (n < thousand) {
		return n.toString();
	}

	if (n < 100 * thousand) {
		return (n / thousand).toFixed(1) + "k";
	}

	if (n < 999.5 * thousand) {
		return (n / thousand).toFixed(0) + "k";
	}

	if (n < 100 * million) {
		return (n / million).toFixed(1) + "M";
	}

	if (n < 999.5 * million) {
		return (n / million).toFixed(0) + "M";
	}

	if (n < 100 * billion) {
		return (n / billion).toFixed(1) + "B";
	}

	return (n / billion).toFixed(0) + "B";
}

function DateString(dt) {
	let y = dt.getFullYear();
	let m = dt.getMonth() + 1;
	let d = dt.getDate();
	let parts = [
		y.toString(),
		(m > 9 ? "" : "0") + m.toString(),
		(d > 9 ? "" : "0") + d.toString(),
	];
	return parts.join(".");
}

function DateAndTimeString(dt) {
	let date = dt.getFullYear()+"-"+(((dt.getMonth()+1)<10)?"0":"")+(dt.getMonth()+1)+"-"+((dt.getDate()<10)?"0":"")+dt.getDate();
	let time = ((dt.getHours()<10)?"0":"")+dt.getHours()+"-"+((dt.getMinutes()<10)?"0":"")+dt.getMinutes()+"-"+((dt.getSeconds()<10)?"0":"")+dt.getSeconds();
	return date + " " + time;
}

function QfromPawns(pawns) {

	// Note carefully: the arg is pawns not centipawns.

	if (typeof pawns !== "number") {
		return 0;
	}

	let winrate = 1 / (1 + Math.pow(10, -pawns / 4));
	let q = winrate * 2 - 1;

	if (q > 0.998) q = 0.998;
	if (q < -0.998) q = -0.998;

	return q;
}

function QfromWDL(wdl) {

	if (Array.isArray(wdl) === false || wdl.length !== 3) {
		return 0;
	}

	let winrate = (wdl[0] + (wdl[1] * 0.5)) / 1000;
	let q = winrate * 2 - 1;

	if (q > 0.998) q = 0.998;
	if (q < -0.998) q = -0.998;

	return q;
}

function Value(q) {					// Rescale Q to 0..1 range.
	if (typeof q !== "number") {
		return 0;
	}
	if (q < -1) {
		return 0;
	}
	if (q > 1) {
		return 1;
	}
	return (q + 1) / 2;
}

function SmoothStep(x) {
	if (x < 0) x = 0;
	if (x > 1) x = 1;
	return (-2 * x * x * x) + (3 * x * x);
}

function Sign(n) {
	if (n < 0) return -1;
	if (n > 0) return 1;
	return 0;
}

function CommaNum(n) {

	if (typeof n !== "number") {
		return JSON.stringify(n);
	}

	if (n < 1000) {
		return n.toString();
	}

	let ret = "";

	let n_string = n.toString();

	for (let i = 0; i < n_string.length; i++) {
		ret += n_string[i];
		if ((n_string.length - i) % 3 === 1 && n_string.length - i > 1) {
			ret += ",";
		}
	}

	return ret;
}

function DurationString(ms) {

	let hours = Math.floor(ms / 3600000);
	ms -= hours * 3600000;

	let minutes = Math.floor(ms / 60000);
	ms -= minutes * 60000;

	let seconds = Math.floor(ms / 1000);

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}

	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}

	return `${seconds}s`;
}

function NumbersBetween(a, b) {

	// Given integers a and b, return a list of integers between the two, inclusive.

	let add = a < b ? 1 : -1;

	let ret = [];

	for (let x = a; x !== b; x += add) {
		ret.push(x);
	}

	ret.push(b);

	return ret;
}

function RandInt(min, max) {
	if (typeof max !== "number") {		// DWIM.
		max = min;
		min = 0;
	}
	if (min >= max) {
		return min;
	}
	let ret = Math.floor(Math.random() * (max - min)) + min;
	if (ret >= max) {		// Probably impossible.
		ret = min;
	}
	return ret;
}

function RandChoice(arr) {
	if (Array.isArray(arr) === false || arr.length === 0) {
		return undefined;
	}
	return arr[RandInt(0, arr.length)];
}

function HighlightString(s, prefix, classname) {

	// Highlights the thing after the prefix

	if (s.startsWith(prefix) === false) {
		return s;
	}

	return prefix + `<span class="${classname}">` + s.slice(prefix.length) + `</span>`;
}

function StringIsNumeric(s) {
	for (let i = 0; i < s.length; i++) {
		let code = s.charCodeAt(i);
		if (code < 48 || code > 57) {
			return false;
		}
	}
	return true;
}

function FileExceedsGigabyte(filename, multiplier = 1) {
	try {
		let filesize = fs.statSync(filename).size;
		if (filesize >= 1073741824 * multiplier) {
			return true;
		} else {
			return false;
		}
	} catch (err) {
		console.log("While checking file size: ", err.toString());
		return false;		// Eh, who knows
	}
}
