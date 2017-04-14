function Camera(canvas)
{
	var view_scale = {x:1, y:1};
	var view_bias = {x:0, y:0};
	var view_position = {x:0, y:0};
	var view_unitScale = 1;
	
	var graphics = new Graphics(canvas);
	var canvas = canvas;
	var context = canvas.getContext('2d');
	var canvasW = canvas.width;
	var canvasH = canvas.height;
	var canvasAspect = canvasW / canvasH;
	
	var lines = [];

	this.onResize = function()
	{
		context = canvas.getContext('2d');
		canvasW = canvas.width;
		canvasH = canvas.height;
		canvasAspect = canvasW / canvasH;

		graphics.onResize();
	}

	function saveAsJavascript()
	{
		var str = "";
		
		str += "camera.setViewPosition(" + view_position.x + ", " + view_position.y + ");"
		str += "camera.setUnitScale(" + view_unitScale + ");"

		return str;
	}


	function updateProjection()
	{
		view_scale.x = view_unitScale;
		view_scale.y = -view_unitScale;
		view_bias.x = -view_position.x * view_scale.x + canvasW/2;
		view_bias.y = canvasH/2 - view_position.y * view_scale.y;
	}

	function setViewPosition(x,y)
	{
		view_position.x = x;
		view_position.y = y;
		updateProjection();
	}
	
	function setUnitScale(s)
	{
		view_unitScale = Math.max(1,s);
		updateProjection();
	}
	
	function transformP(v)
	{
		return mad(v, view_scale, view_bias);
	}
	
	function transformN(v)
	{
		return mul(v, view_scale);
	}

	function invTransformP(v)
	{
		return div(sub(v, view_bias), view_scale);
	}

	function scale(v)
	{
		return mul(v,view_unitScale)
	}
	
	function invScale(v)
	{
		return div(v,view_unitScale)
	}

	this.clear = function()
	{
		graphics.clear();
		lines = [];
	}

	function drawLine(a,b,color,width,dash,ownerObject)
	{
		if (ownerObject !== undefined)
		{
			lines.push({a:a, b:b, object:ownerObject});
		}

		return graphics.drawLine(transformP(a), transformP(b), color, width, dash);
	}

	function drawLineStrip(points,color,width,dash, fillColor,ownerObject)
	{
		if (ownerObject !== undefined)
		{
			for (var i = 0; i < points.length - 1; ++i)
			{
				lines.push({a:points[i], b:points[i+1], object:ownerObject});
			}
		}

		var pixelPoints = [];

		for (var i = 0; i < points.length; ++i)
		{
			pixelPoints.push(transformP(points[i]));
		}

		return graphics.drawLineStrip(pixelPoints, color, width, dash, fillColor);
	}

	function drawLines(points, color, width, dash, fillColor, ownerObject)
	{
		if (ownerObject !== undefined)
		{
			for (var i = 0; i < points.length - 1; i+=2)
			{
				lines.push({a:points[i], b:points[i+1], object:ownerObject});
			}
		}

		var pixelPoints = [];

		for (var i = 0; i < points.length; ++i)
		{
			pixelPoints.push(transformP(points[i]));
		}

		return graphics.drawLines(pixelPoints, color, width, dash, fillColor);
	}

	function drawCross(p, size, rotation, color, width, dash)
	{
		return graphics.drawCross(transformP(p), scale(size), rotation, color, width, dash);
	}

	function drawRectangle(a, b, color, width, dash, fillColor)
	{
		if ( (typeof(b) !== "object") )
			return graphics.drawRectangle(transformP(a), scale(b), color, width, dash, fillColor);
		else
			return graphics.drawRectangle(transformP(a), transformP(b), color, width, dash, fillColor);
	}

	function drawArrow(pStart,pEnd,color,width,dash)
	{
		return graphics.drawArrow(transformP(pStart), transformP(pEnd), color, width, dash);
	}

	function drawText(O,text,color,align, angle, font)
	{
		return graphics.drawText(transformP(O),text,color,align,angle,font);
	}

	function drawHemisphere(O, N, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		return graphics.drawHemisphere(transformP(O), transformN(N), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawArc(O, radius, startAngle, endAngle, lineColor, lineWidth, fillColor, lineDash)
	{
		return graphics.drawArc(transformP(O), scale(radius), -startAngle, -endAngle, lineColor, lineWidth, fillColor, lineDash);
	}

	function drawBRDFGraph(BRDF, V, N, F0, roughness, O, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(radius) === "undefined")
			radius = 1;
		
		return graphics.drawBRDFGraph(BRDF, transformN(V), transformN(N), F0, roughness, transformP(O), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawStar(O, pointCount, outerRadius, innerRadiusFactor, rotationAngle, lineColor, lineWidth, fillColor)
	{
		return graphics.drawStar(transformP(O), pointCount, scale(outerRadius), innerRadiusFactor, rotationAngle, lineColor, lineWidth, fillColor);
	}	
	
	function drawLight(O,radius)
	{
		return graphics.drawLight(transformP(O), scale(radius));
	}
	
	function getMousePos(evt)
	{
		var rect = canvas.getBoundingClientRect();

		var p= 	{
					x: (evt.clientX - rect.left),
					y: (evt.clientY - rect.top)
				};

		return invTransformP(p);
	}
		
	function getSnapPoints(mousePoint, previousMousePos, mouseDir)
	{
		var points = [];

		for (var i=0; i!=lines.length; ++i)
		{
			var A = lines[i].a;
			var B = lines[i].b;

			var threshold = invScale(10);

			if (	mousePoint.x > Math.max(A.x, B.x)+threshold ||
					mousePoint.x < Math.min(A.x, B.x)-threshold ||
					mousePoint.y > Math.max(A.y, B.y)+threshold ||
					mousePoint.y < Math.min(A.y, B.y)-threshold)
			{
				continue;
			}

			var AB = sub(B, A);
			var tan = transpose(AB).unit();

			if (mousePoint !== undefined)
			{
				var AP = sub(mousePoint, A);

				var d = dot(AP, AB.unit());
				var t = dot(AP, tan);

				if (d>=0 && d<=AB.length())
				{
					var I = mad(AB.unit(), d, A);
					points.push({ type: "coincident", p: I, N: tan.neg(), objects: [lines[i].object] });
				}

				if (previousMousePos !== undefined && Math.abs(t)<=this.invScale(30))
				{
					var AP0 = sub(previousMousePos, A);
					var d0 = dot(AP0, AB.unit());
					var t0 = dot(AP0, tan);
					var I = mad(AB.unit(), d0, A);

					var testI = mad(AB.unit(), d, A);

					var perp = { type: "perpendicular", p: I, testP: testI, objects: [lines[i].object] };

					if (t0>=0)		perp.N = tan;
					else			perp.N = tan.neg();

							if (d < 0)			perp.p0 = A;
					else	if (d>AB.length())	perp.p0 = B;
					else						perp.p0 = I;

					points.push(perp);
				}

				if (	previousMousePos !== undefined &&
						mouseDir !== undefined &&
						d >= 0 && d <= AB.length() &&
						//dot(mouseDir, tan)<0 &&
						Math.abs(t) <= this.invScale(30))
				{
					var intersection = intersectRayRay(previousMousePos, mouseDir, A, AB.unit());

					if (intersection.hit)
					{
						var testI = mad(AB.unit(), d, A);

						var extendPoint = { type: "extendTo", p: intersection.P.copy(), testP: testI, objects: [lines[i].object] };

								if (intersection.tLine <= 0)		extendPoint.p0 = A;
						else	if (intersection.tLine >= 1)		extendPoint.p0 = B;
						else										extendPoint.p0 = testI;

						points.push(extendPoint);
					}
				}
			}

			for (var j = i + 1; j < lines.length; ++j)
			{
				if (lines[i].object == lines[j].object)
					continue;

				var C = lines[j].a;
				var D = lines[j].b;

				var AC = sub(C, A);
				var CD = sub(D, C);
				var d = -dot(AC, tan);
				var CD_along_tan = dot(CD.unit(), tan);
				var CD_factor = d / CD_along_tan;

				var I = add(C, mul(CD.unit(), CD_factor));

				var dAB = dot(sub(I, A), AB.unit());
				var dCD = dot(sub(I, C), CD.unit());

				if (dAB < 0 || dCD < 0 || dAB > distance(A, B) || dCD > distance(C, D))
					continue;

				points.push({type:"intersection", p:I, objects:[lines[i].object, lines[j].object] });
			}
		}

		return points;
	}

	this.getUnitScale	 	= function() { return view_unitScale; 	}
	this.getViewBias		= function() { return view_bias; 	 	}
	this.getViewPosition	= function() { return view_position; 	}
	this.getViewSize		= function() { return new Vector(canvasW/view_unitScale, canvasH/view_unitScale); }
	this.getCanvas			= function() { return canvas;		 	}
	this.getGraphics		= function() { return graphics;		 	}

	this.setViewPosition	= setViewPosition;
	this.setUnitScale		= setUnitScale;

	this.saveAsJavascript	= saveAsJavascript;
	this.transformP			= transformP;
	this.transformN			= transformN;
	this.scale				= scale;
	this.invScale			= invScale;
	this.invTransformP		= invTransformP;
	this.drawText 			= drawText;
	this.drawArrow 			= drawArrow;
	this.drawLine			= drawLine;
	this.drawLines			= drawLines;
	this.drawLineStrip		= drawLineStrip;
	this.drawCross 			= drawCross;
	this.drawRectangle		= drawRectangle;
	this.drawHemisphere 	= drawHemisphere;
	this.drawArc			= drawArc;
	this.drawBRDFGraph		= drawBRDFGraph;
	this.drawLight			= drawLight;
	this.drawStar			= drawStar;
	this.getMousePos		= getMousePos;
	this.getSnapPoints		= getSnapPoints;

	function init()
	{
		setViewPosition(0, 0);
		setUnitScale(96/2.54 * 1.25 * 0.5);
	}

	init();
}
