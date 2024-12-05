function Camera(mainCanvas,  svg)
{
	var view_scale = {x:1, y:1};
	var view_bias = {x:0, y:0};
	var view_position = {x:0, y:0};
	var view_unitScale = 1;
	
	var activeLayer;
	var activeCanvas;
	var activeGraphics;
	var canvas = [undefined, mainCanvas, undefined];
	var graphics = [undefined, undefined, undefined];
	var canvasW = mainCanvas.width;
	var canvasH = mainCanvas.height;
	var canvasAspect = canvasW / canvasH;
	
	var points = [];
    var lines = [];
    var arcs = [];

	function init()
	{
		canvas[0] = document.createElement('canvas');
		canvas[0].width = mainCanvas.width;
		canvas[0].height = mainCanvas.height;
		canvas[0].style.position = mainCanvas.style.position;
		canvas[0].style.left = mainCanvas.style.left;
		canvas[0].style.top = mainCanvas.style.top;
		canvas[0].style.zIndex = mainCanvas.style.zIndex-2;
		canvas[0].style.cursor = "none";
		canvas[0].tabIndex = -1;
		if (mainCanvas.parentNode != undefined)
		{
			mainCanvas.parentNode.insertBefore(canvas[0], mainCanvas);
		}

		canvas[1] = document.createElement('canvas');
		canvas[1].width = mainCanvas.width;
		canvas[1].height = mainCanvas.height;
		canvas[1].style.position = mainCanvas.style.position;
		canvas[1].style.left = mainCanvas.style.left;
		canvas[1].style.top = mainCanvas.style.top;
		canvas[1].style.zIndex = mainCanvas.style.zIndex-1;
		canvas[1].style.cursor = "none";
		canvas[1].tabIndex = -1;
		if (mainCanvas.parentNode != undefined)
		{
			mainCanvas.parentNode.insertBefore(canvas[1], mainCanvas);
		}
		
		canvas[2] = mainCanvas;

		graphics = [new Graphics(canvas[0], svg), new Graphics(canvas[1], svg), new Graphics(canvas[2], svg)];

		setLayer(1);
		setViewPosition(0, 0);
		setUnitScale(96/2.54 * 1.25 * 0.5);
	}

	function setLayer(index)
	{
		if (activeLayer != index)
		{
			activeLayer = index;
			activeCanvas = canvas[index];
			activeGraphics = graphics[index];
		}
	}

	this.onResize = function()
	{
		canvasW = activeCanvas.width;
		canvasH = activeCanvas.height;
		canvasAspect = canvasW / canvasH;

		for (var i=0; i!=3; ++i)
		{
			canvas[i].width = activeCanvas.width;
			canvas[i].height = activeCanvas.height;
			graphics[i].onResize();
		}
	}

	function saveAsJavascript()
	{
		var str = "";
		
		str += "camera.setViewPosition(" + view_position.x + ", " + view_position.y + ");\n"
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
		view_unitScale = s;//Math.max(1,s);
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

	function getScreenMin()
	{
		return invTransformP(new Vector(0, canvasH));
	}

	function getScreenMax()
	{
		return invTransformP(new Vector(canvasW, 0));
	}

	function scale(v)
	{
		return mul(v,view_unitScale)
	}
	
	function invScale(v)
	{
		return div(v,view_unitScale)
	}

	this.clear = function(color)
	{
		activeGraphics.clear(color);
		
		if (activeLayer == 1)
		{
			points = [];
            lines = [];
            arcs = [];
		}
	}

	function addPoint(a,ownerObject)
	{
		points.push({a:a, object:ownerObject});
	}

	function addLine(a,b,ownerObject)
	{
		lines.push({a:a, b:b, object:ownerObject});
	}

	function addArc(arcCenter, arcRadius, arcStartAngle, arcEndAngle,ownerObject)
	{
		arcs.push({center:arcCenter, radius:arcRadius, startAngle:arcStartAngle, endAngle:arcEndAngle, object:ownerObject});
	}

	function drawLine(a,b,color,width,dash,ownerObject)
	{
		if (activeLayer == 1 && ownerObject !== undefined)
		{
			lines.push({a:a, b:b, object:ownerObject});
		}

		var clipped = this.clipLineToScreen(a,b);

		if (clipped.length == 0)
			return;

		return activeGraphics.drawLine(transformP(clipped[0]), transformP(clipped[1]), color, width, dash);
	}

	function drawBezierCurve(a,ca,cb,b,color,width,dash,fillColor,ownerObject)
	{
		//if (activeLayer == 1 && ownerObject !== undefined)
		//{
		//	lines.push({a:a, b:b, object:ownerObject});
		//}

		return activeGraphics.drawBezierCurve(transformP(a), transformP(ca), transformP(cb), transformP(b), color, width, dash, fillColor);
	}

	function drawBezierCurves(curves,color,width,dash,fillColor,ownerObject)
	{
		//if (activeLayer == 1 && ownerObject !== undefined)
		//{
		//	lines.push({a:a, b:b, object:ownerObject});
		//}

		var pixelCurves = [];

		for (var i = 0; i < curves.length; ++i)
		{
			pixelCurves.push( [ transformP(curves[i][0]), transformP(curves[i][1]), transformP(curves[i][2]), transformP(curves[i][3]) ] );
		}

		return activeGraphics.drawBezierCurves(pixelCurves, color, width, dash, fillColor);
	}

	function drawLineStrip(points, closed, color, width, dash, fillColor, ownerObject)
	{
		if (activeLayer == 1 && ownerObject !== undefined)
		{
			for (var i = 0; i < points.length - 1; ++i)
			{
				lines.push({a:points[i], b:points[i+1], object:ownerObject});
			}

			if (closed)
			{
				lines.push({a:points[points.length - 1], b:points[0], object:ownerObject});
			}
		}

		var pixelPoints = [];

		for (var i = 0; i < points.length; ++i)
		{
			pixelPoints.push(transformP(points[i]));
		}

		return activeGraphics.drawLineStrip(pixelPoints, closed, color, width, dash, fillColor);
	}

	function drawLines(points, color, width, dash, fillColor, ownerObject)
	{
		if (activeLayer == 1 && ownerObject !== undefined)
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

		return activeGraphics.drawLines(pixelPoints, color, width, dash, fillColor);
	}

	function drawCross(p, size, rotation, color, width, dash)
	{
		return activeGraphics.drawCross(transformP(p), scale(size), rotation, color, width, dash);
	}

	function drawRectangle(a, b, color, width, dash, fillColor, angle)
	{
		if ( (typeof(b) !== "object") )
			return activeGraphics.drawRectangle(transformP(a), scale(b), color, width, dash, fillColor, angle);
		else
			return activeGraphics.drawRectangle(transformP(a), transformP(b), color, width, dash, fillColor, angle);
	}

	function drawArrow(pStart, pEnd, sizeInPixels, color, width, dash, ownerObject)
	{
		if (activeLayer == 1 && ownerObject !== undefined)
		{
			lines.push({a:pStart, b:pEnd, object:ownerObject});
		}

		return activeGraphics.drawArrow(transformP(pStart), transformP(pEnd), sizeInPixels, color, width, dash);
	}

	function drawText(O,text,color,align, angle, font, valign)
	{
		return activeGraphics.drawText(transformP(O),text,color,align,angle,font,valign);
	}

	function drawHemisphere(O, N, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		return activeGraphics.drawHemisphere(transformP(O), transformN(N), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

    function drawArc(O, radius, startAngle, endAngle, lineColor, lineWidth, fillColor, lineDash, startArrowSize, endArrowSize, ownerObject)
    {
		if (typeof(startAngle) === "undefined")
			startAngle = 0;

		if (typeof (endAngle) === "undefined")
			endAngle = Math.PI * 2;

        if (activeLayer == 1 && ownerObject !== undefined)
		{
			arcs.push({center:O, radius:radius, startAngle:startAngle, endAngle:endAngle, object:ownerObject});
		}

		return activeGraphics.drawArc(transformP(O), scale(radius), -startAngle, -endAngle, lineColor, lineWidth, fillColor, lineDash, startArrowSize, endArrowSize);
	}

	function drawBRDFGraph(BRDF, X, N, F0, sourceIsLightVector, roughness, O, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(radius) === "undefined")
			radius = 1;
		
		return activeGraphics.drawBRDFGraph(BRDF, transformN(X), transformN(N), F0, sourceIsLightVector, roughness, transformP(O), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawStar(O, pointCount, outerRadius, innerRadiusFactor, rotationAngle, lineColor, lineWidth, fillColor)
	{
		return activeGraphics.drawStar(transformP(O), pointCount, scale(outerRadius), innerRadiusFactor, rotationAngle, lineColor, lineWidth, fillColor);
	}	
	
	function drawLight(O,radius)
	{
		return activeGraphics.drawLight(transformP(O), scale(radius));
	}
	
	function drawImage(O, image, width, height, rotationAngle, alpha)
	{
		if (typeof(width) === "undefined")
			width = invScale(image.naturalWidth);

		if (typeof(height) === "undefined")
			height = invScale(image.naturalHeight);

		return activeGraphics.drawImage(transformP(O), image, scale(width), scale(height), rotationAngle, alpha);
	}

	function getMousePos(evt)
	{
		var p = getMousePosPixels(evt, activeCanvas);

		return invTransformP(p);
	}

	function getTouchPositions(evt)
	{
		var clientRect = activeCanvas.getBoundingClientRect();

		var touchPositionsPixels = getTouchPositionsPixels(evt, activeCanvas);
		var touchPositions = [];

		for (var i=0; i<touchPositionsPixels.length; ++i)
		{
			var p = touchPositionsPixels[i];

			touchPositions.push(invTransformP(p));
		}

		return touchPositions;
	}

	function getSnapPoints(mousePoint, previousMousePos, mouseDir, grid)
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

			points.push({ type: "midpoint", p: avg(A,B), N: tan.neg(), objects: [lines[i].object] });

			if (mousePoint !== undefined)
			{
				var AP = sub(mousePoint, A);

				var d = dot(AP, AB.unit());
				var t = dot(AP, tan);

				if (d>=0 && d<=AB.length())
				{
					var I = mad(AB.unit(), d, A);

					var gridSnapped = false;

					if (grid != undefined)
					{
						var gridSnap = grid.getLineIntersectionSnap(mousePoint, A, B);

						if (gridSnap != undefined)
						{
							points.push({ type: "coincident", p: gridSnap, N: tan.neg(), objects: [lines[i].object], gridSnap:true });
							gridSnapped = true;
						}
					}
					
					if (!gridSnapped)
					{
						points.push({ type: "coincident", p: I, N: tan.neg(), objects: [lines[i].object] });
					}
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
				//if (lines[i].object == lines[j].object)
				//	continue;

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

            for (var j=0; j<arcs.length; ++j)
            {
				if (lines[i].object == arcs[j].object)
					continue;

                var arc = arcs[j];

                // point on line that is closest to radius
                var lineDir = AB.unit();
                var AO = sub(arc.center, A);

                var perpDist = Math.abs(dot(AO, tan));

                if (perpDist > arc.radius)
                    continue;

                // distance of arc center along line, measured from A
                var centerDist = dot(AO, lineDir);

                // distance from center (on line) to each of the 2 possible intersections
                var intersectionDelta = Math.sqrt(arc.radius * arc.radius - perpDist * perpDist);

                if ((centerDist + intersectionDelta) <= AB.length())
                {
					var intersectionP = add(A, mul(lineDir, centerDist + intersectionDelta));

					var angle = toAngle(sub(intersectionP, arc.center));

					if (angle>arc.endAngle) 
						angle -= Math.PI*2;
					else if (angle<arc.startAngle) 
						angle += Math.PI*2;

					if (angle >= arc.startAngle && angle <= arc.endAngle)
					{
						points.push({type:"intersection", p:intersectionP, objects:[lines[i].object, arc.object] });
					}
				}

                if ((centerDist - intersectionDelta) >= 0)
                {
					var intersectionP = add(A, mul(lineDir, centerDist - intersectionDelta));

					var angle = toAngle(sub(intersectionP, arc.center));

					if (angle>arc.endAngle) 
						angle -= Math.PI*2;
					else if (angle<arc.startAngle) 
						angle += Math.PI*2;

					if (angle >= arc.startAngle && angle <= arc.endAngle)
					{
						points.push({type:"intersection", p:intersectionP, objects:[lines[i].object, arc.object] });
					}
				}
            }
		}

		return points;
	}

	function hitTest(a, b, objectFilter)
	{
		var results = [];

		for (var i=0; i!=lines.length; ++i)
		{
			if (overlapRectLine(a, b, lines[i].a, lines[i].b))
			{
				if (objectFilter != undefined && lines[i].object == objectFilter)
					return true;

				results.push(lines[i].object);
			}
		}

		return results;
	}

	function extendLine(lineFrom, lineTo, excludeObjectList)
	{
		var nearestDist = 1e20;
		var bestP = undefined;
		var lineA;
		var lineB;

		if (excludeObjectList == undefined)
			excludeObjectList = [];

		var lineLength = distance(lineFrom, lineTo);

		for (var i=0; i!=points.length; ++i)
		{
			if (excludeObjectList.indexOf(points[i].object) >= 0)
				continue;

			var p = points[i].a;

			var intersection = intersectRayPoint(lineTo, sub(lineTo, lineFrom).unit(), p);

			if (intersection.hit)
			{
				if (intersection.tRay > EPSILON && intersection.tRay < nearestDist)
				{
					nearestDist = intersection.tRay;
					bestP = intersection.P;
					lineA = undefined;
					lineB = undefined;
				}
			}
		}

		for (var i=0; i!=lines.length; ++i)
		{
			if (excludeObjectList.indexOf(lines[i].object) >= 0)
				continue;

			var A = lines[i].a;
			var B = lines[i].b;

			var intersection = intersectRayRay(lineTo, sub(lineTo, lineFrom).unit(), A, sub(B, A).unit());

			if (intersection.hit)
			{
				if (intersection.tRay > EPSILON && intersection.tRay < nearestDist)
				{
					nearestDist = intersection.tRay;
					bestP = intersection.P;
					lineA = A;
					lineB = B;
				}
			}
		}

        for (var j=0; j<arcs.length; ++j)
        {
			if (excludeObjectList.indexOf(arcs[j].object) >= 0)
				continue;

            var arc = arcs[j];

			var intersection = intersectRayArc(lineTo, sub(lineTo, lineFrom).unit(), arc.center, arc.radius, arc.startAngle, arc.endAngle);

			if (intersection.hit)
			{
				if (intersection.tRay > EPSILON && intersection.tRay < nearestDist)
				{
					nearestDist = intersection.tRay;
					bestP = intersection.P;
					lineA = undefined;
					lineB = undefined;
				}
			}
        }

		if (bestP != undefined)
			return { P: bestP, lineFrom: lineA, lineTo: lineB }
		
		return undefined;
	}

	function trimLine(lineFrom, lineTo, excludeObjectList)
	{
		var nearestDist = 1e20;
		var bestP = undefined;
		var lineA;
		var lineB;

		if (excludeObjectList == undefined)
			excludeObjectList = [];

		var lineLength = distance(lineFrom, lineTo);

		for (var i=0; i!=points.length; ++i)
		{
			if (excludeObjectList.indexOf(points[i].object) >= 0)
				continue;

			var p = points[i].a;

			var intersection = intersectRayPoint(lineFrom, sub(lineTo, lineFrom).unit(), p);

			if (intersection.hit)
			{
				if (	intersection.tRay >= EPSILON && intersection.tRay <= (lineLength - EPSILON) &&
						intersection.tRay < nearestDist)
				{
					nearestDist = intersection.tRay;
					bestP = intersection.P;
					lineA = undefined;
					lineB = undefined;
				}
			}
		}

		for (var i=0; i!=lines.length; ++i)
		{
			if (excludeObjectList.indexOf(lines[i].object) >= 0)
				continue;

			var A = lines[i].a;
			var B = lines[i].b;

			var ABLength = distance(A,B);

			var intersection = intersectRayRay(lineFrom, sub(lineTo, lineFrom).unit(), A, sub(B, A).unit());

			if (intersection.hit)
			{
				if (	intersection.tRay >= EPSILON && intersection.tRay <= (lineLength - EPSILON) &&
						intersection.tLine >= 0 && intersection.tLine <= ABLength &&
						intersection.tRay < nearestDist)
				{
					nearestDist = intersection.tRay;
					bestP = intersection.P;

					if (intersection.tLine > 0)
					{
						lineA = A;
						lineB = B;
					}
					else
					{
						lineA = B;
						lineB = A;
					}
				}
			}
		}

        for (var j=0; j<arcs.length; ++j)
        {
			if (excludeObjectList.indexOf(arcs[j].object) >= 0)
				continue;

            var arc = arcs[j];

			var intersection = intersectRayArc(lineFrom, sub(lineTo, lineFrom).unit(), arc.center, arc.radius, arc.startAngle, arc.endAngle);

			if (intersection.hit)
			{
				if (intersection.tRay > EPSILON && intersection.tRay < (lineLength - EPSILON) && intersection.tRay < nearestDist)
				{
					nearestDist = intersection.tRay;
					bestP = intersection.P;
					lineA = undefined;
					lineB = undefined;
				}
			}
        }

		if (bestP != undefined)
			return { P: bestP, lineFrom: lineA, lineTo: lineB }
		
		return undefined;
	}

	function measureText(text, font)
	{
		var p = activeGraphics.measureText(text, font);

		return div(p, view_unitScale);
	}

	this.getUnitScale	 	= function()		{ return view_unitScale; 	}
	this.getViewBias		= function()		{ return view_bias; 	 	}
	this.getViewPosition	= function()		{ return view_position; 	}
	this.getViewSize		= function()		{ return new Vector(canvasW/view_unitScale, canvasH/view_unitScale); }
	this.getCanvas			= function()		{ return activeCanvas;		}
	this.getGraphics		= function()		{ return activeGraphics;	}
	this.clipLineToScreen	= function(p0,p1)	{ return clipLineToRect(getScreenMin(), getScreenMax(), p0, p1); }

	this.setViewPosition	= setViewPosition;
	this.setUnitScale		= setUnitScale;
	this.setLayer			= setLayer;
	this.getScreenMin		= getScreenMin;
	this.getScreenMax		= getScreenMax;

	this.addPoint			= addPoint;
	this.addLine			= addLine;
	this.addArc				= addArc;
	this.saveAsJavascript	= saveAsJavascript;
	this.transformP			= transformP;
	this.transformN			= transformN;
	this.scale				= scale;
	this.invScale			= invScale;
	this.invTransformP		= invTransformP;
	this.drawText 			= drawText;
	this.drawArrow 			= drawArrow;
	this.drawLine			= drawLine;
	this.drawBezierCurve	= drawBezierCurve;
	this.drawBezierCurves	= drawBezierCurves;
	this.drawLines			= drawLines;
	this.drawLineStrip		= drawLineStrip;
	this.drawCross 			= drawCross;
	this.drawRectangle		= drawRectangle;
	this.drawHemisphere 	= drawHemisphere;
	this.drawArc			= drawArc;
	this.drawBRDFGraph		= drawBRDFGraph;
	this.drawLight			= drawLight;
	this.drawStar			= drawStar;
	this.drawImage			= drawImage;
	this.getMousePos		= getMousePos;
	this.getTouchPositions	= getTouchPositions;
	this.getSnapPoints		= getSnapPoints;
	this.hitTest			= hitTest;
	this.extendLine			= extendLine;
	this.trimLine			= trimLine;
	this.measureText		= measureText;


	init();
}
