function Graphics(canvas_, svg)
{
	var canvas = canvas_;
	var canvasW = canvas.width;
	var canvasH = canvas.height;
	var canvasAspect = canvasW / canvasH;
	var context = (svg==true) ? new C2S(canvasW, canvasH) : canvas_.getContext('2d');

	function getContext()
	{
		return context;
	}

	this.onResize = function()
	{
		context = canvas.getContext('2d');
		canvasW = canvas.width;
		canvasH = canvas.height;
		canvasAspect = canvasW / canvasH;
	}

	function drawLine(a,b,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		context.beginPath();
		context.moveTo(a.x,a.y);
		context.lineTo(b.x,b.y);

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}

	function drawBezierCurve(a,ca,cb,b,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		context.beginPath();
		context.moveTo(a.x,a.y);
		context.bezierCurveTo(ca.x,ca.y,cb.x,cb.y,b.x,b.y);

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}

	function drawLineStrip(points, closed, color, width, dash, fillColor)
	{
		if (points.length < 2)
			return;

		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		context.beginPath();
		context.moveTo(points[0].x, points[0].y);

		for (var i = 1; i != points.length; ++i)
		{
			context.lineTo(points[i].x, points[i].y);
		}

		if (closed)
		{
			context.lineTo(points[0].x, points[0].y);
		}

		if (fillColor !== undefined)
		{
			context.fillStyle = fillColor;
			context.fill();
		}

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}

	function drawLines(points, color, width, dash, fillColor)
	{
		if (points.length < 2)
			return;

		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		context.beginPath();

		for (var i = 0; i < points.length-1; i+=2)
		{
			context.moveTo(points[i].x, points[i].y);
			context.lineTo(points[i+1].x, points[i+1].y);
		}

		if (fillColor !== undefined)
		{
			context.fillStyle = fillColor;
			context.fill();
		}

		if (width > 0)
		{
			context.stroke();
		}
		//context.restore();
	}

	function drawCross(p,size,rotation,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		if (typeof(rotation) === "undefined")
			rotation = 0;

		var delta = new Vector(size, 0);
		delta = rotate(delta, rotation);

		drawLine(add(p, delta), sub(p, delta), color, width, dash);

		delta = transpose(delta);

		drawLine(add(p, delta), sub(p, delta), color, width, dash);
	}

	function drawRectangle(a,b,color,width,dash, fillColor, angle)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		if (typeof(angle) === "undefined")
			angle = 0;

		if ( (typeof(b) !== "object") )
		{
			return drawRectangle(add(a, b/2), sub(a, b/2), color,width,dash, fillColor, angle);
		}

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		var xAxis = fromAngle(angle);
		var yAxis = transpose(xAxis);
		var midPoint = avg(a,b);
		var halfSize = abs(sub(b, midPoint));

		var p = [
			mad(xAxis, -halfSize.x, mad(yAxis, +halfSize.y, midPoint)),
			mad(xAxis, +halfSize.x, mad(yAxis, +halfSize.y, midPoint)),
			mad(xAxis, +halfSize.x, mad(yAxis, -halfSize.y, midPoint)),
			mad(xAxis, -halfSize.x, mad(yAxis, -halfSize.y, midPoint)),
		];

		context.beginPath();
		
		context.moveTo(p[0].x, p[0].y);
		context.lineTo(p[1].x, p[1].y);
		context.lineTo(p[2].x, p[2].y);
		context.lineTo(p[3].x, p[3].y);
		context.lineTo(p[0].x, p[0].y);

		if (fillColor !== undefined)
		{
			context.fillStyle = fillColor;
			context.fill();
		}

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}
	
	function drawArrow(pStart,pEnd,sizeInPixels, color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(dash) === "undefined")
			dash = [];

		if (typeof(width) === "undefined")
			width = 1;

		if (sizeInPixels == undefined)
			sizeInPixels = 20;

		var length = sub(pEnd, pStart).length();
		V = sub(pEnd, pStart).unit();

		var B = add(pStart, mul(V, length-sizeInPixels-width/2));
		var E = add(pStart, mul(V,length));
		var T = transpose(V);
		var P0 = add(B, mul(T, 5*sizeInPixels/20 + width/2));
		var P1 = add(B, mul(T, -5*sizeInPixels/20 - width/2));

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.fillStyle = color;
		context.setLineDash(dash);

		// Line
		context.beginPath();
		context.moveTo(pStart.x, pStart.y);
		context.lineTo(B.x, B.y);
		context.stroke();

		// Arrow head
		context.beginPath();
		context.lineWidth = 1;
		context.setLineDash([]);
		context.moveTo(E.x, E.y);
		context.lineTo(P0.x, P0.y);
		context.lineTo(P1.x, P1.y);
		context.lineTo(E.x, E.y);
		context.stroke();
		context.fill();

		//context.restore();
	}

	function drawText(O,text,color,align,angle,font)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(align) === "undefined")
			align = "center";

		if (font === undefined)
			font = "bold 16px Arial";

		//context.save();

		context.translate(O.x, O.y);

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

		context.translate(-O.x, -O.y);

		//context.restore();
	}

	function drawHemisphere(O, N, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(lineDash) === "undefined")
			lineDash = [];

		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 0, 0, 0)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#000000";

		N = N.unit();

		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash(lineDash);
	
		context.beginPath();
		
		var angle = toAngle(N);
		context.arc(O.x, O.y, radius, angle+Math.PI/2, angle-Math.PI/2, true);
		
		context.fill();
		if (width > 0)
		{
			context.stroke();
		}
	
		//context.restore();
	}

	function drawArc(O, radius, startAngle, endAngle, lineColor, lineWidth, fillColor, lineDash, startArrow, endArrow)
	{
		if (typeof(startAngle) === "undefined")
			startAngle = 0;

		if (typeof (endAngle) === "undefined")
			endAngle = Math.PI * 2;

		if (typeof (lineDash) === "undefined")
			lineDash = [];

		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 0, 0, 0)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#000000";

		if (typeof(startArrow) === "undefined")
			startArrow = false;

		if (typeof(endArrow) === "undefined")
			endArrow = false;

		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash(lineDash);
	
		var v0 = add(O, rotate(new Vector(1,0), startAngle));

		context.beginPath();

		var arrowSize = lineWidth * 2;

		var arcStartAngle = startAngle;
		var arcEndAngle = endAngle;

		if (lineWidth <= 0)
		{
			startArrow = false;
			endArrow = false;
		}

		if (startArrow)
		{
			arcStartAngle -= arrowSize / radius;
		}

		if (endArrow>0)
		{
			arcEndAngle += arrowSize / radius;
		}

		context.arc(O.x, O.y, radius, arcStartAngle, arcEndAngle, true);
		

		if (lineWidth > 0)
		{
			context.stroke();
		}
		
		//context.lineWidth = 1;
		//context.strokeStyle = "#000000";
		//context.stroke();

		context.lineTo(O.x, O.y);

		context.fill();

		if (startArrow)
		{
			// arc length = radius * angle_in_radians
			var deltaAngle = arrowSize / radius;

			//var dir = fromAngle(startAngle + toRadians(90) - deltaAngle);
			var dir = fromAngle(startAngle + toRadians(90));

			var tan = transpose(dir);

			var E  = mad(fromAngle(startAngle), radius, O);
			var P0 = mad(tan, arrowSize / 2, mad(dir, -arrowSize, E));
			var P1 = mad(tan, -arrowSize / 2, mad(dir, -arrowSize, E));

			context.fillStyle = lineColor;
			context.lineWidth = 1;
			context.strokeStyle = "#000000";

			context.beginPath();
			context.moveTo(E.x, E.y);
			context.lineTo(P0.x, P0.y);
			context.lineTo(P1.x, P1.y);
			context.lineTo(E.x, E.y);
			context.fill();
			//context.stroke();
		}

		if (endArrow)
		{
			// arc length = radius * angle_in_radians
			var deltaAngle = arrowSize / radius;

			//var dir = fromAngle(endAngle + toRadians(90) - deltaAngle);
			var dir = fromAngle(endAngle + toRadians(90));

			var tan = transpose(dir);

			var E  = mad(fromAngle(endAngle), radius, O);
			var P0 = mad(tan, arrowSize / 2, mad(dir, arrowSize, E));
			var P1 = mad(tan, -arrowSize / 2, mad(dir, arrowSize, E));

			context.fillStyle = lineColor;
			context.lineWidth = 1;
			context.strokeStyle = "#000000";

			context.beginPath();
			context.moveTo(E.x, E.y);
			context.lineTo(P0.x, P0.y);
			context.lineTo(P1.x, P1.y);
			context.lineTo(E.x, E.y);
			context.fill();
			//context.stroke();
		}


		//context.restore();
	}

	function drawBRDFGraph(BRDF, X, N, F0, sourceIsLightVector, roughness, O, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(radius) === "undefined")
			radius = 1;

		if (typeof(lineDash) === "undefined")
			lineDash = [];

		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 255, 0, 0.1)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#008000";

		var angStep = 1;

		var T = transpose(N);
		
		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash(lineDash);

		// Draw lobe outline
		context.beginPath();
		context.moveTo(O.x,O.y);

		N = N.unit();
		X = X.unit();
		
		var RX = reflect(X.neg(),N);		
		var RXAngle = toAngle(RX) / Math.PI * 180;
		
		for (var ang = -180; ang <= 180; ang += angStep)
		{
			var Xi = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180));

			var brdf = 0;

			if (sourceIsLightVector)
				brdf = BRDF(F0,N,Xi,X,roughness);
			else // source is view vector
				brdf = BRDF(F0,N,X,Xi,roughness);

			var p = mad(Xi, brdf * radius, O);

			context.lineTo(p.x, p.y);
		}

		context.lineTo(O.x,O.y);
		context.fill();
		context.stroke();

		// Draw lobe rays
		context.beginPath();
		for (var ang1 = 0; ang1 <= +180; ang1 += 5)
		{
			var ang = RXAngle + ang1;
			
			var Xi = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180));

			if (sourceIsLightVector)
				brdf = BRDF(F0,N,Xi,X,roughness);
			else // source is view vector
				brdf = BRDF(F0,N,X,Xi,roughness);

			dx = Math.cos(ang * Math.PI / 180) * brdf * radius;
			dy = Math.sin(ang * Math.PI / 180) * brdf * radius;

			context.moveTo(O.x, O.y);
			context.lineTo(O.x+dx, O.y+dy);
			
			if (ang1>0)
			{
				var ang = RXAngle - ang1;
				
				var Xi = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180));

				var brdf = 0;

				if (sourceIsLightVector)
					brdf = BRDF(F0,N,Xi,X,roughness);
				else // source is view vector
					brdf = BRDF(F0,N,X,Xi,roughness);

				var p = mad(Xi, brdf * radius, O);

				context.moveTo(O.x, O.y);
				context.lineTo(p.x, p.y);
			}
		}
		context.stroke();

		//context.restore();
	}

	function drawStar(O,pointCount, outerRadius, innerRadiusFactor, rotationAngle, lineColor, lineWidth, fillColor)
	{
		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 255, 0, 0.1)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#008000";

		if (typeof(radius) === "undefined")
			radius = 0.1;

		if (typeof(rotationAngle) === "undefined")
			rotationAngle = 0;

		rotationAngle = rotationAngle * 180 / Math.PI;

		var angStep = 360 / pointCount;
		var innerRadius = outerRadius * innerRadiusFactor;

		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash([]);

		context.beginPath();

		for (var ang = rotationAngle; ang <= 360+rotationAngle; ang += angStep)
		{
			var v = new Vector(Math.sin(ang * Math.PI / 180), Math.cos(ang * Math.PI / 180));

			dx = Math.sin((ang - angStep*0.5) * Math.PI / 180) * innerRadius;
			dy = Math.cos((ang - angStep*0.5) * Math.PI / 180) * innerRadius;

			context.lineTo(O.x + dx, O.y + dy);

			dx = Math.sin(ang * Math.PI / 180) * outerRadius;
			dy = Math.cos(ang * Math.PI / 180) * outerRadius;

			context.lineTo(O.x + dx, O.y + dy);

			dx = Math.sin((ang + angStep*0.5) * Math.PI / 180) * innerRadius;
			dy = Math.cos((ang + angStep*0.5) * Math.PI / 180) * innerRadius;

			context.lineTo(O.x + dx, O.y + dy);
		}

		context.fill();
		context.stroke();

		//context.restore();
	}	
	
	function drawImage(O, image, width, height, rotationAngle, alpha)
	{
		if (rotationAngle == undefined)
			rotationAngle = 0;

		if (alpha == undefined)
			alpha = 1;

		rotationAngle = rotationAngle * 180 / Math.PI;

		context.rotate(rotationAngle);
		//context.translate(O.x, O.y);
		context.globalAlpha = alpha;
		//context.globalCompositeOperation = "lighter";

		context.drawImage(image, O.x, O.y, width, height);

		//context.globalCompositeOperation = "source-over";
		context.globalAlpha = 1;
		//context.translate(-O.x, -O.y);
		context.rotate(-rotationAngle);

		//context.restore();
	}	

	function drawLight(O,radius)
	{
		if (typeof(radius) === "undefined")
			radius = 0.08;

		drawStar(O,7,radius,0.5, "#FFC000", 1.0, 0, "rgba(255,255,0,0.8)")
	}
	
	function clear(color)
	{
		if (color == undefined)
		{
			color = "rgba(255,255,255,1)";
		}

		context.clearRect(0,0,canvasW,canvasH);
		context.fillStyle = color;
		context.fillRect(0,0,canvasW,canvasH);
	}
	
	function measureText(text, font)
	{
		if (font == undefined)
		{
			font = "16px 'Open Sans'";
		}

		context.font = font;

		var p = { 
					x: context.measureText(text).width,
					y: context.measureText("M").width
				}
		
		return p;
	}
	
	this.getContext		= getContext;

	this.clear 			= clear;
	this.drawText 		= drawText;
	this.drawArrow 		= drawArrow;
	this.drawLine		= drawLine;
	this.drawBezierCurve= drawBezierCurve;
	this.drawLines		= drawLines;
	this.drawLineStrip	= drawLineStrip;
	this.drawCross 		= drawCross;
	this.drawRectangle	= drawRectangle;
		
	this.drawHemisphere = drawHemisphere;
	this.drawArc		= drawArc;
	this.drawBRDFGraph 	= drawBRDFGraph;
	this.drawLight 		= drawLight;
	this.drawImage		= drawImage;
	this.drawStar 		= drawStar;
	this.measureText	= measureText;
}
