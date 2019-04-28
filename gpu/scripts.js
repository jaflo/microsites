(function() {
	var short = document.getElementById("short");
	var full = document.getElementById("full");
	var result = document.getElementsByTagName("main")[0];
	short.textContent = "Unable to determine GPU.";

	try {
		var canvas = document.createElement("canvas");
		if (!canvas.getContext) {
			full.textContent = "HTML5 canvas is not supported. Your browser might be out of date.";
			return;
		}

		var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		if (!(gl && gl instanceof WebGLRenderingContext)) {
			full.textContent = "WebGL is not supported. Your hardware might not be supported.";
			return;
		}

		var debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
		if (!debugInfo) {
			full.textContent = "Unable to retrieve GPU information. Are privacy extensions active?";
			return;
		}

		var vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
		var renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

		var complete = renderer
			.replace(/OpenGL.*/g, "")
			.replace(/Direct3D.*/g, "")
			.replace(/.*Inc\./g, "")
			.replace("ANGLE (", "")
			.replace("Mesa DRI", "")
			.replace("(R)", "")
			.replace("(TM)", "")
			.trim();

		short.textContent = complete;
		full.textContent = vendor+" "+renderer;
		result.className = "success";
	} catch (e) {
		short.textContent = "Unexpected error: "+e.message;
		console.error(e);
	}
})();
