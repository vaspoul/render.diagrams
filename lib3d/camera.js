function Camera(mainCanvas,  svg)
{
	var canvas = mainCanvas;
	var graphics = new Graphics(canvas, svg);
	var canvasW = mainCanvas.width;
	var canvasH = mainCanvas.height;

	var view_target = new Vector(0,0,0);
	var view_distance = 10;
	var view_anglePhi = 60;
	var view_angleTheta = -45;
	var viewX;
	var viewY;
	var viewZ;
	var invViewX;
	var invViewY;
	var invViewZ;
	var FOV = 70;
	var aspect = canvasW / canvasH;
	var near = 0.1;
	var far = 1000;
	var orthographic = false;
	var autoOrtho = true;
	var view_position;
	var lighting = false;

	var viewMtx = new Array(4);
	var viewMtxT = new Array(4);
	var projMtx = new Array(4);
	var viewProjMtx = new Array(16);

	canvas.addEventListener('mousemove', onMouseMove, false);
	canvas.addEventListener('mousedown', onMouseDown, false);
	canvas.addEventListener('mouseup', onMouseUp, false);
	canvas.addEventListener('dblclick', onMouseDblClick, false);
	canvas.addEventListener('keydown', onKeyDown, false);
	canvas.addEventListener('keyup', onKeyUp, false);
	canvas.onwheel = onMouseWheel;
	canvas.oncontextmenu = onContextMenu;

	this.setFOV = function(value)
	{
		FOV = value;
		updateProjection();
	}

	this.getFOV = function()
	{
		return FOV;
	}

	function setOrthographic(value)
	{
		orthographic = value;

		if (orthographic)
		{
			view_angleTheta = Math.round(view_angleTheta / orthoRotationSnap) * orthoRotationSnap;
			view_anglePhi = Math.round(view_anglePhi / orthoRotationSnap) * orthoRotationSnap;
		}

		updateProjection();
	}

	this.setOrthographic = setOrthographic;

	this.getOrthographic = function()
	{
		return orthographic;
	}

	this.setAutoOrtho = function(value)
	{
		autoOrtho = value;
		updateProjection();
	}

	this.getAutoOrtho = function()
	{
		return autoOrtho;
	}

	this.getAnglePhi = function()
	{
		return view_anglePhi;
	}

	this.getAngleTheta = function()
	{
		return view_angleTheta;
	}

	this.getViewTarget = function()
	{
		return view_target;
	}

	this.getViewDistance = function()
	{
		return view_distance;
	}

	this.getViewPos = function()
	{
		return view_position;
	}

	this.getViewX = function()
	{
		return viewX;
	}

	this.getViewY = function()
	{
		return viewY;
	}

	this.getViewZ = function()
	{
		return viewZ;
	}

	// Custom WebGL scene renderers can share the camera without going through
	// the immediate-mode Graphics drawing helpers.
	this.getViewProjMtx = function()
	{
		return viewProjMtx;
	}

	this.setView = function(anglePhi, angleTheta, target, distance)
	{
		view_anglePhi		= (anglePhi == undefined)	? view_anglePhi		: anglePhi;
		view_angleTheta		= (angleTheta == undefined) ? view_angleTheta	: angleTheta;
		view_target			= (target == undefined)		? view_target		: target.copy();
		view_distance		= (distance == undefined)	? view_distance		: distance;

		updateProjection();
	}

	this.enableLighting = function()
	{
		lighting = true;
	}

	this.disableLighting = function()
	{
		lighting = false;
	}

	this.onResize = function()
	{
		canvasW = canvas.width;
		canvasH = canvas.height;
		aspect = canvasW / canvasH;

		updateProjection();

		graphics.onResize();
	}

	function updateProjection()
	{
		if (autoOrtho)
		{
			var threshold = 5;

			if ( !orthographic && Math.abs(view_angleTheta % 90) < threshold && Math.abs(view_anglePhi % 90) < threshold )
			{
				view_angleTheta = Math.round(view_angleTheta / 90) * 90;
				view_anglePhi = Math.round(view_anglePhi / 90) * 90;
				orthographic = true;
			}
			else if ( orthographic && (Math.abs(view_angleTheta % 90) > threshold || Math.abs(view_anglePhi % 90) > threshold) )
			{
				setOrthographic(false);
			}
		}

		var cosX = Math.cos(view_angleTheta * Math.PI / 180);
		var sinX = Math.sin(view_angleTheta * Math.PI / 180);
		var cosY = Math.cos(view_anglePhi * Math.PI / 180);
		var sinY = Math.sin(view_anglePhi * Math.PI / 180);

		var x = new Vector(	        cosY,        0,       -sinY);
		var y = new Vector( -sinY * sinX,	  cosX,	 -cosY*sinX);
		var z = new Vector(  sinY * cosX,     sinX,   cosY*cosX);

		viewX = x;
		viewY = y;
		viewZ = z;

		view_position = mad(z, -view_distance, view_target);

		viewMtx[0] = [ x.x, x.y, x.z, -dot(view_position, x) ];
		viewMtx[1] = [ y.x, y.y, y.z, -dot(view_position, y) ];
		viewMtx[2] = [ z.x, z.y, z.z, -dot(view_position, z) ];

		viewMtxT[0] = [ viewMtx[0][0], viewMtx[1][0], viewMtx[2][0], 0 ];
		viewMtxT[1] = [ viewMtx[0][1], viewMtx[1][1], viewMtx[2][1], 0 ];
		viewMtxT[2] = [ viewMtx[0][2], viewMtx[1][2], viewMtx[2][2], 0 ];
		viewMtxT[3] = [ viewMtx[0][3], viewMtx[1][3], viewMtx[2][3], 1 ];


		invViewX = new Vector(x.x, y.x, z.x);
		invViewY = new Vector(x.y, y.y, z.y);
		invViewZ = new Vector(x.z, y.z, z.z);

		if (orthographic)
		{
			var orthoHeight = Math.tan(FOV * 0.5 * Math.PI / 180) * 2 * view_distance;
			var orthoWidth = orthoHeight * aspect;
			var F = far;
			var N = near;

			projMtx[0] = [ 2 / orthoWidth, 0, 0, 0 ];
			projMtx[1] = [ 0, 2 / orthoHeight, 0, 0 ];
			projMtx[2] = [ 0, 0, 1 / (F-N),	-N / (F-N) ];
			projMtx[3] = [ 0, 0, 0, 1 ];
		}
		else
		{
			var yScale = 1 / Math.tan(FOV * Math.PI / 180 * 0.5);
			var xScale = yScale / aspect;
			var F = far;
			var N = near;

			projMtx[0] = [ xScale, 0, 0, 0 ];
			projMtx[1] = [ 0, yScale, 0, 0 ];
			projMtx[2] = [ 0, 0, F / (F-N),	-F*N / (F-N) ];
			projMtx[3] = [ 0, 0, 1, 0 ];
		}

		for (var r=0; r!=4; ++r)
		{
			for (var c=0; c!=4; ++c)
			{
				viewProjMtx[r*4 + c] = dot4(viewMtxT[r], projMtx[c]);
			}
		}
	}

	this.transformP = function(v)
	{
		var v4 = [v.x, v.y, v.z, 1];
		var viewPos = [ dot4(v4, viewMtx[0]), dot4(v4, viewMtx[1]), dot4(v4, viewMtx[2]), 1 ];

		var projPos = [ dot4(viewPos, projMtx[0]), dot4(viewPos, projMtx[1]), dot4(viewPos, projMtx[2]), dot4(viewPos, projMtx[3]) ];

		projPos[0] /= projPos[3];
		projPos[1] /= projPos[3];
		projPos[2] /= projPos[3];

		var screenPos = new Vector((projPos[0] * 0.5 + 0.5) * canvasW, (-projPos[1] * 0.5 + 0.5) * canvasH, projPos[2]);
		screenPos.w = projPos[3];

		return screenPos;
	}

	this.transformN = function(v)
	{
		var v4 = [v.x, v.y, v.z, 0];
		return new Vector(dot4(v4, viewMtx[0]), dot4(v4, viewMtx[1]), dot4(v4, viewMtx[2]));
	}

	this.screenToWorld = function(x,y)
	{
		var ndcPos = new Vector(x/canvasW * 2 - 1,  1 - y/canvasH * 2, 0);
		var n = orthographic ? 1 : near;
		var viewPos = new Vector(ndcPos.x / projMtx[0][0] * n, ndcPos.y / projMtx[1][1] * n, near);
		var worldPos = mad(viewX, viewPos.x, mad(viewY, viewPos.y, mad(viewZ, viewPos.z, view_position)));

		return worldPos;
	}
	
	this.pixelsToLength = function(x,y)
	{
		var ndcPos = {x: x/canvasW * 2, y:y/canvasH * 2};
		var n = orthographic ? 1 : near;
		var viewPos = {x: ndcPos.x / projMtx[0][0] * n, y:ndcPos.y / projMtx[1][1] * n };

		return viewPos;
	}

	this.clear = function(color)
	{
		graphics.clear(color);
		graphics.setViewProjMtx(viewProjMtx);
	}

	this.setDepthOffset = function(o)
	{
		graphics.setDepthOffset(o);
	}

	this.drawTarget = function()
	{
		this.drawPoint(view_target, [0,0,0,1]);
	}

	this.drawPoint = function(p, color)
	{
		var sp = this.transformP(p);

		var size = 2 / (canvasW/2) * sp.w / projMtx[0][0];

		this.drawQuad(p, size, size, viewX, viewY, color, 1, color);
	}

	this.drawPoints = function(p, color)
	{
		var points2D = new Array(6 * p.length);

		var quadPoints = new Array(6);
		quadPoints[0] = mad(viewX, -1, mul(viewY, -1));
		quadPoints[1] = mad(viewX, -1, mul(viewY, +1));
		quadPoints[2] = mad(viewX, +1, mul(viewY, -1));
		quadPoints[3] = mad(viewX, +1, mul(viewY, -1));
		quadPoints[4] = mad(viewX, -1, mul(viewY, +1));
		quadPoints[5] = mad(viewX, +1, mul(viewY, +1));

		for (var i=0; i!=p.length; ++i)
		{
			var sp = this.transformP(p[i]);

			var halfSize = 0.5 * 3 / (canvasW/2) * sp.w / projMtx[0][0];

			points2D[i*6 + 0] = mad(quadPoints[0], halfSize, p[i]);
			points2D[i*6 + 1] = mad(quadPoints[1], halfSize, p[i]);
			points2D[i*6 + 2] = mad(quadPoints[2], halfSize, p[i]);
			points2D[i*6 + 3] = mad(quadPoints[3], halfSize, p[i]);
			points2D[i*6 + 4] = mad(quadPoints[4], halfSize, p[i]);
			points2D[i*6 + 5] = mad(quadPoints[5], halfSize, p[i]);
		}
		
		graphics.drawTriangleList(points2D, color, color, 0);
	}

	this.drawLine = function(a,b,color,width,dash,ownerObject)
	{
		return graphics.drawLine(a, b, color, width, dash);
	}

	this.drawRay = function(p, dir, length, color, width, dash, ownerObject)
	{
		return graphics.drawLine(p, mad(dir, length, p), color, width, dash);
	}

	this.drawLineStrip = function(points, closed, color, width, fillColor, dash)
	{
		return graphics.drawLineStrip(points, closed, color, width, dash, fillColor);
	}

	this.drawLines = function(points, color, width, fillColor, dash)
	{
		return graphics.drawLines(points, color, width, dash, fillColor);
	}

	this.drawTriangle = function(p0, p1, p2, color, width, fillColor, dash)
	{
		var faceNormal = cross(sub(p1, p0).unit(), sub(p2, p0).unit()).unit();

		//var lightingFactor = pow(this.getOrthographic() ? abs(this.transformN(faceNormal).z) : abs(dot(sub(p0, this.getViewPos()), faceNormal)), 3);
		var lightingFactor = pow(abs(this.transformN(faceNormal).z), 3);

		fillColorN = fillColor;

		if (fillColor != undefined)
		{
			if (lighting)
			{
				fillColorN = Array.from(fillColor, (x) => x *= lightingFactor);
				//fillColorN[0] = lerp(fillColor[0], 1, lightingFactor);
				//fillColorN[1] = lerp(fillColor[1], 1, lightingFactor);
				//fillColorN[2] = lerp(fillColor[2], 1, lightingFactor);
			}
		}

		return graphics.drawTriangle(p0, p1, p2, color, fillColorN, width, dash);
	}

	this.drawQuad = function(p, sizeX, sizeY, xAxis, yAxis, color, width, fillColor, dash)
	{
		if (xAxis == undefined)
			xAxis = new Vector(1,0,0);

		if (yAxis == undefined)
			yAxis = new Vector(0,1,0);

		var points = new Array(4);

		points[0] = mad(xAxis, -sizeX * 0.5, mad(yAxis, +sizeY * 0.5, p));
		points[1] = mad(xAxis, +sizeX * 0.5, mad(yAxis, +sizeY * 0.5, p));
		points[2] = mad(xAxis, +sizeX * 0.5, mad(yAxis, -sizeY * 0.5, p));
		points[3] = mad(xAxis, -sizeX * 0.5, mad(yAxis, -sizeY * 0.5, p));

		this.drawTriangle(points[0], points[1], points[2], color, 0, fillColor);
		this.drawTriangle(points[2], points[3], points[0], color, 0, fillColor);

		graphics.setDepthOffset(-3);
		this.drawLineStrip(points, true, color, width, fillColor, dash);
		graphics.setDepthOffset(0);
	}

	this.drawQuad4 = function(p0, p1, p2, p3, color, width, fillColor, dash)
	{
		this.drawTriangle(p0, p1, p2, color, 0, fillColor);
		this.drawTriangle(p2, p3, p0, color, 0, fillColor);

		graphics.setDepthOffset(-3);
		this.drawLineStrip([p0, p1, p2, p3], true, color, width, fillColor, dash);
		graphics.setDepthOffset(0);
	}

	this.drawCircle = function(p, radius, xAxis, yAxis, color, width, fillColor, segments, dash)
	{
		if (typeof(segments) === "undefined")
			segments = 64;

		var points = new Array(segments);

		for (var i = 0; i < segments; ++i)
		{
			var angle = (i/segments) * Math.PI * 2;
			var cosAngle = Math.cos(angle);
			var sinAngle = Math.sin(angle);
			points[i] = mad(xAxis, cosAngle * radius, mad(yAxis, sinAngle * radius, p));
		}

		if (fillColor != undefined)
		{
			var triPoints = new Array(segments * 3);
		
			for (var i = 0; i < segments; ++i)
			{
				triPoints[i*3 + 0] = points[i];
				triPoints[i*3 + 1] = points[ (i+1) % points.length ];
				triPoints[i*3 + 2] = p;
			}

			graphics.drawTriangleList(triPoints, color, fillColor, 0, dash);
		}

		graphics.setDepthOffset(-3);
		this.drawLineStrip(points, true, color, width, fillColor, dash);
		graphics.setDepthOffset(0);
	}

	this.drawCapsule = function(p, halfLength, radius, longAxis, shortAxis, color, width, fillColor, segments, dash)
	{
		if (typeof(segments) === "undefined")
			segments = 32;

		segments *= 2;

		var points = new Array(segments);

		for (var i = 0; i < segments; ++i)
		{
			var angle = Math.PI / 2 + (i/segments) * Math.PI * 2;
			var cosAngle = Math.cos(angle);
			var sinAngle = Math.sin(angle);
			var offset = (i>=segments/2) ? halfLength : -halfLength;
			points[i] = mad(longAxis, offset, mad(longAxis, cosAngle * radius, mad(shortAxis, sinAngle * radius, p)));
		}

		return this.drawLineStrip(points, true, color, width, fillColor, dash);
	}

	this.drawCube = function(o, sizeX, sizeY, sizeZ, xAxis, yAxis, zAxis, color, width, fillColor, dash)
	{
		var halfSizeX = sizeX;
		var halfSizeY = sizeY;
		var halfSizeZ = sizeZ;
		
		var p = new Array(8);

		p[0] = mad(xAxis, -halfSizeX, mad(yAxis, +halfSizeY, mad(zAxis, -halfSizeZ, o)));
		p[1] = mad(xAxis, +halfSizeX, mad(yAxis, +halfSizeY, mad(zAxis, -halfSizeZ, o)));
		p[2] = mad(xAxis, +halfSizeX, mad(yAxis, -halfSizeY, mad(zAxis, -halfSizeZ, o)));
		p[3] = mad(xAxis, -halfSizeX, mad(yAxis, -halfSizeY, mad(zAxis, -halfSizeZ, o)));

		p[4] = mad(xAxis, -halfSizeX, mad(yAxis, +halfSizeY, mad(zAxis, halfSizeZ, o)));
		p[5] = mad(xAxis, +halfSizeX, mad(yAxis, +halfSizeY, mad(zAxis, halfSizeZ, o)));
		p[6] = mad(xAxis, +halfSizeX, mad(yAxis, -halfSizeY, mad(zAxis, halfSizeZ, o)));
		p[7] = mad(xAxis, -halfSizeX, mad(yAxis, -halfSizeY, mad(zAxis, halfSizeZ, o)));

		this.drawTriangle(p[0], p[1], p[2], color, 0, fillColor);
		this.drawTriangle(p[2], p[3], p[0], color, 0, fillColor);

		this.drawTriangle(p[0], p[4], p[5], color, 0, fillColor);
		this.drawTriangle(p[5], p[1], p[0], color, 0, fillColor);

		this.drawTriangle(p[2], p[1], p[5], color, 0, fillColor);
		this.drawTriangle(p[5], p[6], p[2], color, 0, fillColor);

		this.drawTriangle(p[4], p[0], p[3], color, 0, fillColor);
		this.drawTriangle(p[3], p[7], p[4], color, 0, fillColor);

		this.drawTriangle(p[3], p[2], p[6], color, 0, fillColor);
		this.drawTriangle(p[6], p[7], p[3], color, 0, fillColor);

		this.drawTriangle(p[5], p[4], p[7], color, 0, fillColor);
		this.drawTriangle(p[7], p[6], p[5], color, 0, fillColor);

		graphics.setDepthOffset(-3);
		this.drawLineStrip([p[0], p[1], p[2], p[3]] , true, color, width, fillColor, dash);
		this.drawLineStrip([p[7], p[6], p[5], p[4]] , true, color, width, fillColor, dash);
		this.drawLineStrip([p[0], p[4], p[5], p[1]] , true, color, width, fillColor, dash);
		this.drawLineStrip([p[1], p[5], p[6], p[2]] , true, color, width, fillColor, dash);
		this.drawLineStrip([p[2], p[6], p[7], p[3]] , true, color, width, fillColor, dash);
		this.drawLineStrip([p[0], p[3], p[7], p[4]] , true, color, width, fillColor, dash);
		graphics.setDepthOffset(0);
	}

	this.drawSphere = function(o, radius, xAxis, yAxis, zAxis, color, width, fillColor, dash, phiCount, thetaCount)
	{
		if (xAxis == undefined)
			xAxis = new Vector(1,0,0);

		if (yAxis == undefined)
			yAxis = new Vector(0,1,0);

		if (zAxis == undefined)
			zAxis = new Vector(0,0,1);

		if (typeof(phiCount) === "undefined")
			phiCount = 64;
		
		if (typeof(thetaCount) === "undefined")
			thetaCount = 32;

		var phiStep = Math.PI * 2 / phiCount;
		var thetaStep = Math.PI / thetaCount;

		var points = new Array(phiCount*thetaCount*6);
		var pointIndex = 0;

		for (var phiIndex=0; phiIndex < phiCount; ++phiIndex)
		{
			for (var thetaIndex=0; thetaIndex < thetaCount; ++thetaIndex)
			{
				var phi0 = phiIndex * phiStep;
				var theta0 = thetaIndex * thetaStep;
				var phi1 = (phiIndex + 1) * phiStep;
				var theta1 = (thetaIndex + 1) * thetaStep;

				var p = new Array(4);

				p[0] = mad(xAxis, Math.cos(phi0) * Math.sin(theta0) * radius, mad(zAxis, Math.sin(phi0) * Math.sin(theta0) * radius, mad(yAxis, Math.cos(theta0) * radius, o)));
				p[1] = mad(xAxis, Math.cos(phi1) * Math.sin(theta0) * radius, mad(zAxis, Math.sin(phi1) * Math.sin(theta0) * radius, mad(yAxis, Math.cos(theta0) * radius, o)));
				p[2] = mad(xAxis, Math.cos(phi1) * Math.sin(theta1) * radius, mad(zAxis, Math.sin(phi1) * Math.sin(theta1) * radius, mad(yAxis, Math.cos(theta1) * radius, o)));
				p[3] = mad(xAxis, Math.cos(phi0) * Math.sin(theta1) * radius, mad(zAxis, Math.sin(phi0) * Math.sin(theta1) * radius, mad(yAxis, Math.cos(theta1) * radius, o)));

				points[pointIndex++] = p[0];
				points[pointIndex++] = p[1];
				points[pointIndex++] = p[2];
				points[pointIndex++] = p[2];
				points[pointIndex++] = p[3];
				points[pointIndex++] = p[0];
			}
		}

		graphics.drawTriangleList(points, color, fillColor, 0);
	}
	
	this.drawCone = function(o, radiusTop, radiusBottom, height, xAxis, yAxis, zAxis, color, width, fillColor, dash, phiCount, heightCount)
	{
		if (typeof(phiCount) === "undefined")
			phiCount = 64;
		
		if (typeof(heightCount) === "undefined")
			heightCount = 2;
		else
			heightCount = Math.max(2, heightCount);

		var phiStep = Math.PI * 2 / phiCount;
		var heightStep = height / heightCount;

		for (var phiIndex=0; phiIndex < phiCount; ++phiIndex)
		{
			for (var heightIndex=0; heightIndex < heightCount; ++heightIndex)
			{
				var phi0 = phiIndex * phiStep;
				var height0 = heightIndex * heightStep;
				var phi1 = (phiIndex + 1) * phiStep;
				var height1 = (heightIndex + 1) * heightStep;
				var radius0 = radiusTop + (radiusBottom - radiusTop) / height * height0;
				var radius1 = radiusTop + (radiusBottom - radiusTop) / height * height1;

				var p = new Array(4);

				p[0] = mad(xAxis, Math.cos(phi0) * radius0, mad(zAxis, Math.sin(phi0) * radius0, mad(yAxis, height0, o)));
				p[1] = mad(xAxis, Math.cos(phi1) * radius0, mad(zAxis, Math.sin(phi1) * radius0, mad(yAxis, height0, o)));
				p[2] = mad(xAxis, Math.cos(phi1) * radius1, mad(zAxis, Math.sin(phi1) * radius1, mad(yAxis, height1, o)));
				p[3] = mad(xAxis, Math.cos(phi0) * radius1, mad(zAxis, Math.sin(phi0) * radius1, mad(yAxis, height1, o)));

				this.drawTriangle(p[0], p[1], p[2], color, 0, fillColor);
				this.drawTriangle(p[2], p[3], p[0], color, 0, fillColor);
			}
		}
	}

	this.drawSphericalCap = function(o, dir, radius, FOV, color, width, fillColor, dash, phiCount, thetaCount)
	{
		if (typeof(phiCount) === "undefined")
			phiCount = 64;
		
		if (typeof(thetaCount) === "undefined")
			thetaCount = 16;
		else
			thetaCount = Math.max(1, thetaCount);

		var phiStep = Math.PI * 2 / phiCount;
		var thetaStep = FOV * 0.5 * Math.PI / 180 / thetaCount;

		var xAxis;
		var zAxis;

		if (abs(dir.y) > 0.999)
		{
			xAxis = new Vector(1,0,0);
			zAxis = new Vector(0,0,1);
		}
		else
		{
			xAxis = normalize(cross(new Vector(0,1,0), dir));
			zAxis = normalize(cross(xAxis, dir));
		}

		if (fillColor != undefined)
		{
			for (var thetaIndex=0; thetaIndex < thetaCount; ++thetaIndex)
			{
				var theta0 = thetaIndex * thetaStep;
				var theta1 = (thetaIndex + 1) * thetaStep;

				var radius0 = Math.sin(theta0) * radius;
				var radius1 = Math.sin(theta1) * radius;

				var y0 = Math.cos(theta0) * radius;
				var y1 = Math.cos(theta1) * radius;

				for (var phiIndex=0; phiIndex < phiCount; ++phiIndex)
				{
					var phi0 = phiIndex * phiStep;
					var phi1 = (phiIndex + 1) * phiStep;

					var p = new Array(4);

					p[0] = mad(xAxis, Math.cos(phi0) * radius0, mad(zAxis, Math.sin(phi0) * radius0, mad(dir, y0, o)));
					p[1] = mad(xAxis, Math.cos(phi1) * radius0, mad(zAxis, Math.sin(phi1) * radius0, mad(dir, y0, o)));
					p[2] = mad(xAxis, Math.cos(phi1) * radius1, mad(zAxis, Math.sin(phi1) * radius1, mad(dir, y1, o)));
					p[3] = mad(xAxis, Math.cos(phi0) * radius1, mad(zAxis, Math.sin(phi0) * radius1, mad(dir, y1, o)));

					this.drawTriangle(p[0], p[1], p[2], color, 0, fillColor);
					this.drawTriangle(p[2], p[3], p[0], color, 0, fillColor);
				}
			}
		}

		if (width>0 && color != undefined)
		{
			var p = new Array(thetaCount);

			var theta0 = thetaCount * thetaStep;
			var radius0 = Math.sin(theta0) * radius;
			var y0 = Math.cos(theta0) * radius;

			for (var phiIndex=0; phiIndex < phiCount; ++phiIndex)
			{
				var phi0 = phiIndex * phiStep;

				p[phiIndex] = mad(xAxis, Math.cos(phi0) * radius0, mad(zAxis, Math.sin(phi0) * radius0, mad(dir, y0, o)));
			}

			this.drawLineStrip(p, true, color, width, undefined, dash);
		}
	}
	this.drawSphericalLine = function(o, dir0, dir1, radius, color, width, dash, segmentCount)
	{
		if (typeof(segmentCount) === "undefined")
			segmentCount = 32;

		var p = new Array(segmentCount+1);

		for (var i=0; i<=segmentCount; ++i)
		{
			var t = i / segmentCount;

			var dir = slerp(dir0, dir1, t);

			p[i] = mad(dir, radius, o);
		}

		this.drawLineStrip(p, false, color, width, undefined, dash);
	}
	this.drawTetrahedron = function(o, edgeLength, xAxis, yAxis, zAxis, color, width, fillColor, dash, points)
	{
		var p = points;

		if (p == undefined)
		{
			p = getTetrahedronPoints(o, edgeLength, xAxis, yAxis, zAxis);
		}

		this.drawTriangle(p[0], p[2], p[1], color, width, fillColor, dash);
		this.drawTriangle(p[0], p[3], p[2], color, width, fillColor, dash);
		this.drawTriangle(p[0], p[1], p[3], color, width, fillColor, dash);
		this.drawTriangle(p[1], p[2], p[3], color, width, fillColor, dash);
	}

	this.drawFrustum = function(o, fov, aspect, near, far, xAxis, yAxis, zAxis, color, width, fillColor, dash)
	{
		var xAxis;
		var yAxis;

		if (xAxis == undefined || yAxis == undefined)
		{
			if (abs(zAxis.y) > 0.999)
			{
				xAxis = new Vector(1,0,0);
			}
			else
			{
				xAxis = normalize(cross(new Vector(0,1,0), zAxis));
			}

			yAxis = normalize(cross(xAxis, zAxis));
		}

		var p = new Array(8);

		var tanY = Math.tan(fov * 0.5 * Math.PI / 180);
		var tanX = tanY * aspect;

		p[0] = mad(xAxis, -tanX * near, mad(yAxis, +tanY * near, mad(zAxis, near, o)));
		p[1] = mad(xAxis, +tanX * near, mad(yAxis, +tanY * near, mad(zAxis, near, o)));
		p[2] = mad(xAxis, +tanX * near, mad(yAxis, -tanY * near, mad(zAxis, near, o)));
		p[3] = mad(xAxis, -tanX * near, mad(yAxis, -tanY * near, mad(zAxis, near, o)));

		p[4] = mad(xAxis, -tanX * far, mad(yAxis, +tanY * far, mad(zAxis, far, o)));
		p[5] = mad(xAxis, +tanX * far, mad(yAxis, +tanY * far, mad(zAxis, far, o)));
		p[6] = mad(xAxis, +tanX * far, mad(yAxis, -tanY * far, mad(zAxis, far, o)));
		p[7] = mad(xAxis, -tanX * far, mad(yAxis, -tanY * far, mad(zAxis, far, o)));

		if (fillColor != undefined)
		{
			this.drawTriangle(p[0], p[1], p[2], color, 0, fillColor);
			this.drawTriangle(p[2], p[3], p[0], color, 0, fillColor);

			this.drawTriangle(p[0], p[4], p[5], color, 0, fillColor);
			this.drawTriangle(p[5], p[1], p[0], color, 0, fillColor);

			this.drawTriangle(p[2], p[1], p[5], color, 0, fillColor);
			this.drawTriangle(p[5], p[6], p[2], color, 0, fillColor);

			this.drawTriangle(p[4], p[0], p[3], color, 0, fillColor);
			this.drawTriangle(p[3], p[7], p[4], color, 0, fillColor);

			this.drawTriangle(p[3], p[2], p[6], color, 0, fillColor);
			this.drawTriangle(p[6], p[7], p[3], color, 0, fillColor);

			this.drawTriangle(p[5], p[4], p[7], color, 0, fillColor);
			this.drawTriangle(p[7], p[6], p[5], color, 0, fillColor);
		}

		if (width>0 && color != undefined)
		{
			this.drawLineStrip([p[0], p[1], p[2], p[3]] , true, color, width, undefined, dash);
			this.drawLineStrip([p[7], p[6], p[5], p[4]] , true, color, width, undefined, dash);
			this.drawLineStrip([p[0], p[4], p[5], p[1]] , true, color, width, undefined, dash);
			this.drawLineStrip([p[1], p[5], p[6], p[2]] , true, color, width, undefined, dash);
			this.drawLineStrip([p[2], p[6], p[7], p[3]] , true, color, width, undefined, dash);
			this.drawLineStrip([p[0], p[3], p[7], p[4]] , true, color, width, undefined, dash);
		}
	}

	this.drawArrow = function(pStart, pEnd, sizeInPixels, color, width, dash)
	{
		var dir = sub(pEnd, pStart).unit();

		var localX = cross( dir, sub(pEnd, view_position).unit() ).unit();

		var pEnd4 = [pEnd.x, pEnd.y, pEnd.z, 1];
		var z = dot4(pEnd4, viewMtx[2]);

		var size = sizeInPixels / (canvasW/2) * (z * projMtx[3][2] + projMtx[3][3]) / projMtx[0][0];

		var baseP = mad(dir, -size, pEnd);

		var p0 = mad(localX, size/4, baseP);
		var p1 = mad(localX, -size/4, baseP);

		graphics.drawLine(pStart, pEnd, color, width, dash);
		graphics.drawTriangle(pEnd, p0, p1, color, color, 1);
	}

	this.drawText3D = function(O,text,color,align, angle, font)
	{
		O = this.transformP(O);

		return graphics.drawText(O.x, o.y, text,color,align,angle,font);
	}

	this.drawText2D = function(x,y,text,color,align, angle, font)
	{
		if (typeof(align) === "undefined")
			align = "left";

		return graphics.drawText(x,y,text,color,align,angle,font);
	}

	this.getMousePos = function(evt)
	{
	//	var p = getMousePosPixels(evt, canvas);

	//	return invTransformP(p);
	}

	var mousePosDragStart;
	var angleThetaDragStart;
	var anglePhiDragStart;
	var viewTargetDragStart;
	var viewDistanceDragStart;
	var rotateSensitivity = 20;
	var wheelSensitivity = 300;
	var zoomSensitivity = 300;
	var orthoRotationSnap = 5;

	function onMouseMove(evt)
	{
		if (evt.altKey && evt.buttons & 1) // rotate
		{
			var deltaX = evt.clientX - mousePosDragStart.x;
			var deltaY = evt.clientY - mousePosDragStart.y;

			var deltaAngleX = deltaX * Math.PI / 180 * rotateSensitivity;
			var deltaAngleY = -deltaY * Math.PI / 180 * rotateSensitivity;

			view_angleTheta = Math.max(-89.5, Math.min(89.5, angleThetaDragStart + deltaAngleY));
			view_anglePhi = anglePhiDragStart + deltaAngleX;

			if (orthographic)
			{
				view_angleTheta = Math.round(view_angleTheta / orthoRotationSnap) * orthoRotationSnap;
				view_anglePhi = Math.round(view_anglePhi / orthoRotationSnap) * orthoRotationSnap;
			}

			updateProjection();
		}
		else if (evt.buttons & 4) // pan
		{
			var depth = orthographic ? 1 : view_distance;
			var deltaX = -(evt.clientX - mousePosDragStart.x) / (canvasW / 2) * depth / projMtx[0][0];
			var deltaY = (evt.clientY - mousePosDragStart.y) / (canvasH / 2) * depth / projMtx[1][1];

			var x = new Vector(viewMtx[0][0], viewMtx[0][1], viewMtx[0][2] );
			var y = new Vector(viewMtx[1][0], viewMtx[1][1], viewMtx[1][2] );
			var z = new Vector(viewMtx[2][0], viewMtx[2][1], viewMtx[2][2] );

			view_target = mad(x, deltaX, mad(y, deltaY, viewTargetDragStart));

			updateProjection();
		}
		else if (evt.altKey && evt.buttons & 2) // zoom
		{
			var deltaX = (evt.clientX - mousePosDragStart.x) / zoomSensitivity;
			var deltaY = (evt.clientY - mousePosDragStart.y) / zoomSensitivity;

			var delta = Math.max(deltaX, deltaY);

			view_distance = viewDistanceDragStart * (1 - deltaX);
			view_distance = Math.max(0.1, view_distance);
			updateProjection();
		}
	}

	function onMouseDown(evt)
	{
		mousePosDragStart		= new Vector( evt.clientX, evt.clientY, 0 );
		angleThetaDragStart		= view_angleTheta;
		anglePhiDragStart		= view_anglePhi;
		viewTargetDragStart		= view_target.copy();
		viewDistanceDragStart	= view_distance;
	}

	function onMouseUp(evt)
	{}

	function onMouseDblClick(evt)
	{
		if (evt.altKey)
		{
			view_target = new Vector(0,0,0);
			updateProjection();
		}
	}

	function onKeyDown(evt)
	{}

	function onKeyUp(evt)
	{}

	function onMouseWheel(evt)
	{
		view_distance *= 1 - evt.wheelDelta / wheelSensitivity;
		view_distance = Math.max(0.1, view_distance);
		updateProjection();
	}
	function onContextMenu(evt)
	{
		return false;
	}

	this.getCanvas			= function() { return canvas;	}
	this.getGraphics		= function() { return graphics;	}
}
