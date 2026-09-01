function Graphics(canvas_)
{
	var canvas = canvas_;
	var canvas3D = canvas;
	var canvasW = canvas.width;
	var canvasH = canvas.height;

	var canvas2D = document.createElement('canvas');
	canvas2D.width = canvas.width;
	canvas2D.height = canvas.height;
	canvas2D.style.position = canvas.style.position;
	canvas2D.style.left = canvas.style.left;
	canvas2D.style.top = canvas.style.top;
	canvas2D.style.zIndex = canvas.style.zIndex+1;
	canvas2D.style.cursor = "none";
	canvas2D.style.pointerEvents = "none";
	canvas2D.tabIndex = -1;
	if (canvas.parentNode != undefined)
	{
		canvas.parentNode.insertBefore(canvas2D, canvas);
	}

	var canvasAspect = canvasW / canvasH;
	var context = canvas2D.getContext('2d');
	var gl = canvas3D.getContext('webgl2', { alpha: false, depth: true });
	var defaultShader;
	var vertexBuffer;
	var vsPositionLoc;
	var vsViewProjMtxLoc;
	var vsZOffsetLoc;
	var psColorLoc;
	var depthOffset = 0;

	function compileShader(gl, type, source) 
	{
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
		{
			console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	function setup()
	{

		defaultShader = (function()
		{
			const vsCode = `#version 300 es
				precision highp float;

				in			vec3	ATTRIB_Position;
				uniform		mat4	g_viewProjMtx;
				uniform		float	g_zOffset;
			
				void main() 
				{
					gl_Position = g_viewProjMtx * vec4(ATTRIB_Position, 1.0);
					gl_Position.z += g_zOffset * gl_Position.w;
				}`;

			const psCode = `#version 300 es
				precision highp float;
			
				uniform vec4 g_color;
				out vec4 outFragColor;

				void main() 
				{
					if (!gl_FrontFacing)
					{
						ivec2 pixelCoords = ivec2(gl_FragCoord);

						if ( ( (pixelCoords.x % 2) ^ (pixelCoords.y % 2) ) != 0 )
							discard;
					}

					outFragColor = g_color;
				}`;

			const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsCode);
			const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, psCode);
	
			const program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);

			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) 
			{
				console.error("Program linking failed:", gl.getProgramInfoLog(program));
			}

			return program;
		})();

		vertexBuffer		= gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, 3*1024*512, gl.DYNAMIC_DRAW);

		vsPositionLoc		= gl.getAttribLocation(defaultShader, "ATTRIB_Position");
		vsViewProjMtxLoc	= gl.getUniformLocation(defaultShader, "g_viewProjMtx");
		vsZOffsetLoc		= gl.getUniformLocation(defaultShader, "g_zOffset");
		psColorLoc			= gl.getUniformLocation(defaultShader, "g_color");
	}

	this.setViewProjMtx = function(viewProjMtx)
	{
		gl.uniformMatrix4fv(vsViewProjMtxLoc, false, viewProjMtx);
	}

	this.getContext = function()
	{
		return context;
	}

	this.setDepthOffset = function(o)
	{
		depthOffset = o;
		gl.uniform1f(vsZOffsetLoc, o / Math.pow(2,16));
	}

	this.depthCompareOnly = function()
	{
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL); 
		gl.depthMask(false);
	}

	this.noDepth = function()
	{
		gl.disable(gl.DEPTH_TEST);
	}

	this.depthReadWrite = function()
	{
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL); 
		gl.depthMask(true);
	}

	this.disableColorWrites = function()
	{
		gl.colorMask(false, false, false, false);
	}

	this.enableColorWrites = function(v)
	{
		if (v == undefined)
			v = true;

		gl.colorMask(v, v, v, v);
	}
	this.cullFront = function()
	{
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);
	}

	this.cullBack = function()
	{
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
	}

	this.cullNone = function()
	{
		gl.disable(gl.CULL_FACE);
	}

	this.onResize = function()
	{
		context = canvas2D.getContext('2d');
		gl = canvas3D.getContext('webgl2', { alpha: false, depth: true });
		canvasW = canvas.width;
		canvasH = canvas.height;
		canvasAspect = canvasW / canvasH;

		canvas2D.width = canvas.width;
		canvas2D.height = canvas.height;
	}
	
	this.drawLine = function(a,b,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = [0,0,0,1];

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		gl.uniform4f(psColorLoc, ...color);

		if (width > 0)
		{
			gl.lineWidth(width);
			var points = new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
			gl.drawArrays(gl.LINES, 0, 2);
		}
	}
	
	this.drawLineStrip = function(points, closed, color, width, dash, fillColor)
	{
		if (points.length < 2)
			return;

		if (typeof(color) === "undefined")
			color = [0,0,0,1];

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		var glPoints = new Float32Array((points.length + (closed ? 1 : 0)) * 3);

		for (var i = 0; i < points.length; ++i)
		{
			glPoints[i*3 + 0] = points[i].x;
			glPoints[i*3 + 1] = points[i].y;
			glPoints[i*3 + 2] = points[i].z;
		}

		if (closed)
		{
			glPoints[points.length * 3 + 0] = points[0].x;
			glPoints[points.length * 3 + 1] = points[0].y;
			glPoints[points.length * 3 + 2] = points[0].z;
		}

		if (width > 0)
		{
			gl.uniform4f(psColorLoc, ...color);

			gl.lineWidth(width);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, glPoints);
			gl.drawArrays(gl.LINE_STRIP, 0, glPoints.length/3);
		}

		if (fillColor !== undefined)
		{
		}
	}

	this.drawLines = function(points, color, width, dash, fillColor)
	{
		if (points.length < 2)
			return;

		if (typeof(color) === "undefined")
			color = [0,0,0,1];

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		var glPoints = new Float32Array(points.length * 3);

		for (var i = 0; i < points.length; ++i)
		{
			glPoints[i*3 + 0] = points[i].x;
			glPoints[i*3 + 1] = points[i].y;
			glPoints[i*3 + 2] = points[i].z;
		}

		if (width > 0)
		{
			gl.uniform4f(psColorLoc, ...color);

			gl.lineWidth(width);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, glPoints);
			gl.drawArrays(gl.LINES, 0, glPoints.length/3);
		}

		if (fillColor !== undefined)
		{
		}
	}

	this.drawTriangle = function(p0, p1, p2, color, fillColor, width, dash)
	{
		if (typeof(color) === "undefined")
			color = [0,0,0,1];

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		var glPoints = new Float32Array(3 * 3);
		
		glPoints[0*3 + 0] = p0.x;
		glPoints[0*3 + 1] = p0.y;
		glPoints[0*3 + 2] = p0.z;

		glPoints[1*3 + 0] = p1.x;
		glPoints[1*3 + 1] = p1.y;
		glPoints[1*3 + 2] = p1.z;

		glPoints[2*3 + 0] = p2.x;
		glPoints[2*3 + 1] = p2.y;
		glPoints[2*3 + 2] = p2.z;

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, glPoints);

		if (fillColor != undefined)
		{
			gl.uniform4f(psColorLoc, ...fillColor);

			//gl.depthMask(fillColor[3]>=1);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
		}

		if (width > 0)
		{
			var offsetBackup = depthOffset;

			this.setDepthOffset(depthOffset - 3);

			gl.uniform4f(psColorLoc, ...color);

			gl.lineWidth(width);
			gl.drawArrays(gl.LINE_LOOP, 0, 3);

			this.setDepthOffset(offsetBackup);
		}
	}

	this.drawTriangleList = function(points, color, fillColor, width, dash)
	{
		if (typeof(color) === "undefined")
			color = [0,0,0,1];

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		var glPoints = new Float32Array(points.length * 3);

		for (var i = 0; i < points.length; ++i)
		{
			glPoints[i*3 + 0] = points[i].x;
			glPoints[i*3 + 1] = points[i].y;
			glPoints[i*3 + 2] = points[i].z;
		}

		gl.bufferSubData(gl.ARRAY_BUFFER, 0, glPoints);

		if (fillColor != undefined)
		{
			gl.uniform4f(psColorLoc, ...fillColor);
			//gl.depthMask(fillColor[3]>=1);

			gl.drawArrays(gl.TRIANGLES, 0, points.length);
		}

		if (width > 0)
		{
			gl.uniform4f(psColorLoc, ...color);

			gl.lineWidth(width);

			for (var i = 0; i < points.length; i+=3)
			{
				gl.drawArrays(gl.LINE_LOOP, i, 3);
			}
		}
	}
	this.drawArrow = function(pStart,pEnd,sizeInPixels, color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = [0,0,0,1];

		if (typeof(dash) === "undefined")
			dash = [];

		if (typeof(width) === "undefined")
			width = 1;

		if (sizeInPixels == undefined)
			sizeInPixels = 20;

		var glPoints = new Float32Array(2 * 3);
		
		glPoints[0*3 + 0] = pStart.x;
		glPoints[0*3 + 1] = pStart.y;
		glPoints[0*3 + 2] = pStart.z;

		glPoints[1*3 + 0] = pEnd.x;
		glPoints[1*3 + 1] = pEnd.y;
		glPoints[1*3 + 2] = pEnd.z;

		pStart = new Vector(pStart[0], pStart[1], 0);
		pEnd = new Vector(pEnd[0], pEnd[1], 0);

		var length = sub(pEnd, pStart).length();
		V = sub(pEnd, pStart).unit();

		var B = add(pStart, mul(V, length-sizeInPixels-width/2));
		var E = add(pStart, mul(V,length));
		var T = new Vector(V.y, -V.x, 0);
		var P0 = add(B, mul(T, 5*sizeInPixels/20 + width/2));
		var P1 = add(B, mul(T, -5*sizeInPixels/20 - width/2));

		//context.lineWidth = width;
		//context.strokeStyle = color;
		context.fillStyle = color;
		//context.setLineDash(dash);

		// Line
		context.beginPath();
		context.moveTo(pStart.x, pStart.y);
		context.lineTo(B.x, B.y);
		context.stroke();

		// Arrow head
		context.beginPath();
		//context.lineWidth = 1;
		//context.setLineDash([]);
		context.moveTo(E.x, E.y);
		context.lineTo(P0.x, P0.y);
		context.lineTo(P1.x, P1.y);
		context.lineTo(E.x, E.y);
		context.stroke();
		context.fill();
	}

	this.drawText = function(x,y,text,color,align,angle,font)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(align) === "undefined")
			align = "center";

		if (font === undefined)
			font = "16px 'Arial'";


		context.translate(x, y);

		if (angle !== undefined)
		{
			context.rotate(-angle);// * Math.PI / 180);
		}

		context.font = font;
		context.textAlign = align;
		context.fillStyle = color;

		context.fillText(text, 0, 0);

		if (angle !== undefined)
		{
			context.rotate(angle);// * Math.PI / 180);
		}

		context.translate(-x, -y);
	}
		
	this.clear = function(color)
	{
		if (color == undefined)
		{
			color = [1,1,1,1];
		}
		
		context.clearRect(0,0,canvasW,canvasH);

		gl.frontFace(gl.CW);
		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.clearColor(...color);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		this.depthReadWrite();
		this.enableColorWrites();
		this.cullNone();

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.blendEquation(gl.FUNC_ADD);

		gl.useProgram(defaultShader);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.enableVertexAttribArray(vsPositionLoc);
		gl.vertexAttribPointer(vsPositionLoc, 3, gl.FLOAT, false, 0, 0);

		this.setDepthOffset(0);
	}
	
	this.measureText = function(text, font)
	{
		if (font == undefined)
		{
			font = "16px 'Arial'";
		}

		context.font = font;

		var p = { 
					x: context.measureText(text).width,
					y: context.measureText("M").width
				}
		
		return p;
	}

	setup();
}
