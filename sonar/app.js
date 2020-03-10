$(document).ready(function() {
	var scores = [], currentPings, pingCounts = 0, rot = 0, audioLoaded = false;
	var canvas = $("#results canvas")[0], ctx = canvas.getContext("2d");
	var w = canvas.width, h = canvas.height, r = w/2-10, zeroDeg = 0;
	var context = new (AudioContext || webkitAudioContext)();
	var source, panner, buffer;

	new BufferLoader(context, ["ding.mp3"], function(buffers) {
		buffer = buffers[0];
		panner = context.createPanner();
		panner.coneOuterGain = 0.1;
		panner.coneOuterAngle = 180;
		panner.coneInnerAngle = 0;
		panner.connect(context.destination);
		context.listener.setPosition(0, 0, 0);
		audioLoaded = true;
		move();
	}).load();

	$("#animation").removeClass("hidden");

	// http://stackoverflow.com/a/4378439/4938153
	if (window.DeviceOrientationEvent) {
		window.addEventListener("deviceorientation", function() {
			move(event.beta, event.gamma, event.alpha);
		}, true);
	} else if (window.DeviceMotionEvent) {
		window.addEventListener("devicemotion", function() {
			move(event.acceleration.x*2, event.acceleration.y*2, event.acceleration.z*2);
		}, true);
	} else {
		window.addEventListener("MozOrientation", function () {
			move(orientation.x*50, orientation.y*50, orientation.z*50);
		}, true);
	}

	var orientationTimeout = setTimeout(function() {
		$("#intro .status").text("Try this on your phone.");
	}, 500);

	function move(x, y, z) {
		clearTimeout(orientationTimeout);
		var tol = 10;
		if (!(-tol < x && x < tol && -tol < y && y < tol)) {
			$("#intro .status").text("Hold your device flat in front of you.");
			$("#intro button").addClass("disabled");
		} else if (!audioLoaded) {
			$("#intro .status").text("Loading audio...");
			$("#intro button").addClass("disabled");
		} else {
			$("#intro .status").text("Ready to go!");
			$("#intro button").removeClass("disabled");
		}
		rot = ((z-zeroDeg+360)%360)/360*Math.PI*2;
		if (audioLoaded && scores.length) {
			var mul = 5, pos = scores[scores.length-1].actual-rot;
			panner.setPosition(Math.cos(pos)*mul, Math.sin(pos)*mul, -0.5);
			panner.setOrientation(Math.cos(pos+Math.PI/2), Math.sin(pos+Math.PI/2), 1);
		}
	}

	$("#intro button").click(function() {
		if (!$(this).hasClass("disabled")) {
			scores = [];
			$("#rounds i").removeClass();
			$("#intro").hide();
			$("#main").show();
			zeroDeg = rot;
			nextPing();
		}
	});

	function nextPing() {
		if (source) source.stop();
		pingCounts = 0;
		$("#rounds i").removeClass("active pulse");
		var dot = $("#rounds i").eq(scores.length),
			position = Math.random()*Math.PI*2;
		dot.prev().addClass("completed");
		scores.push({
			actual: position,
			guessed: null
		});
		dot.addClass("active");
		$("#main p").text("Point at the sound");
		if (currentPings) clearInterval(currentPings);
		currentPings = setInterval(function() {
			dot.removeClass("pulse").outerWidth();
			if (pingCounts >= 3) {
				clearInterval(currentPings);
				pingCounts = 0;
				$("#main p").text("Shoot at the sound");
			} else {
				dot.addClass("pulse");
				source = context.createBufferSource();
				source.buffer = buffer;
				source.connect(panner);
				source.start(0);
				pingCounts++;
			}
		}, 1000);
	}

	/*$("html").click(function(e) {
		if (!$(e.target).is("button") && !$("#results").is(":visible")) {
			$("#wrap > div:visible button").click();
		}
	});*/

	$("#main button").click(function() {
		scores[scores.length-1].guessed = rot+90; // ????
		if (scores.length >= 5) {
			canvas.width = w;
			ctx.beginPath();
			ctx.arc(w/2, h/2, r, 0, 2*Math.PI, false);
			ctx.lineWidth = 6;
			ctx.strokeStyle = "rgba(255,255,255,0.2)";
			ctx.stroke();
			var differences = 0;
			for (var i = 0; i < scores.length; i++) {
				ctx.beginPath();
				ctx.moveTo(Math.cos(scores[i].guessed)*r+w/2, Math.sin(scores[i].guessed)*r+h/2);
				ctx.quadraticCurveTo(
					Math.cos((scores[i].guessed+scores[i].actual)/2)*r/10+w/2,
					Math.sin((scores[i].guessed+scores[i].actual)/2)*r/10+h/2,
					Math.cos(scores[i].actual)*r+w/2,
					Math.sin(scores[i].actual)*r+h/2);
				ctx.lineWidth = 6;
				ctx.strokeStyle = "rgba(255,255,255,0.2)";
				ctx.stroke();
				var color = "hsl("+(i/scores.length*360),
					difference = ((scores[i].guessed-scores[i].actual+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*360;
				drawDot(scores[i].guessed, color+",30%,50%)");
				drawDot(scores[i].actual, color+",100%,50%)");
				differences += difference >= 180 ? (difference - 180) : difference;
			}
			$("#results h2").text((differences/scores.length)|0);
			$("#main").hide();
			$("#results").show();
		} else {
			nextPing();
		}
	});

	function drawDot(rot, color) {
		ctx.beginPath();
		ctx.arc(Math.cos(rot)*r+w/2, Math.sin(rot)*r+h/2, 10, 0, 2*Math.PI, false);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.lineWidth = 5;
		ctx.strokeStyle = "black";
		ctx.stroke();
	}

	$("#results button").click(function() {
		$("#results").hide();
		$("#intro").show();
	});
});
